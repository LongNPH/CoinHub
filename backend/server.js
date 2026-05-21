import http from 'http'
import app from './app.js'
import { initSocket } from './socket.js'
import { connectBinance } from './services/binance.js'
import { computeStats } from './services/latency.js'
import { initializeDatabase } from './db/init-db.js'
import { startNewsCacheRefresh } from './services/coingecko.js'
import { recordLatency }     from './services/latency.js'
import redis                 from './db/redis.js'
import 'dotenv/config'

const PORT = process.env.PORT || 3000

const httpServer = http.createServer(app)
const io         = initSocket(httpServer)

io.on('connection', (socket) => {
  redis.incr('ws:connections')
  socket.on('join_user', (userId) => {
    if (userId) {
      socket.join(`user:${userId}`)
    }
  })

  socket.on('latency_report', async ({ ms }) => {
    if (typeof ms === 'number' && ms > 0 && ms < 30000){
      await recordLatency(ms)
    }
  })
  socket.on('disconnect', () => {
    redis.decr('ws:connections').then(count => {
      if (count < 0) redis.set('ws:connections', 0)
    })
  })
})

setInterval(async () => {
  const stats = await computeStats()
  if (stats) {
    const wsConnections = Number(await redis.get('ws:connections')) || 0
    io.emit('latency_stats', { ...stats, wsConnections })
  }
}, 5000)

await initializeDatabase()
await redis.set('ws:connections', 0)

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`CoinHub backend chạy tại http://localhost:${PORT}`)
  connectBinance()
  startNewsCacheRefresh()
})
