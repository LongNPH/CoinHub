import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

export default function LatencyHistogram({ distribution }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !distribution?.length) return

    chartRef.current?.destroy()

    const colors = distribution.map(d =>
      d.label.includes('>1000') || d.label.includes('700-1000')
        ? 'rgba(255,68,102,0.6)'
        : 'rgba(0,255,136,0.5)'
    )

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels:   distribution.map(d => d.label),
        datasets: [{
          data:            distribution.map(d => d.pct),
          backgroundColor: colors,
          borderRadius:    4,
          borderSkipped:   false,
        }],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        animation:           false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(10,10,10,0.95)',
            borderColor:     'rgba(255,255,255,0.08)',
            borderWidth:     1,
            titleColor:      'rgba(255,255,255,0.4)',
            bodyColor:       '#ccc',
            callbacks: {
              label: ctx => `${ctx.raw}% messages`,
            },
          },
        },
        scales: {
          x: {
            grid:   { display: false },
            ticks:  {
              color: 'rgba(255,255,255,0.42)',
              font:  { size: 9 },
            },
            border: { display: false },
          },
          y: {
            grid:   { color: 'rgba(255,255,255,0.06)' },
            ticks:  {
              color:    'rgba(255,255,255,0.42)',
              font:     { size: 9 },
              callback: v => `${v}%`,
            },
            border:      { display: false },
            suggestedMax: 100,
          },
        },
      },
    })

    return () => chartRef.current?.destroy()
  }, [distribution])

  return (
    <div style={{ height: 180, position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
