import { useState, useEffect, useContext } from 'react'
import { SocketContext } from '../context/SocketContext'
import { get } from '../utils/api'

const MAX_VISIBLE_TRADES = 9

function mergeTrades(prev, incoming) {
  const seen = new Set()

  return [...incoming, ...prev]
    .filter(trade => {
      const id = trade.id ?? `${trade.time}-${trade.price}-${trade.qty}`
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
    .slice(0, MAX_VISIBLE_TRADES)
}

export function useTrades(symbol) {
  const [trades, setTrades] = useState([])
  const socket = useContext(SocketContext)

  useEffect(() => {
    setTrades([])
    if (!symbol) return

    let cancelled = false
    let queued = []
    let flushTimer = null

    get(`/api/coins/${symbol}/trades`)
      .then(snapshot => {
        if (!cancelled && Array.isArray(snapshot)) {
          setTrades(snapshot.slice(0, MAX_VISIBLE_TRADES))
        }
      })
      .catch(() => {})

    if (!socket) {
      return () => { cancelled = true }
    }

    function flush() {
      flushTimer = null
      if (cancelled || queued.length === 0) return

      const batch = queued
        .splice(0)
        .sort((a, b) => (b.time || 0) - (a.time || 0))

      setTrades(prev => mergeTrades(prev, batch))
    }

    function onTrade(trade) {
      queued.push(trade)
      if (!flushTimer) flushTimer = setTimeout(flush, 120)
    }

    socket.on(`trade:${symbol}`, onTrade)
    return () => {
      cancelled = true
      if (flushTimer) clearTimeout(flushTimer)
      socket.off(`trade:${symbol}`, onTrade)
    }
  }, [socket, symbol])

  return trades
}
