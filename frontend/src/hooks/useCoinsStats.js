import { useState, useEffect } from 'react'
import { get } from '../utils/api'

export function useCoinsStats() {
  const [data, setData] = useState({
    coins: [],
    prices: {},
    loading: true,
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coinsRes, pricesRes] = await Promise.all([
          get('/api/coins'),
          get('/api/coins/latest-prices'),
        ])

        setData({
          coins: coinsRes,
          prices: pricesRes,
          loading: false,
        })
      } catch (err) {
        console.error('Error fetching coins stats:', err)
        setData(prev => ({ ...prev, loading: false }))
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  return data
}
