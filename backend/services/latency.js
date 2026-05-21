import redis from '../db/redis.js'
import { SLA_THRESHOLD } from '../utils/constants.js'

const KEY      = 'latency:samples'
const MAX_SIZE = 1000

const LATENCY_BUCKETS = [
  { label: '0-100ms',    min: 0,    max: 100 },
  { label: '100-300ms',  min: 100,  max: 300 },
  { label: '300-700ms',  min: 300,  max: 700 },
  { label: '700-1000ms', min: 700,  max: SLA_THRESHOLD },
  { label: '>1000ms',    min: SLA_THRESHOLD, max: Infinity },
]

export async function recordLatency(ms) {
  await redis.multi()
    .lpush(KEY, ms)
    .ltrim(KEY, 0, MAX_SIZE - 1)
    .exec()
}

export async function computeStats() {
  const samples = await redis.lrange(KEY, 0, -1)
  if (samples.length === 0) return null

  const sorted = samples
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b)

  if (sorted.length === 0) return null

  const len    = sorted.length
  const slaPass = sorted.filter(ms => ms <= SLA_THRESHOLD).length

  return {
    p50:   sorted[Math.floor(len * 0.50)],
    p95:   sorted[Math.floor(len * 0.95)],
    p99:   sorted[Math.floor(len * 0.99)],
    avg:   Math.round(sorted.reduce((s, n) => s + n, 0) / len),
    min:   sorted[0],
    max:   sorted[len - 1],
    count: len,
    slaPass,
    slaPct: Math.round((slaPass / len) * 100),
    distribution: LATENCY_BUCKETS.map(bucket => {
      const count = sorted.filter(ms => ms >= bucket.min && ms < bucket.max).length
      return {
        label: bucket.label,
        count,
        pct: Math.round((count / len) * 100),
      }
    }),
  }
}
