import { Router } from 'express'
import { query } from '../db/index.js'
import { fetchHistory, fetchNews } from '../services/coingecko.js'
import { getLatestPrice, getOrderBook, getRecentTrades } from '../services/broadcast.js'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const coins = await query(`
      SELECT
        c.id,
        c.symbol,
        c.name,
        c.rank,
        c.logo_url,
        COUNT(w.id)::int AS watchlist_count
      FROM coins c
      LEFT JOIN watchlist w ON w.symbol = c.symbol
      GROUP BY c.id
      ORDER BY c.rank ASC
    `)
    res.json(coins)
  } catch (err) {
    next(err)
  }
})

router.get('/history/all', async (req, res, next) => {
  try {
    const rows = await query(`
      SELECT symbol
      FROM coins
      ORDER BY rank ASC
    `)

    const results = await Promise.all(
      rows.map(row =>
        fetchDbHistory(row.symbol)
          .then(history => ({ symbol: row.symbol, history }))
          .catch(() => fetchHistory(row.symbol).then(history => ({ symbol: row.symbol, history })))
          .catch(() => ({ symbol: row.symbol, history: [] }))
      )
    )

    res.json(results)
  } catch (err) {
    next(err)
  }
})

router.get('/latest-prices', async (req, res, next) => {
  try {
    const symbols = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'DOT', 'LINK']
    const priceMap = {}

    for (const symbol of symbols) {
      try {
        const realtime = await getLatestPrice(symbol).catch(() => null)
        const latest = await query(`
          SELECT DISTINCT ON (symbol) symbol, price, recorded_at
          FROM price_history
          WHERE symbol = $1
          ORDER BY symbol, recorded_at DESC
          LIMIT 1
        `, [symbol])

        const latestPrice = realtime?.ask ?? (latest?.length ? parseFloat(latest[0].price) : 0)
        const old = await query(`
          SELECT price, recorded_at
          FROM price_history
          WHERE symbol = $1
            AND recorded_at <= NOW() - INTERVAL '24 hours'
          ORDER BY recorded_at DESC
          LIMIT 1
        `, [symbol])

        let change24h = Number.isFinite(realtime?.change24h) ? realtime.change24h : 0
        if (latestPrice > 0 && old && old.length > 0) {
          const oldPrice = parseFloat(old[0].price)
          if (!Number.isFinite(realtime?.change24h)) {
            change24h = ((latestPrice - oldPrice) / oldPrice) * 100
          }
        }

        priceMap[symbol] = {
          ask: latestPrice,
          bid: realtime?.bid ?? 0,
          askQty: realtime?.askQty ?? 0,
          bidQty: realtime?.bidQty ?? 0,
          change24h: parseFloat(change24h.toFixed(2)),
          high24h: realtime?.high24h ?? latestPrice,
          low24h: realtime?.low24h ?? latestPrice,
          serverTime: realtime?.serverTime ?? Date.now(),
        }
      } catch (err) {
        console.error(`Error fetching price for ${symbol}:`, err.message)
        priceMap[symbol] = { ask: 0, bid: 0, change24h: 0 }
      }
    }

    res.json(priceMap)
  } catch (err) {
    next(err)
  }
})

router.get('/news', async (req, res, next) => {
  try {
    const news = await fetchNews()
    res.json(news)
  } catch (err) {
    next(err)
  }
})

router.get('/:symbol/orderbook', async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase()
    const orderBook = await getOrderBook(symbol)
    res.json(orderBook)
  } catch (err) {
    next(err)
  }
})

router.get('/:symbol/trades', async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase()
    const trades = await getRecentTrades(symbol)
    res.json(trades)
  } catch (err) {
    next(err)
  }
})

router.get('/:symbol/history', async (req, res, next) => {
  try {
    const symbol  = req.params.symbol.toUpperCase()
    const history = await fetchDbHistory(symbol).catch(() => fetchHistory(symbol))
    res.json(history)
  } catch (err) {
    next(err)
  }
})

async function fetchDbHistory(symbol) {
  const history = await query(`
    SELECT
      (array_agg(price ORDER BY recorded_at DESC))[1] AS price,
      date_trunc('hour', recorded_at) AS recorded_at
    FROM price_history
    WHERE symbol = $1
      AND recorded_at >= NOW() - INTERVAL '24 hours'
    GROUP BY date_trunc('hour', recorded_at)
    ORDER BY recorded_at ASC
  `, [symbol])

  if (history.length === 0) {
    throw new Error(`No DB price history for ${symbol}`)
  }

  const realtime = await getLatestPrice(symbol).catch(() => null)
  if (realtime?.ask) {
    const last = history[history.length - 1]
    const latestTime = last ? new Date(last.recorded_at).getTime() : 0
    const currentTime = realtime.serverTime || Date.now()

    if (currentTime - latestTime > 60 * 1000) {
      history.push({
        price: realtime.ask,
        recorded_at: new Date(currentTime).toISOString(),
        isCurrent: true,
      })
    } else {
      history[history.length - 1] = {
        ...last,
        price: realtime.ask,
        recorded_at: new Date(currentTime).toISOString(),
        isCurrent: true,
      }
    }
  }

  return history
}

export default router
