import { Router } from 'express'
import { query } from '../db/index.js'
import { authenticate } from '../middleware/auth.js'
import redis from '../db/redis.js'

const router = Router()

router.get('/', authenticate, async (req, res, next) => {
  try {
    const lastReadRaw = await redis.get(`notifications_read:${req.user.id}`)
    const lastRead = lastReadRaw ? new Date(lastReadRaw) : new Date(0)

    const rows = await query(`
      SELECT id, symbol, alert_type, price, sent_at
      FROM alert_log
      WHERE user_id = $1
      ORDER BY sent_at DESC
      LIMIT 10
    `, [req.user.id])

    const unreadCount = rows.filter(row => new Date(row.sent_at) > lastRead).length
    res.json({ items: rows, unread_count: unreadCount })
  } catch (err) {
    next(err)
  }
})

router.post('/read', authenticate, async (req, res, next) => {
  try {
    await redis.set(`notifications_read:${req.user.id}`, new Date().toISOString())
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
