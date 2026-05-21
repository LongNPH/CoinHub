import { useEffect, useContext } from 'react'
import { SocketContext } from '../context/SocketContext'

export function useLatency() {
  const socket = useContext(SocketContext)

  useEffect(() => {
    if (!socket) return

    function onPrice(data) {
      const ms = Date.now() - data.serverTime
      socket.emit('latency_report', { ms })
    }

    socket.on('price', onPrice)
    return () => socket.off('price', onPrice)
  }, [socket])
}