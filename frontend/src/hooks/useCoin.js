import { useState, useEffect } from 'react'
import { get } from '../utils/api'

export function useCoins() {
  const [coins,   setCoins]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    get('/api/coins')
      .then(data  => setCoins(data))
      .catch(err  => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return { coins, loading, error }
}
