import { useOrderBook } from '../hooks/useOrderBook'

export default function OrderBook({ symbol }) {
  const { bids, asks } = useOrderBook(symbol)

  const maxQty = Math.max(
    ...bids.map(b => Number(b.qty)),
    ...asks.map(a => Number(a.qty)),
    0.001
  )

  const spread = asks[0] && bids[0]
    ? (asks[0].price - bids[0].price).toFixed(2)
    : '—'

  return (
    <div>
      {/* Header */}
      <div style={{
        display:      'grid',
        gridTemplateColumns: '1fr 90px 1fr',
        padding:      '5px 12px',
        fontSize:     10,
        color:        'rgba(255,255,255,0.25)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span style={{ color: '#00ff88' }}>KL Mua</span>
        <span style={{ textAlign: 'center' }}>Giá (USD)</span>
        <span style={{ textAlign: 'right', color: '#ff4466' }}>KL Bán</span>
      </div>

      {/* Rows */}
      {Array.from({ length: Math.min(bids.length, asks.length, 8) }, (_, i) => {
        const bid   = bids[i]
        const ask   = asks[i]
        const bPct  = bid ? (Number(bid.qty) / maxQty * 45).toFixed(1) : 0
        const aPct  = ask ? (Number(ask.qty) / maxQty * 45).toFixed(1) : 0

        return (
          <div key={i} style={{
            display:  'grid',
            gridTemplateColumns: '1fr 90px 1fr',
            padding:  '3px 12px',
            fontSize: 11,
            fontFamily: 'monospace',
            position: 'relative',
          }}>
            {/* Bar mua */}
            <div style={{
              position:   'absolute',
              right:      '50%',
              top:        0,
              height:     '100%',
              width:      `${bPct}%`,
              background: 'rgba(0,255,136,0.07)',
            }} />
            {/* Bar bán */}
            <div style={{
              position:   'absolute',
              left:       '50%',
              top:        0,
              height:     '100%',
              width:      `${aPct}%`,
              background: 'rgba(255,68,102,0.07)',
            }} />

            <span style={{ position: 'relative', color: '#00ff88' }}>
              {bid ? bid.qty : '—'}
            </span>
            <span style={{
              position:  'relative',
              textAlign: 'center',
              fontWeight: 500,
              color:     'rgba(255,255,255,0.7)',
            }}>
              {ask
                ? '$' + Number(ask.price).toLocaleString('en', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : '—'
              }
            </span>
            <span style={{
              position:  'relative',
              textAlign: 'right',
              color:     '#ff4466',
            }}>
              {ask ? ask.qty : '—'}
            </span>
          </div>
        )
      })}

      {/* Spread */}
      <div style={{
        textAlign:    'center',
        fontSize:     10,
        color:        'rgba(255,255,255,0.2)',
        padding:      '4px',
        borderTop:    '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background:   'rgba(255,255,255,0.02)',
      }}>
        Spread: ${spread}
      </div>
    </div>
  )
}