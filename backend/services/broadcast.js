import redis from '../db/redis.js'
import { getIO } from '../socket.js'
import { checkAlerts } from './alert.js'

const PRICE_TTL = 120
const TRADE_TTL = 300
const BINANCE_REST_URL = process.env.BINANCE_REST_URL || 'https://api.binance.com'
const BINANCE_SYMBOLS = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  BNB: 'BNBUSDT',
  SOL: 'SOLUSDT',
  XRP: 'XRPUSDT',
  DOGE: 'DOGEUSDT',
  ADA: 'ADAUSDT',
  AVAX: 'AVAXUSDT',
  DOT: 'DOTUSDT',
  LINK: 'LINKUSDT',
}

export async function broadcastPrice(data) {
  const raw = await redis.get(`price:${data.symbol}`)
  const previous = raw ? JSON.parse(raw) : {}
  const payload = {
    ...previous,
    ...data,
    serverTime: Date.now(),
  }

  await redis.set(
    `price:${data.symbol}`,
    JSON.stringify(payload),
    'EX', PRICE_TTL
  )

  getIO().emit('price', payload)

  const hasOrderBook = Number.isFinite(data.ask) && Number.isFinite(data.bid)
  if (hasOrderBook) {
    checkAlerts(data.symbol, data.ask, data.bid).catch(err => {
      console.error('checkAlerts loi:', err.message)
    })
  }
}

export async function broadcastOrderBook(data) {
  const payload = {
    ...data,
    serverTime: Date.now(),
  }

  await redis.set(
    `orderbook:${data.symbol}`,
    JSON.stringify(payload),
    'EX',
    PRICE_TTL
  )

  getIO().emit(`orderbook:${data.symbol}`, payload)
}

export async function broadcastTrade(data) {
  const payload = {
    ...data,
    serverTime: Date.now(),
  }

  await redis
    .multi()
    .lpush(`trades:${data.symbol}`, JSON.stringify(payload))
    .ltrim(`trades:${data.symbol}`, 0, 11)
    .expire(`trades:${data.symbol}`, TRADE_TTL)
    .exec()

  getIO().emit(`trade:${data.symbol}`, payload)
}

export async function getOrderBook(symbol) {
  const raw = await redis.get(`orderbook:${symbol}`)
  if (raw) return JSON.parse(raw)

  const snapshot = await fetchBinanceOrderBook(symbol).catch(() => null)
  if (snapshot) return snapshot

  const priceRaw = await redis.get(`price:${symbol}`)
  if (!priceRaw) {
    return { symbol, bids: [], asks: [], serverTime: Date.now() }
  }

  const price = JSON.parse(priceRaw)
  return {
    symbol,
    bids: Number.isFinite(price.bid) ? [{ price: price.bid, qty: Number(price.bidQty || 0).toFixed(4) }] : [],
    asks: Number.isFinite(price.ask) ? [{ price: price.ask, qty: Number(price.askQty || 0).toFixed(4) }] : [],
    serverTime: price.serverTime || Date.now(),
  }
}

export async function getRecentTrades(symbol, limit = 9) {
  const rows = await redis.lrange(`trades:${symbol}`, 0, limit - 1)
  const cachedTrades = rows
    .map(row => {
      try {
        return JSON.parse(row)
      } catch {
        return null
      }
    })
    .filter(Boolean)

  if (cachedTrades.length > 0) return cachedTrades

  return fetchBinanceTrades(symbol, limit).catch(() => [])
}

export async function getLatestPrice(symbol) {
  const raw = await redis.get(`price:${symbol}`)
  if (!raw) throw new Error(`Chưa có giá ${symbol}, thử lại sau`)
  return JSON.parse(raw)
}

async function fetchBinanceOrderBook(symbol) {
  const pair = BINANCE_SYMBOLS[symbol]
  if (!pair) return null

  const res = await fetch(`${BINANCE_REST_URL}/api/v3/depth?symbol=${pair}&limit=10`)
  if (!res.ok) return null

  const data = await res.json()
  const payload = {
    symbol,
    bids: data.bids.slice(0, 8).map(([price, qty]) => ({
      price: parseFloat(price),
      qty:   parseFloat(qty).toFixed(4),
    })),
    asks: data.asks.slice(0, 8).map(([price, qty]) => ({
      price: parseFloat(price),
      qty:   parseFloat(qty).toFixed(4),
    })),
    serverTime: Date.now(),
  }

  await redis.set(`orderbook:${symbol}`, JSON.stringify(payload), 'EX', PRICE_TTL)
  return payload
}

async function fetchBinanceTrades(symbol, limit) {
  const pair = BINANCE_SYMBOLS[symbol]
  if (!pair) return []

  const res = await fetch(`${BINANCE_REST_URL}/api/v3/aggTrades?symbol=${pair}&limit=${limit}`)
  if (!res.ok) return []

  const data = await res.json()
  const trades = data
    .map(trade => ({
      id:     `${symbol}-${trade.a}`,
      symbol,
      price:  parseFloat(trade.p),
      qty:    parseFloat(trade.q).toFixed(4),
      isBuy:  !trade.m,
      time:   trade.T,
      serverTime: Date.now(),
    }))
    .sort((a, b) => b.time - a.time)
    .slice(0, limit)

  if (trades.length > 0) {
    await redis
      .multi()
      .del(`trades:${symbol}`)
      .rpush(`trades:${symbol}`, ...trades.map(trade => JSON.stringify(trade)))
      .expire(`trades:${symbol}`, TRADE_TTL)
      .exec()
  }

  return trades
}
