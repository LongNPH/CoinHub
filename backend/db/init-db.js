import bcrypt from 'bcryptjs'
import { readFile } from 'node:fs/promises'
import { query } from './index.js'
import { fetchCoinList, fetchHistory } from '../services/coingecko.js'

async function ensureSchema() {
  const schema = await readFile(new URL('./init.sql', import.meta.url), 'utf8')
  await query(schema)
}

export async function initializeDatabase() {
  try {
    await ensureSchema()

    // Seed coins
    const result = await query('SELECT COUNT(*) as count FROM coins')
    const coinCount = parseInt(result[0].count, 10)

    if (coinCount === 0) {
      console.log('Coins table trống, bắt đầu seed...')
      
      const coins = await fetchCoinList()

      for (const coin of coins) {
        await query(`
          INSERT INTO coins (symbol, name, rank, logo_url)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (symbol) DO UPDATE SET
            name     = EXCLUDED.name,
            rank     = EXCLUDED.rank,
            logo_url = EXCLUDED.logo_url
        `, [
          coin.symbol.toUpperCase(),
          coin.name,
          coin.market_cap_rank,
          coin.image,
        ])
      }
      console.log(` Seed coins xong! Đã insert ${coins.length} coins`)
    } else {
      console.log(` Coins table đã có ${coinCount} coins`)
    }

    const [admin] = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2 LIMIT 1',
      ['admin', 'a@gmail.com']
    )

    if (!admin) {
      const passwordHash = await bcrypt.hash('20061423a', 10)
      const [user] = await query(`
        INSERT INTO users (username, email, phone, password, role, usd_balance)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, ['admin', 'a@gmail.com', '0909090909', passwordHash, 'admin', 100000])

      const coins = await query('SELECT symbol FROM coins ORDER BY symbol ASC')
      for (const coin of coins) {
        await query(`
          INSERT INTO holdings (user_id, symbol, quantity)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, symbol) DO NOTHING
        `, [user.id, coin.symbol, 1])
      }

      console.log(' Seed admin user xong!')
    } else {
      console.log(' Admin user đã tồn tại')
    }

    // Seed prices
    const priceResult = await query('SELECT COUNT(*) as count FROM price_history')
    const priceCount = parseInt(priceResult[0].count, 10)

    if (priceCount === 0) {
      console.log('price_history table trống, bắt đầu seed từ CoinGecko...')
      
      const symbols = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'DOT', 'LINK']

      for (const symbol of symbols) {
        try {
          const history = await fetchHistory(symbol)
          if (!history || history.length === 0) continue

          for (const item of history) {
            await query(`
              INSERT INTO price_history (symbol, price, recorded_at)
              VALUES ($1, $2, $3)
              ON CONFLICT DO NOTHING
            `, [
              symbol,
              item.price,
              item.recorded_at,
            ])
          }
          console.log(`   ${symbol}: ${history.length} records`)
        } catch (err) {
          console.log(`    ${symbol}: ${err.message}`)
        }
      }

      console.log(' Seed price_history xong!')
    } else {
      console.log(` price_history đã có ${priceCount} records`)
    }
  } catch (err) {
    console.error(' Database initialization lỗi:', err.message)
    throw err
  }
}
