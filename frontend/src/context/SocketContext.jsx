import { createContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'

export const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    const s = io(import.meta.env.VITE_WS_URL || '', {
      withCredentials: true,
    })
    s.on('connect',    ()    => console.log('Socket.IO đã kết nối'))
    s.on('disconnect', ()    => console.log('Socket.IO ngắt kết nối'))
    s.on('connect_error', (err) => console.error('Socket.IO lỗi:', err.message))

    setSocket(s)
    return () => s.disconnect()
  }, [])

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  )
}