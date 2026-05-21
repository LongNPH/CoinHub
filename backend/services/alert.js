import redis              from '../db/redis.js'
import { query }          from '../db/index.js'
import { sendAlertEmail } from './email.js'
import { getIO }          from '../socket.js'

const COOLDOWN = 60 * 60 

async function acquireCooldown(userId, symbol, type) {
  const key    = `alert_cd:${userId}:${symbol}:${type}`
  const result = await redis.set(key, '1', 'EX', COOLDOWN, 'NX')
  return result === 'OK'
}

export async function checkAlerts(symbol, ask, bid) {
  const rows = await query(`
    SELECT w.user_id, w.buy_alert, w.sell_alert, u.email
    FROM watchlist w
    JOIN users u ON u.id = w.user_id
    WHERE w.symbol = $1
      AND (w.buy_alert > 0 OR w.sell_alert > 0)
  `, [symbol])

  for (const row of rows) {
    if (row.buy_alert > 0 && ask <= Number(row.buy_alert)) {
      const canSend = await acquireCooldown(row.user_id, symbol, 'buy')
      if (canSend) {
        await sendAlertEmail(row.email, {
          symbol,
          type:      'buy',
          price:     ask,
          threshold: Number(row.buy_alert),
        })
        const [alert] = await query(`
          INSERT INTO alert_log (user_id, symbol, alert_type, price)
          VALUES ($1, $2, 'buy', $3)
          RETURNING id, symbol, alert_type, price, sent_at
        `, [row.user_id, symbol, ask])
        getIO().to(`user:${row.user_id}`).emit('notification', alert)
      }
    }

    if (row.sell_alert > 0 && bid >= Number(row.sell_alert)) {
      const canSend = await acquireCooldown(row.user_id, symbol, 'sell')
      if (canSend) {
        await sendAlertEmail(row.email, {
          symbol,
          type:      'sell',
          price:     bid,
          threshold: Number(row.sell_alert),
        })
        const [alert] = await query(`
          INSERT INTO alert_log (user_id, symbol, alert_type, price)
          VALUES ($1, $2, 'sell', $3)
          RETURNING id, symbol, alert_type, price, sent_at
        `, [row.user_id, symbol, bid])
        getIO().to(`user:${row.user_id}`).emit('notification', alert)
      }
    }
  }
}
