import { useState, useEffect } from 'react'
import { useAuth }             from '../hooks/useAuth'
import { useNavigate }         from 'react-router-dom'
import { get, post }           from '../utils/api'
import { formatPrice }         from '../utils/formatters'
import { FEE_RATE }            from '../utils/constants'

const S = {
  overlay: {
    position:       'fixed',
    inset:          0,
    background:     'rgba(0,0,0,0.75)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    zIndex:         1000,
    padding:        16,
  },
  modal: {
    background:   '#0d0d0d',
    border:       '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14,
    width:        '100%',
    maxWidth:     360,
    overflow:     'hidden',
  },
  header: {
    padding:      '14px 18px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'space-between',
  },
  body: {
    padding: '18px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  tabs: {
    display:     'flex',
    background:  'rgba(255,255,255,0.04)',
    borderRadius: 8,
    padding:      3,
    gap:          3,
  },
  tab: (active, type) => ({
    flex:         1,
    padding:      '7px 0',
    textAlign:    'center',
    fontSize:     13,
    fontWeight:   active ? 500 : 400,
    borderRadius: 6,
    border:       'none',
    cursor:       'pointer',
    background:   active
      ? type === 'buy' ? '#00ff88' : '#ff4466'
      : 'transparent',
    color: active
      ? type === 'buy' ? '#000' : '#fff'
      : 'rgba(255,255,255,0.35)',
    transition: 'all .15s',
  }),
  label: {
    fontSize: 11,
    color:    'rgba(255,255,255,0.4)',
    marginBottom: 5,
  },
  inputWrap: {
    display:      'flex',
    alignItems:   'center',
    background:   'rgba(255,255,255,0.05)',
    border:       '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    overflow:     'hidden',
  },
  input: {
    flex:       1,
    padding:    '9px 12px',
    background: 'transparent',
    border:     'none',
    color:      '#fff',
    fontSize:   14,
    outline:    'none',
  },
  unit: {
    padding:     '9px 12px',
    fontSize:    11,
    color:       'rgba(255,255,255,0.35)',
    borderLeft:  '1px solid rgba(255,255,255,0.08)',
    whiteSpace:  'nowrap',
  },
  pctRow: { display: 'flex', gap: 5 },
  pctBtn: {
    flex:         1,
    padding:      '5px 0',
    textAlign:    'center',
    fontSize:     11,
    border:       '1px solid rgba(255,255,255,0.1)',
    borderRadius: 5,
    cursor:       'pointer',
    background:   'transparent',
    color:        'rgba(255,255,255,0.35)',
  },
  summary: {
    background:   'rgba(255,255,255,0.03)',
    border:       '1px solid rgba(255,255,255,0.07)',
    borderRadius: 8,
    padding:      10,
    display:      'flex',
    flexDirection:'column',
    gap:          5,
  },
  sumRow: {
    display:        'flex',
    justifyContent: 'space-between',
    fontSize:       12,
    color:          'rgba(255,255,255,0.35)',
  },
  available: {
    fontSize: 12,
    color:    'rgba(255,255,255,0.25)',
  },
  error: {
    padding:      '8px 12px',
    background:   'rgba(255,68,102,0.08)',
    border:       '1px solid rgba(255,68,102,0.2)',
    borderRadius: 7,
    fontSize:     12,
    color:        '#ff4466',
  },
  btnConfirm: (type) => ({
    width:        '100%',
    padding:      '11px',
    borderRadius: 8,
    border:       'none',
    background:   type === 'buy' ? '#00ff88' : '#ff4466',
    color:        type === 'buy' ? '#000' : '#fff',
    fontSize:     14,
    fontWeight:   500,
    cursor:       'pointer',
  }),
}

function estimateFill(orderBook, quantity, side) {
  if (!quantity || quantity <= 0) {
    return { canFill: false, executionPrice: 0, totalQuote: 0 }
  }

  const levels = side === 'buy' ? orderBook.asks : orderBook.bids
  if (!Array.isArray(levels) || levels.length === 0) {
    return { canFill: false, executionPrice: 0, totalQuote: 0 }
  }

  let remaining = quantity
  let totalQuote = 0
  let filledQuantity = 0

  for (const level of levels) {
    const levelPrice = Number(level.price)
    const levelQty = Number(level.qty)
    if (!Number.isFinite(levelPrice) || !Number.isFinite(levelQty) || levelQty <= 0) continue

    const fillQty = Math.min(remaining, levelQty)
    totalQuote += fillQty * levelPrice
    filledQuantity += fillQty
    remaining -= fillQty

    if (remaining <= 0.00000001) break
  }

  return {
    canFill: remaining <= 0.00000001,
    executionPrice: filledQuantity > 0 ? totalQuote / filledQuantity : 0,
    totalQuote,
  }
}

function calculateAffordableQuantity(levels, budget) {
  if (!Array.isArray(levels) || budget <= 0) return 0

  let remainingBudget = budget / (1 + FEE_RATE)
  let quantity = 0

  for (const level of levels) {
    const levelPrice = Number(level.price)
    const levelQty = Number(level.qty)
    if (!Number.isFinite(levelPrice) || !Number.isFinite(levelQty) || levelQty <= 0) continue

    const levelCost = levelPrice * levelQty
    if (remainingBudget >= levelCost) {
      quantity += levelQty
      remainingBudget -= levelCost
    } else {
      quantity += remainingBudget / levelPrice
      break
    }
  }

  return Math.max(quantity * 0.999, 0)
}


function WatchForm({ coin, currentWatch, onSave, onClose }) {
  const [buyAlert,  setBuyAlert]  = useState(
    currentWatch?.buy_alert  > 0 ? currentWatch.buy_alert  : ''
  )
  const [sellAlert, setSellAlert] = useState(
    currentWatch?.sell_alert > 0 ? currentWatch.sell_alert : ''
  )
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    try {
      await onSave(Number(buyAlert) || 0, Number(sellAlert) || 0)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.body}>
      {/* Buy alert */}
      <div>
        <div style={S.label}>
          Cảnh báo MUA — theo dõi cột BÁN (Ask)
        </div>
        <div style={S.inputWrap}>
          <span style={{ ...S.unit, borderLeft: 'none', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            Ask ≤
          </span>
          <input
            type="number"
            placeholder="0 = tắt"
            value={buyAlert}
            onChange={e => setBuyAlert(e.target.value)}
            style={S.input}
          />
          <span style={S.unit}>USD</span>
        </div>
      </div>

      {/* Sell alert */}
      <div>
        <div style={S.label}>
          Cảnh báo BÁN — theo dõi cột MUA (Bid)
        </div>
        <div style={S.inputWrap}>
          <span style={{ ...S.unit, borderLeft: 'none', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            Bid ≥
          </span>
          <input
            type="number"
            placeholder="0 = tắt"
            value={sellAlert}
            onChange={e => setSellAlert(e.target.value)}
            style={S.input}
          />
          <span style={S.unit}>USD</span>
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
        Nhập 0 hoặc để trống để tắt điều kiện đó.
        Email cảnh báo gửi tối đa 1 lần/giờ.
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose} style={{
          flex: 1, padding: '9px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'transparent', color: 'rgba(255,255,255,0.4)',
          fontSize: 13, cursor: 'pointer',
        }}>
          Hủy
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            flex: 1, padding: '9px', borderRadius: 8,
            border: 'none', background: '#fff',
            color: '#000', fontSize: 13, fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Đang lưu...' : 'Xác nhận'}
        </button>
      </div>
    </div>
  )
}


function TradeForm({ coin, price, balance, initialTab, onSuccess, onClose }) {
  const [tab,      setTab]      = useState(initialTab || 'buy')
  const [qty,      setQty]      = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] })

  const currentPrice = tab === 'buy' ? price?.ask : price?.bid
  const qtyNum       = parseFloat(qty) || 0
  const fillEstimate = estimateFill(orderBook, qtyNum, tab)
  const executionPrice = fillEstimate.executionPrice || currentPrice || 0
  const subtotal     = fillEstimate.totalQuote || executionPrice * qtyNum
  const slippage     = Math.abs(executionPrice - (currentPrice || 0)) * qtyNum
  const fee          = subtotal * FEE_RATE
  const total        = tab === 'buy'
    ? subtotal + fee
    : subtotal - fee

  const availableUsd  = Number(balance?.usd || 0)
  const availableCoin = Number(
    balance?.holdings?.find(h => h.symbol === coin.symbol)?.quantity || 0
  )

  useEffect(() => {
    get(`/api/coins/${coin.symbol}/orderbook`)
      .then(data => setOrderBook(data || { bids: [], asks: [] }))
      .catch(() => setOrderBook({ bids: [], asks: [] }))
  }, [coin.symbol])

  function setPct(pct) {
    if (tab === 'buy') {
      if (!currentPrice) return
      setQty(calculateAffordableQuantity(orderBook.asks, availableUsd * pct).toFixed(6))
    } else {
      setQty((availableCoin * pct).toFixed(6))
    }
    setError('')
  }

  async function handleConfirm() {
    if (!qty || qtyNum <= 0) {
      setError('Vui lòng nhập số lượng')
      return
    }
    if (tab === 'buy' && total > availableUsd) {
      setError('Số dư USD không đủ')
      return
    }
    if (!fillEstimate.canFill) {
      setError(`Sổ lệnh không đủ thanh khoản cho ${qtyNum} ${coin.symbol}`)
      return
    }
    if (tab === 'sell' && qtyNum > availableCoin) {
      setError(`Số lượng ${coin.symbol} không đủ`)
      return
    }

    setLoading(true)
    setError('')
    try {
      const result = await post(`/api/trade/${tab}`, {
        symbol:   coin.symbol,
        quantity: qtyNum,
      })
      window.dispatchEvent(new Event('coinhub:balance-updated'))
      onSuccess?.({ ...result, mode: tab, symbol: coin.symbol, quantity: qtyNum })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.body}>
      {/* Tabs */}
      <div style={S.tabs}>
        <button style={S.tab(tab === 'buy',  'buy')}  onClick={() => { setTab('buy');  setQty(''); setError('') }}>Mua</button>
        <button style={S.tab(tab === 'sell', 'sell')} onClick={() => { setTab('sell'); setQty(''); setError('') }}>Bán</button>
      </div>

      {/* Giá */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>
          {tab === 'buy' ? 'Giá Ask' : 'Giá Bid'} hiện tại
        </span>
        <span style={{ color: '#fff', fontWeight: 500 }}>
          {currentPrice ? formatPrice(currentPrice) : '—'}
        </span>
      </div>

      {/* Số lượng */}
      <div>
        <div style={S.label}>Số lượng ({coin.symbol})</div>
        <div style={S.inputWrap}>
          <input
            type="number"
            placeholder="0.00"
            value={qty}
            onChange={e => { setQty(e.target.value); setError('') }}
            style={S.input}
            min="0"
            step="0.0001"
          />
          <span style={S.unit}>{coin.symbol}</span>
        </div>
        <div style={{ ...S.pctRow, marginTop: 6 }}>
          {[0.25, 0.5, 0.75, 1].map(p => (
            <button key={p} style={S.pctBtn} onClick={() => setPct(p)}>
              {p * 100}%
            </button>
          ))}
        </div>
      </div>

      {/* Số dư khả dụng */}
      <div style={S.available}>
        Khả dụng:{' '}
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
          {tab === 'buy'
            ? formatPrice(availableUsd)
            : `${availableCoin.toFixed(4)} ${coin.symbol}`
          }
        </span>
      </div>

      {/* Tóm tắt */}
      {qtyNum > 0 && (
        <div style={S.summary}>
          <div style={S.sumRow}>
            <span>Giá khớp ước tính</span>
            <span style={{ color: '#ccc' }}>{formatPrice(executionPrice)}</span>
          </div>
          <div style={S.sumRow}>
            <span>Slippage</span>
            <span style={{ color: '#ccc' }}>
              {fillEstimate.canFill ? formatPrice(slippage) : 'Không đủ thanh khoản'}
            </span>
          </div>
          <div style={S.sumRow}>
            <span>Phí (0.1%)</span>
            <span style={{ color: '#ccc' }}>{formatPrice(fee)}</span>
          </div>
          <div style={{
            ...S.sumRow,
            borderTop:   '1px solid rgba(255,255,255,0.07)',
            paddingTop:  6,
            marginTop:   2,
            color:       '#fff',
            fontWeight:  500,
            fontSize:    13,
          }}>
            <span>{tab === 'buy' ? 'Tổng thanh toán' : 'Thực nhận'}</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      )}

      {error && <div style={S.error}>{error}</div>}

      <button
        onClick={handleConfirm}
        disabled={loading}
        style={{
          ...S.btnConfirm(tab),
          opacity: loading ? 0.6 : 1,
          cursor:  loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading
          ? 'Đang xử lý...'
          : tab === 'buy'
            ? `Mua ${coin.symbol}`
            : `Bán ${coin.symbol}`
        }
      </button>
    </div>
  )
}


export default function WatchModal({
  coin,
  price,
  balance,
  mode = 'trade',       
  initialTab = 'buy',
  currentWatch = null,
  onClose,
  onWatchSave,
  onTradeSuccess,
}) {
  const { user }   = useAuth()
  const navigate   = useNavigate()

  useEffect(() => {
    if (!user) {
      onClose?.()
      navigate('/login')
    }
  }, [user])

  if (!user) return null

  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <div style={S.modal}>

        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>
              {mode === 'trade' ? '' : 'Theo dõi '}{coin.name}
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)',
                             marginLeft: 6 }}>
                ({coin.symbol})
              </span>
            </div>
            {price && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)',
                            marginTop: 2 }}>
                Ask: {formatPrice(price.ask)} · Bid: {formatPrice(price.bid)}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.3)', fontSize: 20,
              cursor: 'pointer', lineHeight: 1, padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        {mode === 'watch' ? (
          <WatchForm
            coin={coin}
            currentWatch={currentWatch}
            onSave={onWatchSave}
            onClose={onClose}
          />
        ) : (
          <TradeForm
            coin={coin}
            price={price}
            balance={balance}
            initialTab={initialTab}
            onSuccess={onTradeSuccess}
            onClose={onClose}
          />
        )}

      </div>
    </div>
  )
}
