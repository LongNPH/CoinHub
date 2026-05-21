import { useState, useEffect } from 'react'
import { get } from '../utils/api'

export function useCoinsStats() {
  const [data, setData] = useState({
    coins: [],
    prices: {},
    loading: true,
  })

  useEffect(() => {
    let retryTimer
    let cancelled = false

    const fetchData = async () => {
      try {
        const [coinsRes, pricesRes] = await Promise.all([
          get('/api/coins'),
          get('/api/coins/latest-prices'),
        ])

        if (cancelled) return
        setData({
          coins: coinsRes,
          prices: pricesRes,
          loading: false,
        })
      } catch (err) {
        if (cancelled) return
        console.error('Error fetching coins stats:', err)
        setData(prev => ({ ...prev, loading: false }))
        retryTimer = setTimeout(fetchData, 5000)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => {
      cancelled = true
      clearTimeout(retryTimer)
      clearInterval(interval)
    }
  }, [])

  return data
}
