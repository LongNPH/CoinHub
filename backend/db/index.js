import pg from 'pg'
import 'dotenv/config'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

pool.on('error', (err) => {
  console.error('PostgreSQL lỗi:', err.message)
})

export async function query(sql, params) {
  const { rows } = await pool.query(sql, params)
  return rows
}

export async function getClient() {
  return pool.connect()
}
