import 'dotenv/config'
import { query } from './db/index.js'
import { fetchHistory } from './services/coingecko.js'

async function seedPrices() {
  console.log('Seed price_history từ CoinGecko...')

  const symbols = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'DOT', 'LINK']

  for (const symbol of symbols) {
    try {
      const history = await fetchHistory(symbol)
      if (!history || history.length === 0) {
        console.log(`  ${symbol}: Không có dữ liệu`)
        continue
      }

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

      console.log(`  ✓ ${symbol}: Insert ${history.length} records`)
    } catch (err) {
      console.error(`  ✗ ${symbol}: ${err.message}`)
    }
  }

  console.log('Seed price_history xong!')
  process.exit(0)
}

seedPrices().catch(err => {
  console.error('Lỗi:', err)
  process.exit(1)
})
