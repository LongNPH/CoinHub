import Redis from 'ioredis'
import 'dotenv/config'

const redis = new Redis(process.env.REDIS_URL)

redis.on('connect', () => console.log('Redis đã kết nối'))
redis.on('error',   (err) => console.error('Redis lỗi:', err.message))

export default redis