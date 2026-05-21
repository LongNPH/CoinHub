import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { SLA_THRESHOLD } from '../utils/constants'

Chart.register(...registerables)

const slaLinePlugin = {
  id: 'slaLine',
  afterDraw(chart) {
    const { ctx, chartArea, scales } = chart
    if (!chartArea) return

    const y = scales.y.getPixelForValue(SLA_THRESHOLD)
    if (y < chartArea.top || y > chartArea.bottom) return

    ctx.save()
    ctx.beginPath()
    ctx.setLineDash([6, 4])
    ctx.strokeStyle = 'rgba(255,68,102,0.5)'
    ctx.lineWidth   = 1
    ctx.moveTo(chartArea.left, y)
    ctx.lineTo(chartArea.right, y)
    ctx.stroke()

    ctx.fillStyle = 'rgba(255,68,102,0.6)'
    ctx.font      = '10px monospace'
    ctx.fillText('SLA 1000ms', chartArea.right - 70, y - 4)
    ctx.restore()
  },
}

export default function LatencyChart({ history }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return

    chartRef.current?.destroy()
    const maxValue = Math.max(
      ...history.flatMap(h => [h.p50, h.p95, h.p99].map(Number)),
      0
    )
    const suggestedMax = maxValue >= SLA_THRESHOLD
      ? Math.ceil(maxValue * 1.15)
      : Math.max(20, Math.ceil(maxValue * 1.6))
    const showPoints = history.length < 3

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      plugins: [slaLinePlugin],
      data: {
        labels:   history.map(h => h.time),
        datasets: [
          {
            label:           'p50',
            data:            history.map(h => h.p50),
            borderColor:     '#00ff88',
            backgroundColor: 'transparent',
            borderWidth:     2,
            pointRadius:     showPoints ? 3 : 1,
            pointHoverRadius: 4,
            tension:         0.32,
          },
          {
            label:           'p95',
            data:            history.map(h => h.p95),
            borderColor:     '#ffaa00',
            backgroundColor: 'transparent',
            borderWidth:     2,
            pointRadius:     showPoints ? 3 : 1,
            pointHoverRadius: 4,
            tension:         0.32,
          },
          {
            label:           'p99',
            data:            history.map(h => h.p99),
            borderColor:     '#ff4466',
            backgroundColor: 'transparent',
            borderWidth:     2,
            pointRadius:     showPoints ? 3 : 1,
            pointHoverRadius: 4,
            tension:         0.32,
          },
        ],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        animation:           false,
        interaction: {
          mode:      'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display:  true,
            position: 'top',
            labels: {
              color:     'rgba(255,255,255,0.62)',
              font:      { size: 11 },
              boxWidth:  20,
              boxHeight: 2,
              padding:   12,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(10,10,10,0.95)',
            borderColor:     'rgba(255,255,255,0.08)',
            borderWidth:     1,
            titleColor:      'rgba(255,255,255,0.4)',
            bodyColor:       '#ccc',
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${ctx.raw}ms`,
            },
          },
        },
        scales: {
          x: {
            grid:   { color: 'rgba(255,255,255,0.06)' },
            ticks:  {
              color:        'rgba(255,255,255,0.42)',
              font:         { size: 9 },
              maxTicksLimit: 10,
            },
            border: { display: false },
          },
          y: {
            grid:   { color: 'rgba(255,255,255,0.06)' },
            ticks:  {
              color: 'rgba(255,255,255,0.42)',
              font:  { size: 9 },
              callback: v => `${v}ms`,
            },
            border:      { display: false },
            suggestedMin: 0,
            suggestedMax,
          },
        },
      },
    })

    return () => chartRef.current?.destroy()
  }, [history])

  return (
    <div style={{ height: 260, position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
