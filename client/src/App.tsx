import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Home } from './screens/Home'
import { Lobby } from './screens/Lobby'
import { Round } from './screens/Round'
import { Reveal } from './screens/Reveal'
import { useSocket } from './hooks/useSocket'
import { sessionStore } from './utils/sessionStore'
import type { Session, Player, Category } from './types'

export default function App() {
  const { socket } = useSocket()
  const [session, setSession] = useState<Session | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [restoring, setRestoring] = useState(() => !!sessionStore.getTabSession())
  const sessionRef = useRef<Session | null>(null)

  useEffect(() => {
    fetch(window.location.origin + '/api/categories')
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {})
  }, [])

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  // Never leave the user stuck on the splash if the server is unreachable
  useEffect(() => {
    if (!restoring) return
    const t = setTimeout(() => setRestoring(false), 4000)
    return () => clearTimeout(t)
  }, [restoring])

  useEffect(() => {
    if (!socket) return

    const onConnect = () => {
      const tab = sessionStore.getTabSession()
      if (!tab) return
      if (!sessionRef.current) setRestoring(true)
      socket.emit('rejoin_session', { code: tab.code, playerId: tab.playerId })
    }

    const join = (data: { session: Session; player: Player }) => {
      setSession(data.session)
      setPlayerId(data.player.id)
      setRestoring(false)
      sessionStore.saveTabSession({
        code: data.session.code,
        playerId: data.player.id,
        name: data.player.name
      })
    }

    const update = (data: { session: Session }) => setSession(data.session)

    const onError = (err: { message: string }) => {
      if (err.message === 'Session not found' || err.message === 'Player not in this session') {
        sessionStore.clearTabSession()
        sessionStore.clearResumeSession()
        setSession(null)
        setPlayerId(null)
        setRestoring(false)
      }
    }

    socket.on('connect', onConnect)
    socket.on('session_created', join)
    socket.on('session_joined', join)
    socket.on('session_rejoined', join)
    socket.on('player_joined', update)
    socket.on('player_left', update)
    socket.on('round_started', update)
    socket.on('answers_submitted', update)
    socket.on('player_ready', update)
    socket.on('error', onError)

    if (socket.connected) onConnect()

    return () => {
      socket.off('connect', onConnect)
      socket.off('session_created', join)
      socket.off('session_joined', join)
      socket.off('session_rejoined', join)
      socket.off('player_joined', update)
      socket.off('player_left', update)
      socket.off('round_started', update)
      socket.off('answers_submitted', update)
      socket.off('player_ready', update)
      socket.off('error', onError)
    }
  }, [socket])

  const currentPlayer = session?.players.find((p) => p.id === playerId) ?? null

  let screen: ReactNode = null
  let viewKey = 'home'

  if (restoring) {
    viewKey = 'restoring'
    screen = (
      <div className="container">
        <div className="card">
          <p className="status">Reconnecting to your session…</p>
        </div>
      </div>
    )
  } else if (!session || !currentPlayer) {
    const resume = sessionStore.getResumeSession()
    screen = <Home socket={socket} resume={resume} />
  } else if (session.state === 'lobby') {
    viewKey = 'lobby'
    screen = <Lobby session={session} currentPlayer={currentPlayer} socket={socket} />
  } else if (session.state === 'round') {
    viewKey = `round-${session.roundIndex}`
    screen = <Round session={session} currentPlayer={currentPlayer} socket={socket} categories={categories} />
  } else if (session.state === 'reveal') {
    viewKey = `reveal-${session.roundIndex}`
    screen = <Reveal session={session} currentPlayer={currentPlayer} socket={socket} categories={categories} />
  }

  return (
    <div className="view" key={viewKey}>
      {screen}
    </div>
  )
}