import WebSocket from 'ws'
import { broadcastOrderBook, broadcastPrice, broadcastTrade } from './broadcast.js'
import { query } from '../db/index.js'

const SYMBOLS = [
  'btcusdt','ethusdt','bnbusdt','solusdt','xrpusdt',
  'dogeusdt','adausdt','avaxusdt','dotusdt','linkusdt',
]

const STREAMS = SYMBOLS
  .flatMap(s => [`${s}@bookTicker`, `${s}@ticker`, `${s}@aggTrade`, `${s}@depth10@100ms`])
  .join('/')
const BINANCE_BASE = process.env.BINANCE_WS_URL || 'wss://stream.binance.com:9443'
const WS_URL  = `${BINANCE_BASE.replace(/\/stream\/?$/, '')}/stream?streams=${STREAMS}`

const SYMBOL_MAP = {
  btcusdt:  'BTC',  ethusdt:  'ETH',
  bnbusdt:  'BNB',  solusdt:  'SOL',
  xrpusdt:  'XRP',  dogeusdt: 'DOGE',
  adausdt:  'ADA',  avaxusdt: 'AVAX',
  dotusdt:  'DOT',  linkusdt: 'LINK',
}

let ws
let priceHistoryTimer = null
const pendingOrderBooks = new Map()
const orderBookTimers = new Map()

function queueOrderBook(payload) {
  pendingOrderBooks.set(payload.symbol, payload)

  if (orderBookTimers.has(payload.symbol)) return

  const timer = setTimeout(async () => {
    orderBookTimers.delete(payload.symbol)

    const latest = pendingOrderBooks.get(payload.symbol)
    pendingOrderBooks.delete(payload.symbol)
    if (!latest) return

    try {
      await broadcastOrderBook(latest)
    } catch (err) {
      console.error(`Broadcast orderbook ${payload.symbol} loi:`, err.message)
    }
  }, 500)

  orderBookTimers.set(payload.symbol, timer)
}

export function connectBinance() {
  ws = new WebSocket(WS_URL)

  ws.on('open', () => {
    console.log('Binance WebSocket đã kết nối')
  })

  ws.on('message', async (raw) => {
    try {
      const msg          = JSON.parse(raw)
      const data         = msg.data
      const streamSymbol = msg.stream?.split('@')[0]
      const symbol       = SYMBOL_MAP[(data.s || streamSymbol)?.toLowerCase()]
      if (!symbol) return

      if (Array.isArray(data.bids) && Array.isArray(data.asks)) {
        queueOrderBook({
          symbol,
          bids: data.bids.slice(0, 8).map(([price, qty]) => ({
            price: parseFloat(price),
            qty:   parseFloat(qty).toFixed(4),
          })),
          asks: data.asks.slice(0, 8).map(([price, qty]) => ({
            price: parseFloat(price),
            qty:   parseFloat(qty).toFixed(4),
          })),
        })
        return
      }

      if (data.e === '24hrTicker') {
        await broadcastPrice({
          symbol,
          change24h: parseFloat(data.P),
          last:      parseFloat(data.c),
          high24h:   parseFloat(data.h),
          low24h:    parseFloat(data.l),
        })
        return
      }

      if (data.e === 'aggTrade') {
        await broadcastTrade({
          id:     `${symbol}-${data.a}`,
          symbol,
          price:  parseFloat(data.p),
          qty:    parseFloat(data.q).toFixed(4),
          isBuy:  !data.m,
          time:   data.T,
        })
        return
      }

      await broadcastPrice({
        symbol,
        ask:    parseFloat(data.a),
        bid:    parseFloat(data.b),
        askQty: parseFloat(data.A),
        bidQty: parseFloat(data.B),
      })
    } catch (err) {
      console.error('Binance parse lỗi:', err.message)
    }
  })

  ws.on('close', () => {
    console.log('Binance WebSocket đóng, thử lại sau 5 giây...')
    setTimeout(connectBinance, 5000)
  })

  ws.on('error', (err) => {
    console.error('Binance WS lỗi:', err.message)
  })

  if (!priceHistoryTimer) {
    priceHistoryTimer = setInterval(savePriceHistory, 30 * 1000)
  }
}

async function savePriceHistory() {
  for (const symbol of Object.values(SYMBOL_MAP)) {
    try {
      const raw = await import('../db/redis.js').then(m => m.default.get(`price:${symbol}`))
      if (!raw) continue
      const { ask } = JSON.parse(raw)
      await query(
        `INSERT INTO price_history (symbol, price) VALUES ($1, $2)`,
        [symbol, ask]
      )
    } catch (err) {
      console.error(`Lưu price_history ${symbol} lỗi:`, err.message)
    }
  }
}
