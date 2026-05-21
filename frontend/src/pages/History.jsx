import { useCallback, useEffect, useState } from 'react'
import { get } from '../utils/api'
import { useCoins } from '../hooks/useCoin'
import { formatDate, formatPrice, formatTime } from '../utils/formatters'

const LIMIT = 10

const card = {
  background: 'rgba(12,12,12,0.96)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  overflow: 'hidden',
}

const controlStyle = {
  padding: '8px 12px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: 8,
  color: '#ffffff',
  fontSize: 13,
  outline: 'none',
}

const INIT_FILTERS = {
  type: '',
  symbol: '',
  from: '',
  to: '',
  page: 1,
}

function KpiCard({ label, value, color }) {
  return (
      <div style={{ ...card, padding: '16px 18px' }}>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || '#fff' }}>
        {value}
      </div>
    </div>
  )
}

function TypeBadge({ type }) {
  const isBuy = type === 'buy'
  return (
    <span style={{
      padding: '3px 9px',
      borderRadius: 5,
      fontSize: 11,
      fontWeight: 700,
      background: isBuy ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,102,0.1)',
      color: isBuy ? '#00ff88' : '#ff4466',
    }}>
      {isBuy ? 'Mua' : 'Bán'}
    </span>
  )
}

function StatusBadge() {
  return (
    <span style={{
      padding: '3px 9px',
      borderRadius: 5,
      fontSize: 11,
      background: 'rgba(255,255,255,0.06)',
      color: 'rgba(255,255,255,0.5)',
    }}>
      Hoàn thành
    </span>
  )
}

function PageButton({ label, active, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 36,
        padding: '7px 12px',
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,0.1)',
        background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
        color: active ? '#fff' : disabled ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 13,
      }}
    >
      {label}
    </button>
  )
}

function Pagination({ page, total, limit, onChange }) {
  const pages = Math.max(1, Math.ceil(total / limit))
  if (pages <= 1) return null

  const items = []
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) {
      items.push(i)
    } else if (items[items.length - 1] !== '...') {
      items.push('...')
    }
  }

  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      <PageButton label="←" disabled={page === 1} onClick={() => onChange(page - 1)} />
      {items.map((item, index) => item === '...' ? (
        <span key={`dot-${index}`} style={{ padding: '0 4px', color: 'rgba(255,255,255,0.28)' }}>
          ...
        </span>
      ) : (
        <PageButton key={item} label={item} active={item === page} onClick={() => onChange(item)} />
      ))}
      <PageButton label="→" disabled={page === pages} onClick={() => onChange(page + 1)} />
    </div>
  )
}

function getSignedTotal(row) {
  const total = Number(row.total || 0)
  const fee = Number(row.fee || 0)
  return row.type === 'buy' ? total : total - fee
}

export default function History() {
  const { coins } = useCoins()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState(INIT_FILTERS)
  const [kpi, setKpi] = useState({
    totalBuy: 0,
    totalSell: 0,
    totalFee: 0,
    count: 0,
  })

  const fetchHistory = useCallback(async (nextFilters) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (nextFilters.type) params.set('type', nextFilters.type)
      if (nextFilters.symbol) params.set('symbol', nextFilters.symbol)
      if (nextFilters.from) params.set('from', nextFilters.from)
      if (nextFilters.to) params.set('to', nextFilters.to)
      params.set('page', nextFilters.page)
      params.set('limit', LIMIT)

      const data = await get(`/api/trade/history?${params}`)
      setRows(Array.isArray(data.rows) ? data.rows : [])
      setTotal(Number(data.total) || 0)
    } catch {
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchKpi = useCallback(async () => {
    try {
      const data = await get('/api/trade/history?page=1&limit=1000')
      const all = Array.isArray(data.rows) ? data.rows : []

      setKpi({
        totalBuy: all
          .filter(row => row.type === 'buy')
          .reduce((sum, row) => sum + Number(row.total || 0), 0),
        totalSell: all
          .filter(row => row.type === 'sell')
          .reduce((sum, row) => sum + getSignedTotal(row), 0),
        totalFee: all.reduce((sum, row) => sum + Number(row.fee || 0), 0),
        count: Number(data.total) || all.length,
      })
    } catch {}
  }, [])

  useEffect(() => {
    fetchHistory(filters)
  }, [filters, fetchHistory])

  useEffect(() => {
    fetchKpi()
  }, [fetchKpi])

  function updateFilters(patch) {
    setFilters(prev => ({ ...prev, ...patch, page: 1 }))
  }

  const start = total === 0 ? 0 : (filters.page - 1) * LIMIT + 1
  const end = Math.min(filters.page * LIMIT, total)

  return (
    <div style={{
      minHeight: 'calc(100vh - 80px)',
      background: '#000',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      color: '#fff',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 13, color: '#00ff88', fontWeight: 700, letterSpacing: 1 }}>
            COINHUB HISTORY
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, marginTop: 6 }}>
            Lịch sử giao dịch
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 10,
      }}>
        <KpiCard label="Tổng đã mua" value={formatPrice(kpi.totalBuy)} color="#00ff88" />
        <KpiCard label="Tổng đã bán" value={formatPrice(kpi.totalSell)} color="#ff4466" />
        <KpiCard label="Tổng phí đã trả" value={formatPrice(kpi.totalFee)} color="rgba(255,255,255,0.72)" />
        <KpiCard label="Số giao dịch" value={kpi.count.toLocaleString()} color="rgba(255,255,255,0.72)" />
      </div>

      <div style={card}>
        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
          padding: '12px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <select
            value={filters.type}
            onChange={event => updateFilters({ type: event.target.value })}
            style={controlStyle}
          >
            <option value="" style={{ color: '#000' }}>Tất cả loại</option>
            <option value="buy" style={{ color: '#000' }}>Mua</option>
            <option value="sell" style={{ color: '#000' }}>Bán</option>
          </select>

          <select
            value={filters.symbol}
            onChange={event => updateFilters({ symbol: event.target.value })}
            style={controlStyle}
          >
            <option value="" style={{ color: '#000' }}>Tất cả coin</option>
            {coins.map(coin => (
              <option key={coin.symbol} value={coin.symbol} style={{ color: '#000' }}>{coin.symbol}</option>
            ))}
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
            Từ
            <input
              type="date"
              value={filters.from}
              onChange={event => updateFilters({ from: event.target.value })}
              style={{ ...controlStyle, width: 150 }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
            đến
            <input
              type="date"
              value={filters.to}
              onChange={event => updateFilters({ to: event.target.value })}
              style={{ ...controlStyle, width: 150 }}
            />
          </label>

          {(filters.type || filters.symbol || filters.from || filters.to) && (
            <button
              onClick={() => setFilters(INIT_FILTERS)}
              style={{
                ...controlStyle,
                background: 'transparent',
                color: 'rgba(255,255,255,0.45)',
                cursor: 'pointer',
              }}
            >
              Xóa bộ lọc
            </button>
          )}

          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            Tìm thấy <b style={{ color: 'rgba(255,255,255,0.66)' }}>{total}</b> giao dịch
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            minWidth: 920,
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            fontSize: 13,
          }}>
            <colgroup>
              <col style={{ width: '15%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '13%' }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Thời gian', 'Cặp GD', 'Loại', 'Giá khớp', 'Số lượng', 'Tổng tiền', 'Phí', 'Trạng thái'].map(label => (
                  <th key={label} style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.8)',
                  }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 36, textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                    Đang tải...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.45)' }}>
                    {filters.type || filters.symbol || filters.from || filters.to
                      ? 'Không có giao dịch nào khớp với bộ lọc'
                      : 'Chưa có giao dịch nào'
                    }
                  </td>
                </tr>
              ) : rows.map(row => {
                const netTotal = getSignedTotal(row)
                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ color: 'rgba(255,255,255,0.9)' }}>{formatDate(row.created_at)}</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{formatTime(row.created_at)}</div>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 700 }}>
                      {row.symbol}/USD
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <TypeBadge type={row.type} />
                    </td>
                    <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace' }}>
                      {formatPrice(row.price)}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace' }}>
                      {Number(row.quantity).toFixed(6)} {row.symbol}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700 }}>
                      <span style={{ color: row.type === 'buy' ? '#ff4466' : '#00ff88' }}>
                        {row.type === 'buy' ? '-' : '+'}{formatPrice(netTotal)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace' }}>
                      {formatPrice(row.fee)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <StatusBadge />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            {total === 0 ? 'Không có dữ liệu' : `Hiển thị ${start}-${end} / ${total} giao dịch`}
          </span>
          <Pagination
            page={filters.page}
            total={total}
            limit={LIMIT}
            onChange={page => setFilters(prev => ({ ...prev, page }))}
          />
        </div>
      </div>
    </div>
  )
}
