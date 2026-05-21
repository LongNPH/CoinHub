import { useState, useEffect, useCallback } from 'react'
import { get, post, del } from '../utils/api'
import { useAuth }        from './useAuth'

export function useWatchlist() {
  const { user }                        = useAuth()
  const [watchlist, setWatchlist]       = useState([])
  const [loading, setLoading]           = useState(false)

  const fetchWatchlist = useCallback(async () => {
    if (!user) { setWatchlist([]); return }
    setLoading(true)
    try {
      const data = await get('/api/watchlist')
      setWatchlist(data)
    } catch {
      setWatchlist([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchWatchlist() }, [fetchWatchlist])

  function isWatching(symbol) {
    return watchlist.some(w => w.symbol === symbol)
  }

  async function upsertWatch(symbol, buyAlert = 0, sellAlert = 0) {
    await post('/api/watchlist', { symbol, buyAlert, sellAlert })
    await fetchWatchlist()
  }

  async function removeWatch(symbol) {
    await del(`/api/watchlist/${symbol}`)
    await fetchWatchlist()
  }


  function getWatch(symbol) {
    return watchlist.find(w => w.symbol === symbol) || null
  }

  return {
    watchlist,
    loading,
    isWatching,
    upsertWatch,
    removeWatch,
    getWatch,
  }
}