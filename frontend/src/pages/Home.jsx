import { useNavigate } from 'react-router-dom'
import AllCoinChart    from '../components/AllCoinChart'
import { useCoins }    from '../hooks/useCoin'
import { usePrices }   from '../hooks/usePrices'
import { useCoinsStats } from '../hooks/useCoinsStats'
import { useAuth }     from '../hooks/useAuth'
import { formatPrice, formatPercent } from '../utils/formatters'

const cardStyle = {
  background: 'rgba(12,12,12,0.98)',
  border:     '1px solid rgba(255,255,255,0.14)',
  borderRadius: 12,
  overflow:   'hidden',
  boxShadow:  '0 10px 24px rgba(0,0,0,0.32)',
}

const colHeaderStyle = {
  padding:      '9px 13px',
  borderBottom: '1px solid rgba(255,255,255,0.12)',
  background:   'rgba(255,255,255,0.035)',
  display:      'flex',
  alignItems:   'center',
  gap:          7,
}

function ColHeader({ icon, title, sub }) {
  return (
    <div style={colHeaderStyle}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 11, fontWeight: 500,
                      color: 'rgba(255,255,255,1)' }}>
          {title}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.72)' }}>
          {sub}
        </div>
      </div>
    </div>
  )
}

function CoinRow({ rank, coin, right }) {
  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      padding:      '7px 13px',
      gap:          8,
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      cursor:       'pointer',
      transition:   'background .1s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)',
                     minWidth: 14 }}>{rank}</span>

      {coin.logo_url ? (
        <img src={coin.logo_url} alt={coin.symbol}
             style={{ width: 22, height: 22, borderRadius: '50%',
                      flexShrink: 0 }} />
      ) : (
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center',
          fontSize: 8, color: 'rgba(255,255,255,1)',
          flexShrink: 0,
        }}>
          {coin.symbol.slice(0, 3)}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 500,
                      color: 'rgba(255,255,255,1)',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap' }}>
          {coin.name}
        </div>
        <div style={{ fontSize: 10,
                      color: 'rgba(255,255,255,0.68)' }}>
          {coin.symbol}
        </div>
      </div>

      {right}
    </div>
  )
}



function TopMoversCol({ coins, prices }) {
  const sorted = [...coins]
    .map(c => ({
      ...c,
      change24h: prices[c.symbol]?.change24h ?? 0,
    }))
    .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))
    .slice(0, 5)

  return (
    <div style={cardStyle}>
      <ColHeader title="Biến động mạnh" sub="Top 5 · 24h" />
      {sorted.map((c, i) => (
        <CoinRow
          key={c.symbol}
          rank={i + 1}
          coin={c}
          right={
            <span style={{
              fontSize: 12, fontWeight: 500,
              color: c.change24h >= 0 ? '#00ff88' : '#ff4466',
              flexShrink: 0,
            }}>
              {formatPercent(c.change24h)}
            </span>
          }
        />
      ))}
    </div>
  )
}

function MostWatchedCol({ coins }) {
  const sorted = [...coins]
    .sort((a, b) => (b.watchlist_count ?? 0) - (a.watchlist_count ?? 0))
    .slice(0, 5)

  return (
    <div style={cardStyle}>
      <ColHeader icon="👁" title="Theo dõi nhiều nhất" sub="Trên CoinHub" />
      {sorted.map((c, i) => (
        <CoinRow
          key={c.symbol}
          rank={i + 1}
          coin={c}
          right={
            <span style={{ fontSize: 11,
                           color: 'rgba(255,255,255,1)',
                           flexShrink: 0 }}>
              {(c.watchlist_count ?? 0).toLocaleString()} người
            </span>
          }
        />
      ))}
    </div>
  )
}

function TopPriceCol({ coins, prices }) {
  const sorted = [...coins]
    .map(c => ({ ...c, ask: prices[c.symbol]?.ask ?? 0 }))
    .sort((a, b) => b.ask - a.ask)
    .slice(0, 5)

  return (
    <div style={cardStyle}>
      <ColHeader title="Giá cao nhất" sub="Hiện tại · USD" />
      {sorted.map((c, i) => (
        <CoinRow
          key={c.symbol}
          rank={i + 1}
          coin={c}
          right={
            <span style={{ fontSize: 12, fontWeight: 500,
                           color: 'rgba(255,255,255,1)',
                           flexShrink: 0 }}>
              {c.ask > 0 ? formatPrice(c.ask) : '—'}
            </span>
          }
        />
      ))}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────

export default function Home() {
  const navigate          = useNavigate()
  const { user }          = useAuth()
  const { coins, loading} = useCoins()
  const prices            = usePrices()
  const { coins: statsCoins, prices: statsPrices } = useCoinsStats()
  const liveStatsPrices = {
    ...statsPrices,
    ...Object.fromEntries(
      Object.entries(prices).map(([symbol, price]) => ([
        symbol,
        {
          ...statsPrices[symbol],
          ...price,
          change24h: price.change24h ?? statsPrices[symbol]?.change24h ?? 0,
        },
      ]))
    ),
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      padding: '12px 24px',
      minHeight: 0,
    }}>

        {/* HERO */}
        <div style={{
          flex:         1,
          display:      'grid',
          gridTemplateColumns: '600px 1fr',
          border:       '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14,
          overflow:     'hidden',
          minHeight:    0,
        }}>
          {/* Trái */}
          <div style={{
            background:  '#050505',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            display:     'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding:     '0px 0px 70px 70px',
          }}>
            <h1 style={{
              fontSize:      50,
              fontWeight:    700,
              lineHeight:    1.2,
              letterSpacing: '-0.5px',
              color:         '#fff',
              marginBottom:  12,
              marginTop:     0,
            }}>
              Bắt đầu<br />
              <span style={{ color: '#00ff88' }}>hành trình làm giàu</span>
            </h1>

            <p style={{
              fontSize:     16,
              color:        'rgba(255,255,255,1)',
              lineHeight:   1.7,
              marginBottom: 24,
            }}>
              Theo dõi, giao dịch, cập nhật tin tức nóng hổi<br />
              và nhận cảnh báo giá tự động.
            </p>

            <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
              <button
                onClick={() => navigate(user ? '/trade' : '/login')}
                style={{
                  padding:    '12px 28px',
                  borderRadius: 10,
                  border:     'none',
                  background: '#fff',
                  color:      '#000',
                  fontSize:   16,
                  fontWeight: 600,
                  cursor:     'pointer',
                }}
              >
                Giao dịch ngay
              </button>
              <button 
                onClick={() => navigate('/news')}
                style={{
                  padding:    '12px 28px',
                  borderRadius: 10,
                  border:     '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color:      'rgba(255,255,255,0.9)',
                  fontSize:   16,
                  cursor:     'pointer',
                }}>
                Tìm hiểu thêm
              </button>
            </div>

            <div style={{ display: 'flex', gap: 60 }}>
              {[
                ['10', 'Loại coin'],
                ['1', 'Người online'],
                ['<1s', 'Cập nhật'],
              ].map(([val, lbl]) => (
                <div key={lbl}>
                  <div style={{ fontSize: 22, fontWeight: 600,
                                color: '#fff' }}>{val}</div>
                  <div style={{ fontSize: 14,
                                color: '#fff' }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Phải — chart + 3 cols */}
          <div style={{
            display:       'flex',
            flexDirection: 'column',
            minWidth:      0,
            minHeight:     0,
          }}>
            {/* Chart */}
            <div style={{
              background:    '#fff',
              display:       'flex',
              flexDirection: 'column',
              padding:       '14px 16px 10px',
              height:        350,
            }}>
              <div style={{
                fontSize:     10,
                color:        'rgba(0,0,0,0.5)',
                marginBottom: 8,
              }}>
                Biến động giá 24h — tất cả coin
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <AllCoinChart />
              </div>
            </div>

            {/* 3 COLS */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 10,
              padding: '6px 10px 2px 2px',
              background: 'transparent',
            }}>
              <TopMoversCol coins={statsCoins} prices={liveStatsPrices} />
              <MostWatchedCol coins={statsCoins} />
              <TopPriceCol coins={statsCoins} prices={liveStatsPrices} />
            </div>
          </div>
        </div>
    </div>
  )
}
