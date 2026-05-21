import { useState, useEffect } from 'react'
import { get } from '../utils/api'

export function useCoins() {
  const [coins,   setCoins]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let retryTimer
    let cancelled = false

    async function fetchCoins() {
      try {
        const data = await get('/api/coins')
        if (cancelled) return
        setCoins(data)
        setError(null)
        setLoading(false)
      } catch (err) {
        if (cancelled) return
        setError(err.message)
        setLoading(false)
        retryTimer = setTimeout(fetchCoins, 5000)
      }
    }

    fetchCoins()

    return () => {
      cancelled = true
      clearTimeout(retryTimer)
    }
  }, [])

  return { coins, loading, error }
}
