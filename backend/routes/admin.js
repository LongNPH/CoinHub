import { Router }       from 'express'
import { query }        from '../db/index.js'
import redis            from '../db/redis.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import { computeStats } from '../services/latency.js'

const router = Router()

router.use(authenticate, requireAdmin)

router.get('/stats', async (req, res, next) => {
  try {
    const [{ count: userCount }] = await query(
      `SELECT COUNT(*) FROM users`
    )

    const [{ count: txToday }] = await query(
      `SELECT COUNT(*) FROM transactions
       WHERE created_at >= CURRENT_DATE`
    )

    const [{ count: txTotal }] = await query(
      `SELECT COUNT(*) FROM transactions`
    )

    const [{ count: alertToday }] = await query(
      `SELECT COUNT(*) FROM alert_log
       WHERE sent_at >= CURRENT_DATE`
    )

    const [{ count: alertTotal }] = await query(
      `SELECT COUNT(*) FROM alert_log`
    )

    const topWatched = await query(
      `SELECT symbol, COUNT(*) AS count
       FROM watchlist
       GROUP BY symbol
       ORDER BY count DESC
       LIMIT 5`
    )

    const wsCount = await redis.get('ws:connections') || 0

    const latency = await computeStats()

    res.json({
      users: {
        total: Number(userCount),
      },
      transactions: {
        today: Number(txToday),
        total: Number(txTotal),
      },
      alerts: {
        today: Number(alertToday),
        total: Number(alertTotal),
      },
      topWatched,
      wsConnections: Number(wsCount),
      latency,
    })
  } catch (err) {
    next(err)
  }
})


router.get('/latency', async (req, res, next) => {
  try {
    const stats = await computeStats()
    res.json(stats || {
      p50: 0, p95: 0, p99: 0, avg: 0,
      min: 0, max: 0, count: 0,
      slaPass: 0, slaPct: 0, distribution: [],
    })
  } catch (err) {
    next(err)
  }
})

export default router
