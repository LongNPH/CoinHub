import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { useCoins }  from '../hooks/useCoin'
import { get }       from '../utils/api'
import { CHART_COLORS, DEFAULT_COLOR } from '../utils/constants'

Chart.register(...registerables)

export default function AllCoinChart() {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)
  const { coins, loading } = useCoins()

  useEffect(() => {
    if (loading || coins.length === 0) return

    const fetchAndRender = async () => {
      const results = await get('/api/coins/history/all')

      const first  = results.find(r => r.history.length > 0)
      if (!first) return

      const labels = first.history.map(formatChartLabel)

      const datasets = results.map(({ symbol, history }) => ({
        label:           symbol,
        data:            history.map(h => Number(h.price)),
        borderColor:     CHART_COLORS[symbol] ?? DEFAULT_COLOR,
        backgroundColor: 'transparent',
        borderWidth:     1.4,
        pointRadius:     0,
        tension:         0.4,
      }))

      if (!chartRef.current) {
        chartRef.current = new Chart(canvasRef.current, {
          type: 'line',
          data: { labels, datasets },
          options: {
            responsive:          true,
            maintainAspectRatio: false,
            animation:           false,
            plugins: {
              legend: { display: false },
              tooltip: {
                mode:            'index',
                intersect:       false,
                backgroundColor: 'rgba(255,255,255,0.95)',
                borderColor:     'rgba(0,0,0,0.2)',
                borderWidth:     1,
                titleColor:      '#000',
                bodyColor:       '#333',
                callbacks: {
                  label: ctx =>
                    `${ctx.dataset.label}: $${Number(ctx.raw).toLocaleString('en', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`,
                },
              },
            },
            scales: {
              x: {
                grid:   { color: 'rgba(0,0,0,0.05)' },
                ticks:  { color: '#000', font: { size: 9 }, maxTicksLimit: 7 },
                border: { display: false },
              },
              y: {
                grid:   { color: 'rgba(0,0,0,0.05)' },
                ticks:  {
                  color: '#000',
                  font:  { size: 9 },
                  callback: v => '$' + Number(v).toLocaleString('en'),
                },
                border: { display: false },
              },
            },
          },
        })
      } else {
        chartRef.current.data.labels = labels
        chartRef.current.data.datasets = datasets
        chartRef.current.update('none') 
      }
    }

    fetchAndRender()

    return () => chartRef.current?.destroy()
  }, [coins, loading])

  useEffect(() => {
    if (coins.length === 0) return

    const interval = setInterval(async () => {
      const results = await get('/api/coins/history/all')

      const first  = results.find(r => r.history.length > 0)
      if (!first || !chartRef.current) return

      const newLabels = first.history.map(formatChartLabel)

      const newDatasets = results.map(({ symbol, history }) => ({
        label:           symbol,
        data:            history.map(h => Number(h.price)),
        borderColor:     CHART_COLORS[symbol] ?? DEFAULT_COLOR,
        backgroundColor: 'transparent',
        borderWidth:     1.4,
        pointRadius:     0,
        tension:         0.4,
      }))

      chartRef.current.data.labels = newLabels
      chartRef.current.data.datasets = newDatasets
      chartRef.current.update('none')
    }, 30 * 1000)

    return () => clearInterval(interval)
  }, [coins])

  if (loading) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        fontSize: 12,
      }}>
        Đang tải biểu đồ...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: 12 }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        paddingRight: 12,
        borderRight: '1px solid rgba(0,0,0,0.1)',
        overflowY: 'auto',
        paddingY: 4,
      }}>
        {coins.map(coin => (
          <div key={coin.symbol} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: 'rgba(0,0,0,0.7)',
            whiteSpace: 'nowrap',
          }}>
            <span style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: CHART_COLORS[coin.symbol] ?? DEFAULT_COLOR,
              flexShrink: 0,
            }} />
            <span>{coin.symbol}</span>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>
    </div>
  )
}

function formatChartLabel(point) {
  if (point.isCurrent) return 'Hiện tại'
  const d = new Date(point.recorded_at)
  return d.getHours() + ':00'
}
