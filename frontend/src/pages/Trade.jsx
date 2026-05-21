import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import { useCoins }            from '../hooks/useCoin'
import { usePrices }           from '../hooks/usePrices'
import { useCoinsStats }       from '../hooks/useCoinsStats'
import { useWatchlist }        from '../hooks/useWatchlist'
import { useAuth }             from '../hooks/useAuth'
import { get }                 from '../utils/api'
import OrderBook               from '../components/OrderBook'
import RecentTrades            from '../components/RecentTrades'
import WatchModal              from '../components/WatchModal'
import { Chart, registerables } from 'chart.js'
import { useRef } from 'react'
import { CHART_COLORS, DEFAULT_COLOR } from '../utils/constants'
import { formatPrice, formatPercent } from '../utils/formatters'

Chart.register(...registerables)

// ── Mini chart cho coin đang xem ─────────────────────────
function CoinChart({ symbol }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  useEffect(() => {
    if (!symbol) return

    get(`/api/coins/${symbol}/history`)
      .then(history => {
        const labels = history.map(h => {
          const d = new Date(h.recorded_at)
          return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0')
        })
        const data = history.map(h => Number(h.price))

        chartRef.current?.destroy()

        chartRef.current = new Chart(canvasRef.current, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              data,
              borderColor:     CHART_COLORS[symbol] ?? DEFAULT_COLOR,
              backgroundColor: 'transparent',
              borderWidth:     1.5,
              pointRadius:     0,
              tension:         0.4,
            }],
          },
          options: {
            responsive:          true,
            maintainAspectRatio: false,
            animation:           false,
            plugins: {
              legend: { display: false },
              tooltip: {
                mode:            'index',
                intersect:       false,
                backgroundColor: 'rgba(10,10,10,0.95)',
                borderColor:     'rgba(255,255,255,0.08)',
                borderWidth:     1,
                titleColor:      '#555',
                bodyColor:       '#aaa',
                callbacks: {
                  label: ctx => `$${Number(ctx.raw).toLocaleString('en', {
                    minimumFractionDigits: 2, maximumFractionDigits: 2,
                  })}`,
                },
              },
            },
            scales: {
              x: {
                grid:   { color: 'rgba(255,255,255,0.03)' },
                ticks:  { color: '#2a2a2a', font: { size: 9 }, maxTicksLimit: 6 },
                border: { display: false },
              },
              y: {
                position: 'right',
                grid:     { color: 'rgba(255,255,255,0.03)' },
                ticks: {
                  color: '#2a2a2a',
                  font:  { size: 9 },
                  callback: v => '$' + Number(v).toLocaleString('en'),
                },
                border: { display: false },
              },
            },
          },
        })
      })
      .catch(() => {})

    return () => chartRef.current?.destroy()
  }, [symbol])

  return (
    <div style={{ height: 160, position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────
const card = {
  background:   'rgba(12,12,12,0.96)',
  border:       '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  overflow:     'hidden',
}

const cardHd = {
  padding:      '9px 13px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  fontSize:     11,
  color:        'rgba(255,255,255,0.48)',
  display:      'flex',
  alignItems:   'center',
  gap:          6,
}

function LiveDot() {
  return (
    <span style={{
      width: 5, height: 5, borderRadius: '50%',
      background: '#00ff88', display: 'inline-block',
    }} />
  )
}
export default function Trade() {
  const navigate                    = useNavigate()
  const { user }                    = useAuth()
  const { coins, loading: coinsLoading } = useCoins()
  const prices                      = usePrices()
  const { prices: statsPrices }     = useCoinsStats()
  const { isWatching, upsertWatch, removeWatch, getWatch } = useWatchlist()

  const [selected,  setSelected]  = useState(null)
  const [search,    setSearch]    = useState('')
  const [balance,   setBalance]   = useState(null)
  const [modal,     setModal]     = useState(null)
  const [tradeNotice, setTradeNotice] = useState(null)
  useEffect(() => {
    if (coins.length > 0 && !selected) {
      setSelected(coins[0])
    }
  }, [coins])


  useEffect(() => {
    if (!user) return
    get('/api/trade/balance')
      .then(data => setBalance(data))
      .catch(() => {})
  }, [user])

  function refreshBalance() {
    if (!user) return
    get('/api/trade/balance')
      .then(data => setBalance(data))
      .catch(() => {})
  }

  function handleTradeSuccess(result) {
    refreshBalance()
    if (!result) return

    const isBuy = result.mode === 'buy'
    setTradeNotice({
      type: isBuy ? 'buy' : 'sell',
      title: `${isBuy ? 'Mua' : 'Bán'} ${result.symbol} thành công`,
      text: `${Number(result.quantity).toFixed(6)} ${result.symbol} đã được ${isBuy ? 'thêm vào ví' : 'bán khỏi ví'} của bạn.`,
    })

    setTimeout(() => setTradeNotice(null), 3500)
  }

  const filteredCoins = coins.filter(c =>
    c.symbol.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  function getDisplayPrice(symbol) {
    const livePrice = prices[symbol]
    const statsPrice = statsPrices[symbol]
    if (!livePrice && !statsPrice) return null

    return {
      ...statsPrice,
      ...livePrice,
      change24h: livePrice?.change24h ?? statsPrice?.change24h ?? 0,
      high24h: livePrice?.high24h ?? statsPrice?.high24h,
      low24h: livePrice?.low24h ?? statsPrice?.low24h,
    }
  }

  const currentPrice = selected ? getDisplayPrice(selected.symbol) : null

  function openTrade(tab) {
    if (!user) { navigate('/login'); return }
    setModal({ mode: 'trade', tab })
  }

  function openWatch() {
    if (!user) { navigate('/login'); return }
    setModal({ mode: 'watch' })
  }

  async function handleWatchToggle() {
    if (!user) { navigate('/login'); return }
    if (!selected) return
    if (isWatching(selected.symbol)) {
      await removeWatch(selected.symbol)
    } else {
      openWatch()
    }
  }

  async function handleWatchSave(buyAlert, sellAlert) {
    await upsertWatch(selected.symbol, buyAlert, sellAlert)
  }

  return (
    <div style={{
      display:   'flex',
      height:    'calc(100vh - 92px)',  // trừ navbar + ticker
      gap:       10,
      padding:   '10px 20px',
      minHeight: 0,
    }}>
      {tradeNotice && (
        <div style={{
          position: 'fixed',
          top: 96,
          right: 32,
          zIndex: 1200,
          width: 360,
          minHeight: 86,
          padding: '16px 18px',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.18)',
          borderLeft: `5px solid ${tradeNotice.type === 'buy' ? '#00ff88' : '#ff4466'}`,
          background: '#181818',
          color: '#fff',
          boxShadow: '0 18px 46px rgba(0,0,0,0.58)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: tradeNotice.type === 'buy' ? 'rgba(0,255,136,0.16)' : 'rgba(255,68,102,0.16)',
            border: `1px solid ${tradeNotice.type === 'buy' ? 'rgba(0,255,136,0.48)' : 'rgba(255,68,102,0.48)'}`,
            color: tradeNotice.type === 'buy' ? '#00ff88' : '#ff4466',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 900,
            flexShrink: 0,
          }}>
            ✓
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <div style={{
              fontSize: 17,
              fontWeight: 800,
              lineHeight: 1.2,
              color: '#fff',
            }}>
              {tradeNotice.title}
            </div>
            <div style={{
              fontSize: 13,
              lineHeight: 1.45,
              color: 'rgba(255,255,255,0.68)',
            }}>
              {tradeNotice.text}
            </div>
          </div>
        </div>
      )}

      {/* LEFT — danh sách coin */}
      <div style={{
        ...card,
        width:         330,
        flexShrink:    0,
        display:       'flex',
        flexDirection: 'column',
      }}>
        <div style={cardHd}><LiveDot /> Thị trường</div>

        {/* Search */}
        <div style={{ padding: '9px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <input
            type="text"
            placeholder="Tìm coin..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width:        '100%',
              padding:      '7px 10px',
              background:   'rgba(255,255,255,0.06)',
              border:       '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              fontSize:     12,
              color:        '#fff',
              outline:      'none',
            }}
          />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {coinsLoading ? (
            <div style={{ padding: 16, textAlign: 'center',
                          fontSize: 11, color: '#222' }}>
              Đang tải...
            </div>
          ) : (
            filteredCoins.map(coin => {
              const p      = getDisplayPrice(coin.symbol)
              const isUp   = (p?.change24h ?? 0) >= 0
              const isSel  = selected?.symbol === coin.symbol

              return (
                <div
                  key={coin.symbol}
                  onClick={() => setSelected(coin)}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    padding:      '9px 12px',
                    gap:          10,
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    cursor:       'pointer',
                    background:   isSel
                      ? 'rgba(255,255,255,0.075)'
                      : 'transparent',
                    borderLeft: isSel
                      ? '2px solid #00ff88'
                      : '2px solid transparent',
                  }}
                >
                  {coin.logo_url ? (
                    <img src={coin.logo_url} alt={coin.symbol}
                         style={{ width: 28, height: 28,
                                  borderRadius: '50%', flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 8,
                      color: 'rgba(255,255,255,0.3)', flexShrink: 0,
                    }}>
                      {coin.symbol.slice(0, 3)}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700,
                                  color: isSel ? '#fff' : 'rgba(255,255,255,0.72)',
                                  overflow: 'hidden', textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap' }}>
                      {coin.symbol}
                    </div>
                    <div style={{ fontSize: 11,
                                  color: isSel ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.26)' }}>
                      {coin.name}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600,
                                  color: isSel ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.42)' }}>
                      {p ? formatPrice(p.ask) : '—'}
                    </div>
                    <div style={{ fontSize: 11,
                                  color: isUp ? '#00ff88' : '#ff4466' }}>
                      {p ? formatPercent(p.change24h) : '—'}
                    </div>
                  </div>

                  {/* Star */}
                  <span
                    onClick={e => { e.stopPropagation(); handleWatchToggle() }}
                    style={{
                      fontSize:   15,
                      cursor:     'pointer',
                      color:      isWatching(coin.symbol) ? '#ffaa00' : 'rgba(255,255,255,0.14)',
                      flexShrink: 0,
                    }}
                  >
                    {isWatching(coin.symbol) ? '★' : '☆'}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* RIGHT — chi tiết */}
      {selected ? (
        <div style={{
          flex:          1,
          display:       'flex',
          flexDirection: 'column',
          gap:           10,
          minWidth:      0,
          overflow:      'hidden',
        }}>

          {/* Header coin */}
          <div style={{
            ...card,
            padding: '14px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {selected.logo_url ? (
                <img src={selected.logo_url} alt={selected.symbol}
                     style={{ width: 38, height: 38, borderRadius: '50%' }} />
              ) : (
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 11,
                  color: 'rgba(255,255,255,0.3)',
                }}>
                  {selected.symbol}
                </div>
              )}

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                    {selected.name}
                  </span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                    {selected.symbol}/USD
                  </span>
                  <span
                    onClick={handleWatchToggle}
                    style={{
                      fontSize: 16,
                      cursor:   'pointer',
                      color:    isWatching(selected.symbol) ? '#ffaa00' : '#333',
                    }}
                  >
                    {isWatching(selected.symbol) ? '★' : '☆'}
                  </span>
                </div>
              </div>

              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 500, color: '#fff' }}>
                    {currentPrice ? formatPrice(currentPrice.ask) : '—'}
                  </span>
                  <span style={{
                    fontSize: 13,
                    color: (currentPrice?.change24h ?? 0) >= 0 ? '#00ff88' : '#ff4466',
                  }}>
                    {currentPrice ? formatPercent(currentPrice.change24h) : '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 14, fontSize: 11,
                              color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>
                  <span>Cao: <b style={{ color: '#555' }}>
                    {currentPrice?.high24h ? formatPrice(currentPrice.high24h) : '—'}
                  </b></span>
                  <span>Thấp: <b style={{ color: '#555' }}>
                    {currentPrice?.low24h ? formatPrice(currentPrice.low24h) : '—'}
                  </b></span>
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div style={{ ...card, padding: '12px 14px' }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8,
                          fontSize: 11 }}>
              {['1D','1H','4H','1W'].map((t, i) => (
                <span key={t} style={{
                  color:  i === 0 ? '#00ff88' : 'rgba(255,255,255,0.25)',
                  cursor: 'pointer', fontWeight: i === 0 ? 500 : 400,
                }}>
                  {t}
                </span>
              ))}
            </div>
            <CoinChart symbol={selected.symbol} />
          </div>

          {/* Order book + Trades cạnh nhau */}
          <div style={{
            display:             'grid',
            gridTemplateColumns: '1fr 1fr',
            gap:                 10,
            flex:                1,
            minHeight:           0,
          }}>
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={cardHd}><LiveDot /> Sổ lệnh</div>
              <OrderBook symbol={selected.symbol} />
            </div>

            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={cardHd}><LiveDot /> Giao dịch gần đây</div>
              <RecentTrades symbol={selected.symbol} />
            </div>
          </div>

          {/* Nút Mua / Bán */}
          <div style={{
            display:   'flex',
            gap:       10,
            flexShrink: 0,
          }}>
            <button
              onClick={() => openTrade('buy')}
              style={{
                flex:         1,
                padding:      '12px',
                borderRadius: 9,
                border:       'none',
                background:   '#00ff88',
                color:        '#000',
                fontSize:     14,
                fontWeight:   500,
                cursor:       'pointer',
              }}
            >
              Mua {selected.symbol}
            </button>

            <button
              onClick={() => openWatch()}
              style={{
                padding:      '12px 16px',
                borderRadius: 9,
                border:       '1px solid rgba(255,255,255,0.1)',
                background:   'transparent',
                color:        'rgba(255,255,255,0.4)',
                fontSize:     14,
                cursor:       'pointer',
              }}
            >
              ☆ Theo dõi
            </button>

            <button
              onClick={() => openTrade('sell')}
              style={{
                flex:         1,
                padding:      '12px',
                borderRadius: 9,
                border:       'none',
                background:   '#ff4466',
                color:        '#fff',
                fontSize:     14,
                fontWeight:   500,
                cursor:       'pointer',
              }}
            >
              Bán {selected.symbol}
            </button>
          </div>

        </div>
      ) : (
        <div style={{
          flex:           1,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          color:          '#222',
          fontSize:       13,
        }}>
          Chọn một coin để xem chi tiết
        </div>
      )}

      {/* Modal */}
      {modal && selected && (
        <WatchModal
          coin={selected}
          price={currentPrice}
          balance={balance}
          mode={modal.mode}
          initialTab={modal.tab}
          currentWatch={getWatch(selected.symbol)}
          onClose={() => setModal(null)}
          onWatchSave={handleWatchSave}
          onTradeSuccess={handleTradeSuccess}
        />
      )}

    </div>
  )
}
