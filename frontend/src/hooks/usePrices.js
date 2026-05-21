import { useState, useEffect, useContext } from 'react'
import { SocketContext } from '../context/SocketContext'

export function usePrices() {
  const [prices, setPrices] = useState({})
  const socket = useContext(SocketContext)

  useEffect(() => {
    if (!socket) return

    function onPrice(data) {
      setPrices(prev => ({
        ...prev,
        [data.symbol]: data,
      }))
    }

    socket.on('price', onPrice)
    return () => socket.off('price', onPrice)
  }, [socket])

  return prices
}