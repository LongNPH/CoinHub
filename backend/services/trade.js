import { getClient } from '../db/index.js'
import { getOrderBook } from './broadcast.js'
import { FEE_RATE } from '../utils/constants.js'

const MIN_QUANTITY = 0.000001

function assertQuantity(quantity) {
  if (!Number.isFinite(quantity) || quantity < MIN_QUANTITY) {
    throw new Error('So luong giao dich khong hop le')
  }
}

async function calculateFill(symbol, quantity, side) {
  const book = await getOrderBook(symbol)
  const levels = side === 'buy' ? book.asks : book.bids
  if (!Array.isArray(levels) || levels.length === 0) {
    throw new Error(`So lenh ${symbol} chua co du lieu`)
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

  if (remaining > 0.00000001) {
    throw new Error(`So lenh ${symbol} khong du thanh khoan cho ${quantity} ${symbol}`)
  }

  return {
    filledQuantity,
    totalQuote,
    executionPrice: totalQuote / filledQuantity,
  }
}

export async function executeBuy(userId, symbol, quantity) {
  assertQuantity(quantity)

  const { executionPrice, totalQuote } = await calculateFill(symbol, quantity, 'buy')
  const subtotal = totalQuote
  const fee = subtotal * FEE_RATE
  const totalCost = subtotal + fee

  const client = await getClient()
  try {
    await client.query('BEGIN')

    const { rows: users } = await client.query(
      `SELECT usd_balance FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    )
    const user = users[0]
    if (!user || Number(user.usd_balance) < totalCost) {
      throw new Error('So du USD khong du de thuc hien giao dich')
    }

    await client.query(
      `UPDATE users SET usd_balance = usd_balance - $1 WHERE id = $2`,
      [totalCost, userId]
    )

    await client.query(`
      INSERT INTO holdings (user_id, symbol, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, symbol)
      DO UPDATE SET quantity = holdings.quantity + EXCLUDED.quantity
    `, [userId, symbol, quantity])

    const { rows: transactions } = await client.query(`
      INSERT INTO transactions
        (user_id, symbol, type, price, quantity, fee, total)
      VALUES ($1, $2, 'buy', $3, $4, $5, $6)
      RETURNING *
    `, [userId, symbol, executionPrice, quantity, fee, totalCost])

    await client.query('COMMIT')

    return {
      transaction: transactions[0],
      executedPrice: executionPrice,
      fee,
      total: totalCost,
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function executeSell(userId, symbol, quantity) {
  assertQuantity(quantity)

  const { executionPrice, totalQuote } = await calculateFill(symbol, quantity, 'sell')
  const subtotal = totalQuote
  const fee = subtotal * FEE_RATE
  const netReceived = subtotal - fee

  const client = await getClient()
  try {
    await client.query('BEGIN')

    const { rows: holdings } = await client.query(
      `SELECT quantity FROM holdings WHERE user_id = $1 AND symbol = $2 FOR UPDATE`,
      [userId, symbol]
    )
    const holding = holdings[0]
    if (!holding || Number(holding.quantity) < quantity) {
      throw new Error(`So luong ${symbol} khong du de ban`)
    }

    await client.query(
      `UPDATE holdings SET quantity = quantity - $1
       WHERE user_id = $2 AND symbol = $3`,
      [quantity, userId, symbol]
    )

    await client.query(
      `DELETE FROM holdings
       WHERE user_id = $1 AND symbol = $2 AND quantity <= 0.00000001`,
      [userId, symbol]
    )

    await client.query(
      `UPDATE users SET usd_balance = usd_balance + $1 WHERE id = $2`,
      [netReceived, userId]
    )

    const { rows: transactions } = await client.query(`
      INSERT INTO transactions
        (user_id, symbol, type, price, quantity, fee, total)
      VALUES ($1, $2, 'sell', $3, $4, $5, $6)
      RETURNING *
    `, [userId, symbol, executionPrice, quantity, fee, subtotal])

    await client.query('COMMIT')

    return {
      transaction: transactions[0],
      executedPrice: executionPrice,
      fee,
      total: subtotal,
      received: netReceived,
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
