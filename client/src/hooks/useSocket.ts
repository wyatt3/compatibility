import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const s = io(window.location.origin, { path: '/socket.io' })
    setSocket(s)
    s.on('connect', () => setConnected(true))
    s.on('disconnect', () => setConnected(false))
    return () => {
      s.disconnect()
      setSocket(null)
    }
  }, [])

  return { socket, connected }
}
