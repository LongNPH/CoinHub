import { Router }       from 'express'
import { query }        from '../db/index.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT symbol, buy_alert, sell_alert, created_at
       FROM watchlist WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    )
    res.json(rows)
  } catch (err) { next(err) }
})

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { symbol, buyAlert = 0, sellAlert = 0 } = req.body
    if (!symbol) {
      return res.status(400).json({ error: 'Thiếu symbol' })
    }

    const normalizedSymbol = symbol.toUpperCase()
    const normalizedBuyAlert = Number(buyAlert) || 0
    const normalizedSellAlert = Number(sellAlert) || 0

    if (normalizedBuyAlert <= 0 && normalizedSellAlert <= 0) {
      await query(
        `DELETE FROM watchlist WHERE user_id = $1 AND symbol = $2`,
        [req.user.id, normalizedSymbol]
      )
      return res.json(null)
    }

    const [row] = await query(`
      INSERT INTO watchlist (user_id, symbol, buy_alert, sell_alert)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, symbol) DO UPDATE SET
        buy_alert  = EXCLUDED.buy_alert,
        sell_alert = EXCLUDED.sell_alert
      RETURNING *
    `, [req.user.id, normalizedSymbol, normalizedBuyAlert, normalizedSellAlert])

    res.json(row)
  } catch (err) { next(err) }
})

router.delete('/:symbol', authenticate, async (req, res, next) => {
  try {
    await query(
      `DELETE FROM watchlist WHERE user_id = $1 AND symbol = $2`,
      [req.user.id, req.params.symbol.toUpperCase()]
    )
    res.status(204).send()
  } catch (err) { next(err) }
})

export default router
