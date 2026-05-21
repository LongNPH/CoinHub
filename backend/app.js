import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import 'dotenv/config'

import authRoutes  from './routes/auth.js'
import tradeRoutes from './routes/trade.js'
import coinsRoutes from './routes/coins.js'
import watchlistRoutes from './routes/watchlist.js'
import notificationRoutes from './routes/notifications.js'
import { errorHandler } from './middleware/error.js'
import adminRoutes     from './routes/admin.js'

const app = express()

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth',  authRoutes)
app.use('/api/trade', tradeRoutes)
app.use('/api/coins', coinsRoutes)
app.use('/api/watchlist', watchlistRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/admin',     adminRoutes)

app.use(errorHandler)

export default app
