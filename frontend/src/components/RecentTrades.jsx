import { useTrades }    from '../hooks/useTrades'
import { formatTime }   from '../utils/formatters'

export default function RecentTrades({ symbol }) {
  const trades = useTrades(symbol)

  return (
    <div>
      {/* Header */}
      <div style={{
        display:      'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        padding:      '5px 12px',
        fontSize:     10,
        color:        'rgba(255,255,255,0.25)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span>Thời gian</span>
        <span style={{ textAlign: 'center' }}>Giá (USD)</span>
        <span style={{ textAlign: 'right' }}>Khối lượng</span>
      </div>

      {trades.length === 0 ? (
        <div style={{
          padding:   '16px',
          textAlign: 'center',
          fontSize:  12,
          color:     'rgba(255,255,255,0.15)',
        }}>
          Đang chờ dữ liệu...
        </div>
      ) : (
        trades.map(trade => (
          <div key={trade.id} style={{
            display:      'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            padding:      '3px 12px',
            fontSize:     11,
            borderBottom: '1px solid rgba(255,255,255,0.03)',
            fontFamily:   'monospace',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>
              {formatTime(trade.time)}
            </span>
            <span style={{
              textAlign: 'center',
              fontWeight: 500,
              color: trade.isBuy ? '#00ff88' : '#ff4466',
            }}>
              ${Number(trade.price).toLocaleString('en', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span style={{
              textAlign: 'right',
              color:     'rgba(255,255,255,0.5)',
            }}>
              {trade.qty}
            </span>
          </div>
        ))
      )}
    </div>
  )
}
