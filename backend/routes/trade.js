import { Router } from 'express'
import { query } from '../db/index.js'
import { authenticate } from '../middleware/auth.js'
import { executeBuy, executeSell }  from '../services/trade.js'

const router = Router()

router.get('/balance', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id
    const [user] = await query(
      `SELECT usd_balance FROM users WHERE id = $1`,
      [userId]
    )
    const holdings = await query(
      `SELECT symbol, quantity
       FROM holdings
       WHERE user_id = $1 AND quantity > 0
       ORDER BY symbol ASC`,
      [userId]
    )

    res.json({
      usd: user.usd_balance,
      holdings,
    })
  } catch (err) {
    next(err)
  }
})

router.post('/buy', authenticate, async (req, res, next) => {
  try {
    const { symbol, quantity } = req.body
    if (!symbol || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Symbol và số lượng không hợp lệ' })
    }
    const result = await executeBuy(req.user.id, symbol.toUpperCase(), Number(quantity))
    res.json(result)
  } catch (err) { next(err) }
})

router.post('/sell', authenticate, async (req, res, next) => {
  try {
    const { symbol, quantity } = req.body
    if (!symbol || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Symbol và số lượng không hợp lệ' })
    }
    const result = await executeSell(req.user.id, symbol.toUpperCase(), Number(quantity))
    res.json(result)
  } catch (err) { next(err) }
})

router.get('/history', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id
    const { type, symbol, from, to, page = 1, limit = 10 } = req.query
    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.min(1000, Math.max(1, Number(limit) || 10))
    const offset = (pageNum - 1) * limitNum

    let sql    = `SELECT * FROM transactions WHERE user_id = $1`
    let params = [userId]
    let i      = 2

    if (type) {
      sql += ` AND type = $${i++}`
      params.push(type)
    }
    if (symbol) {
      sql += ` AND symbol = $${i++}`
      params.push(symbol.toUpperCase())
      }
    if (from) {
      sql += ` AND created_at >= $${i++}`
      params.push(from)
    }
    if (to) {
      sql += ` AND created_at <= $${i++}`
      params.push(to + ' 23:59:59')
    }
    const countSql    = sql.replace('SELECT *', 'SELECT COUNT(*)')
    const [{ count }] = await query(countSql, params)

    sql += ` ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`
    params.push(limitNum, offset)
    const rows = await query(sql, params)
    res.json({ rows, total: Number(count), page: pageNum, limit: limitNum })
  } catch (err) { next(err) }
})

router.get('/pending', authenticate, async (req, res, next) => {
  try {
    const rows = await query(`
      SELECT id, symbol, type, quantity, limit_price, status, created_at
      FROM pending_orders
      WHERE user_id = $1 AND status = 'pending'
      ORDER BY created_at DESC
    `, [req.user.id])

    res.json(rows)
  } catch (err) { next(err) }
})

export default router
