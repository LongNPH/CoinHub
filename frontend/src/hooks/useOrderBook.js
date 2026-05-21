import { useContext, useEffect, useState } from 'react'
import { SocketContext } from '../context/SocketContext'
import { get } from '../utils/api'

function buildLevels(bestPrice, bestQty, side) {
  if (!bestPrice || !bestQty) return []

  return Array.from({ length: 8 }, (_, index) => {
    const step = index * 0.0004
    const price = side === 'bid'
      ? bestPrice * (1 - step)
      : bestPrice * (1 + step)
    const qty = bestQty * (1 + index * 0.18)

    return {
      price,
      qty: qty.toFixed(4),
    }
  })
}

function normalizeOrderBook(data) {
  if (!data) return { bids: [], asks: [] }

  if (Array.isArray(data.bids) && Array.isArray(data.asks)) {
    return {
      bids: data.bids.slice(0, 8).map(level => ({
        price: Number(level.price),
        qty:   Number(level.qty).toFixed(4),
      })),
      asks: data.asks.slice(0, 8).map(level => ({
        price: Number(level.price),
        qty:   Number(level.qty).toFixed(4),
      })),
    }
  }

  return {
    bids: buildLevels(Number(data.bestBid), Number(data.bidQty), 'bid'),
    asks: buildLevels(Number(data.bestAsk), Number(data.askQty), 'ask'),
  }
}

export function useOrderBook(symbol) {
  const socket = useContext(SocketContext)
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] })

  useEffect(() => {
    if (!symbol) {
      setOrderBook({ bids: [], asks: [] })
      return
    }

    let cancelled = false
    let queued = null
    let flushTimer = null

    setOrderBook({ bids: [], asks: [] })

    get(`/api/coins/${symbol}/orderbook`)
      .then(snapshot => {
        if (!cancelled) setOrderBook(normalizeOrderBook(snapshot))
      })
      .catch(() => {})

    if (!socket) {
      return () => { cancelled = true }
    }

    function flush() {
      flushTimer = null
      if (!cancelled && queued) {
        setOrderBook(normalizeOrderBook(queued))
        queued = null
      }
    }

    function onOrderBook(data) {
      queued = data
      if (!flushTimer) flushTimer = setTimeout(flush, 120)
    }

    socket.on(`orderbook:${symbol}`, onOrderBook)
    return () => {
      cancelled = true
      if (flushTimer) clearTimeout(flushTimer)
      socket.off(`orderbook:${symbol}`, onOrderBook)
    }
  }, [socket, symbol])

  return orderBook
}
