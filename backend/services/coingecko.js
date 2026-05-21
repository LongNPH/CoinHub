import redis from '../db/redis.js'

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'
const HIST_TTL = 60 * 5
const NEWS_REFRESH_INTERVAL = 60 * 5
const NEWS_TTL = NEWS_REFRESH_INTERVAL * 2
const NEWS_LIMIT = 30

const RSS_SOURCES = [
  { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
  { name: 'Decrypt',       url: 'https://decrypt.co/feed' },
  { name: 'CoinDesk',      url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
]

const CG_IDS = {
  BTC:  'bitcoin',
  ETH:  'ethereum',
  BNB:  'binancecoin',
  SOL:  'solana',
  XRP:  'ripple',
  DOGE: 'dogecoin',
  ADA:  'cardano',
  AVAX: 'avalanche-2',
  DOT:  'polkadot',
  LINK: 'chainlink',
}

function cgHeaders() {
  return process.env.COINGECKO_API_KEY
    ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY }
    : {}
}

async function cgFetch(path) {
  const res = await fetch(`${COINGECKO_BASE}${path}`, { headers: cgHeaders() })
  if (!res.ok) throw new Error(`CoinGecko loi: ${res.status}`)
  return res.json()
}

export async function fetchCoinList() {
  const ids = Object.values(CG_IDS).join(',')
  return cgFetch(
    `/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false`
  )
}

export async function fetchHistory(symbol) {
  const cacheKey = `cg:history:${symbol}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  const id = CG_IDS[symbol]
  if (!id) throw new Error(`Khong co CoinGecko ID cho ${symbol}`)

  const data = await cgFetch(
    `/coins/${id}/market_chart?vs_currency=usd&days=1&interval=hourly`
  )

  const formatted = data.prices.map(([ts, price]) => ({
    recorded_at: new Date(ts).toISOString(),
    price,
  }))

  await redis.set(cacheKey, JSON.stringify(formatted), 'EX', HIST_TTL)
  return formatted
}

export async function fetchNews() {
  const cacheKey = 'cg:news'
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  return refreshNewsCache()
}

export async function refreshNewsCache() {
  const items = await fetchRssNews()
  const payload = {
    items: items.slice(0, NEWS_LIMIT),
    total: items.length,
    cachedForSeconds: NEWS_REFRESH_INTERVAL,
    source: 'Public RSS',
    updatedAt: new Date().toISOString(),
  }

  await redis.set('cg:news', JSON.stringify(payload), 'EX', NEWS_TTL)
  return payload
}

export function startNewsCacheRefresh() {
  refreshNewsCache()
    .then(payload => {
      console.log(`News cache da cap nhat: ${payload.items.length} bai`)
    })
    .catch(err => {
      console.error('Cap nhat news cache loi:', err.message)
    })

  return setInterval(() => {
    refreshNewsCache()
      .then(payload => {
        console.log(`News cache da cap nhat: ${payload.items.length} bai`)
      })
      .catch(err => {
        console.error('Cap nhat news cache loi:', err.message)
      })
  }, NEWS_REFRESH_INTERVAL * 1000)
}

async function fetchRssNews() {
  const settled = await Promise.allSettled(
    RSS_SOURCES.map(async source => {
      const res = await fetch(source.url)
      if (!res.ok) throw new Error(`${source.name} RSS loi: ${res.status}`)
      const xml = await res.text()
      return parseRss(xml, source.name)
    })
  )

  return settled
    .flatMap(result => result.status === 'fulfilled' ? result.value : [])
    .filter(item => item.title && item.url)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
}

function parseRss(xml, source) {
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? []
  return items.map(item => {
    const title = cleanText(readTag(item, 'title'))
    const url = cleanText(readTag(item, 'link'))
    const description = cleanText(readTag(item, 'description'))
    const pubDate = cleanText(readTag(item, 'pubDate'))
    const image = readImage(item, description)

    return {
      id: readTag(item, 'guid') || url,
      title,
      description: stripHtml(description).slice(0, 260),
      url,
      image,
      source,
      created_at: toIsoDate(pubDate),
    }
  })
}

function toIsoDate(value) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function readTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match ? unwrapCdata(match[1]) : ''
}

function readImage(item, description) {
  const media = item.match(/<media:content[^>]+url=["']([^"']+)["']/i)
    || item.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)
    || item.match(/<enclosure[^>]+url=["']([^"']+)["']/i)
    || description.match(/<img[^>]+src=["']([^"']+)["']/i)

  return media ? decodeXml(media[1]) : ''
}

function unwrapCdata(value) {
  return String(value).replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '')
}

function cleanText(value) {
  return decodeXml(unwrapCdata(value)).trim()
}

function stripHtml(value) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function decodeXml(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}
