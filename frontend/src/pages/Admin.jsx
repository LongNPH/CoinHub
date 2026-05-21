import { useState, useEffect, useContext, useCallback } from 'react'
import { SocketContext }     from '../context/SocketContext'
import { get }               from '../utils/api'
import { SLA_THRESHOLD }     from '../utils/constants'
import LatencyChart          from '../components/LatencyChart'
import LatencyHistogram      from '../components/LatencyHistogram'

const card = {
  background:   'rgba(13,15,15,0.96)',
  border:       '1px solid rgba(255,255,255,0.11)',
  borderRadius: 10,
  overflow:     'hidden',
}

const cardHd = {
  padding:      '12px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
  background:   'rgba(255,255,255,0.015)',
  fontSize:     12,
  fontWeight:   500,
  color:        'rgba(255,255,255,0.62)',
  display:      'flex',
  alignItems:   'center',
  gap:          6,
}

function LiveDot() {
  return (
    <span style={{
      width: 6, height: 6, borderRadius: '50%',
      background: '#00ff88', display: 'inline-block',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  )
}

function KpiCard({ label, value, sub, color, highlight }) {
  const isOk   = highlight === 'ok'
  const isWarn = highlight === 'warn'
  const isBad  = highlight === 'bad'

  return (
    <div style={{
      ...card,
      padding:     '16px 18px',
      borderColor: isOk
        ? 'rgba(0,255,136,0.22)'
        : isBad
          ? 'rgba(255,68,102,0.22)'
          : 'rgba(255,255,255,0.11)',
    }}>
      <div style={{
        fontSize:     11,
        color:        'rgba(255,255,255,0.52)',
        marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontSize:   25,
        fontWeight: 600,
        color:      color || (isOk
          ? '#00ff88'
          : isBad
            ? '#ff4466'
            : isWarn
              ? '#ffaa00'
              : '#fff'),
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontSize:  11,
          color:     'rgba(255,255,255,0.4)',
          marginTop: 6,
        }}>
          {sub}
        </div>
      )}
    </div>
  )
}


function WsTable({ topWatched, wsConnections }) {
  return (
    <div style={{ ...card }}>
      <div style={cardHd}>
        <LiveDot /> Thống kê kết nối
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          marginBottom:   14,
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.48)',
                          marginBottom: 4 }}>
              WebSocket connections
            </div>
            <div style={{ fontSize: 30, fontWeight: 600, color: '#fff' }}>
              {wsConnections}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.48)',
                          marginBottom: 4 }}>
              Tối đa hỗ trợ
            </div>
            <div style={{ fontSize: 22, fontWeight: 600,
                          color: 'rgba(255,255,255,0.65)' }}>
              100
            </div>
          </div>
        </div>

        {/* Progress bar tỉ lệ connection */}
        <div style={{
          height:       6,
          background:   'rgba(255,255,255,0.06)',
          borderRadius: 3,
          overflow:     'hidden',
          marginBottom: 16,
        }}>
          <div style={{
            height:       '100%',
            borderRadius: 3,
            width:        `${Math.min((wsConnections / 100) * 100, 100)}%`,
            background:   wsConnections > 80
              ? '#ff4466'
              : wsConnections > 60
                ? '#ffaa00'
                : '#00ff88',
            transition:   'width .5s ease',
          }} />
        </div>

        {/* Top watched coins */}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)',
                      marginBottom: 8 }}>
          Top coin được theo dõi
        </div>
        {topWatched?.map((w, i) => (
          <div key={w.symbol} style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '5px 0',
            borderBottom:   '1px solid rgba(255,255,255,0.03)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)',
                             minWidth: 14 }}>
                {i + 1}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.82)',
                             fontWeight: 500 }}>
                {w.symbol}
              </span>
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.52)' }}>
              {Number(w.count).toLocaleString()} người
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SystemStats({ stats }) {
  if (!stats) return null
  return (
    <div style={{ ...card }}>
      <div style={cardHd}>Thống kê hệ thống</div>
      <div style={{ padding: '0' }}>
        {[
          ['Người dùng đã đăng ký', stats.users?.total?.toLocaleString()],
          ['Giao dịch hôm nay',     stats.transactions?.today?.toLocaleString()],
          ['Tổng giao dịch',        stats.transactions?.total?.toLocaleString()],
          ['Alert email hôm nay',   stats.alerts?.today?.toLocaleString()],
          ['Tổng alert đã gửi',     stats.alerts?.total?.toLocaleString()],
        ].map(([label, value]) => (
          <div key={label} style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            padding:        '11px 16px',
            borderBottom:   '1px solid rgba(255,255,255,0.05)',
            fontSize:       12,
          }}>
            <span style={{ color: 'rgba(255,255,255,0.52)' }}>{label}</span>
            <span style={{ color: 'rgba(255,255,255,0.92)', fontWeight: 600 }}>
              {value ?? '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}


const MAX_HISTORY = 60

function formatTime(ts = Date.now()) {
  const d = new Date(ts)
  return d.getHours() + ':' +
    String(d.getMinutes()).padStart(2, '0') + ':' +
    String(d.getSeconds()).padStart(2, '0')
}

function toHistoryPoint(data) {
  return {
    time: formatTime(),
    p50:  data.p50,
    p95:  data.p95,
    p99:  data.p99,
    avg:  data.avg,
  }
}

export default function Admin() {
  const socket = useContext(SocketContext)

  const [stats,    setStats]    = useState(null)
  const [latency,  setLatency]  = useState(null)
  const [history,  setHistory]  = useState([])  // cho LatencyChart
  const [loading,  setLoading]  = useState(true)


  const fetchStats = useCallback(async () => {
    try {
      const data = await get('/api/admin/stats')
      setStats(data)
      if (data.latency) {
        setLatency(data.latency)
        setHistory(prev => prev.length ? prev : [toHistoryPoint(data.latency)])
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()

    const timer = setInterval(fetchStats, 30000)
    return () => clearInterval(timer)
  }, [fetchStats])


  useEffect(() => {
    if (!socket) return

    function onLatencyStats(data) {
      setLatency(data)

      setHistory(prev => {
        const next = [...prev, toHistoryPoint(data)]
        return next.slice(-MAX_HISTORY)
      })

      if (data.wsConnections !== undefined) {
        setStats(prev => prev
          ? { ...prev, wsConnections: data.wsConnections }
          : prev
        )
      }
    }

    socket.on('latency_stats', onLatencyStats)
    return () => socket.off('latency_stats', onLatencyStats)
  }, [socket])

  // Xác định trạng thái SLA
  function getLatencyHighlight(value, thresholds = { ok: 300, warn: 700 }) {
    if (!value) return ''
    if (value < thresholds.ok)   return 'ok'
    if (value < thresholds.warn) return 'warn'
    return 'bad'
  }

  const slaPct      = latency?.slaPct ?? 0
  const slaHighlight = slaPct >= 95 ? 'ok' : slaPct >= 80 ? 'warn' : 'bad'

  return (
    <div style={{
      padding:       '20px 24px',
      display:       'flex',
      flexDirection: 'column',
      gap:           14,
      background:    '#000',
      minHeight:     'calc(100vh - 92px)',
    }}>

      {/* Tiêu đề */}
      <div style={{ display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between' }}>
        <div style={{ fontSize: 22, fontWeight: 650, color: '#fff' }}>
          Trang hiệu năng
        </div>
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          6,
          fontSize:     11,
          color:        'rgba(255,255,255,0.68)',
          background:   'rgba(0,255,136,0.06)',
          border:       '1px solid rgba(0,255,136,0.16)',
          borderRadius: 8,
          padding:      '7px 12px',
        }}>
          <LiveDot />
          {loading ? 'Đang tải...' : 'Đang theo dõi'}
        </div>
      </div>

      {/* KPI latency */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap:                 12,
      }}>
        <KpiCard
          label="Latency trung bình"
          value={latency ? `${latency.avg}ms` : '—'}
          sub="Tất cả clients"
          highlight={getLatencyHighlight(latency?.avg)}
        />
        <KpiCard
          label="P50 latency"
          value={latency ? `${latency.p50}ms` : '—'}
          sub="50% requests"
          highlight={getLatencyHighlight(latency?.p50)}
        />
        <KpiCard
          label="P95 latency"
          value={latency ? `${latency.p95}ms` : '—'}
          sub="95% requests"
          highlight={getLatencyHighlight(latency?.p95, { ok: 500, warn: 900 })}
        />
        <KpiCard
          label="P99 latency"
          value={latency ? `${latency.p99}ms` : '—'}
          sub="99% requests"
          highlight={getLatencyHighlight(latency?.p99, { ok: 800, warn: 1100 })}
        />
        <KpiCard
          label="Đạt SLA < 1000ms"
          value={latency ? `${slaPct}%` : '—'}
          sub={`Mục tiêu ≥ 95%`}
          highlight={slaHighlight}
        />
      </div>

      {/* Chart + Histogram */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'minmax(0, 2fr) minmax(340px, 1fr)',
        gap:                 12,
      }}>
        <div style={card}>
          <div style={cardHd}>
            <LiveDot />
            Latency theo thời gian — p50 / p95 / p99
          </div>
          <div style={{ padding: '14px 16px' }}>
            {history.length === 0 ? (
              <div style={{
                height:         220,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                color:          'rgba(255,255,255,0.4)',
                fontSize:       12,
              }}>
                Đang thu thập dữ liệu...
              </div>
            ) : (
              <LatencyChart history={history} />
            )}
          </div>
        </div>

        <div style={card}>
          <div style={cardHd}>Phân phối latency</div>
          <div style={{ padding: '14px 16px' }}>
            {latency?.distribution ? (
              <>
                <LatencyHistogram distribution={latency.distribution} />
                {/* Chi tiết bucket */}
                <div style={{ marginTop: 10 }}>
                  {latency.distribution.map(d => (
                    <div key={d.label} style={{
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'space-between',
                      padding:        '3px 0',
                      fontSize:       11,
                    }}>
                      <span style={{ color: 'rgba(255,255,255,0.52)',
                                     minWidth: 90 }}>
                        {d.label}
                      </span>
                      <div style={{ flex: 1, margin: '0 10px',
                                    height: 3, borderRadius: 2,
                                    background: 'rgba(255,255,255,0.05)',
                                    overflow: 'hidden' }}>
                        <div style={{
                          width:      `${d.pct}%`,
                          height:     '100%',
                          background: d.label.includes('>1000') ||
                                      d.label.includes('700-1000')
                            ? '#ff4466' : '#00ff88',
                          borderRadius: 2,
                        }} />
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.72)',
                                     minWidth: 35, textAlign: 'right' }}>
                        {d.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{
                height:         180,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                color:          'rgba(255,255,255,0.4)',
                fontSize:       12,
              }}>
                Đang thu thập dữ liệu...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap:                 12,
      }}>
        <WsTable
          topWatched={stats?.topWatched}
          wsConnections={stats?.wsConnections ?? 0}
        />
        <SystemStats stats={stats} />
      </div>

      {/* Latency min/max */}
      {latency && (
        <div style={{
          ...card,
          padding: '14px 16px',
          display: 'flex',
          gap:     24,
          flexWrap:'wrap',
        }}>
          {[
            ['Samples',         latency.count?.toLocaleString()],
            ['Min latency',     `${latency.min}ms`],
            ['Max latency',     `${latency.max}ms`],
            ['Đạt SLA (<1000ms)', `${latency.slaPass?.toLocaleString()} / ${latency.count?.toLocaleString()}`],
            ['Ngưỡng SLA',      `${SLA_THRESHOLD}ms`],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.46)',
                            marginBottom: 3 }}>
                {label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600,
                            color: 'rgba(255,255,255,0.86)' }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
