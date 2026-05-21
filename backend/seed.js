import 'dotenv/config'
import { query } from './db/index.js'
import { fetchCoinList } from './services/coingecko.js'

async function seed() {
  console.log('Bắt đầu seed coins...')

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
    console.log(`  ✓ ${coin.symbol.toUpperCase()} — ${coin.name}`)
  }

  console.log('Seed xong!')
  process.exit(0)
}

seed().catch(err => {
  console.error('Seed thất bại:', err.message)
  process.exit(1)
})