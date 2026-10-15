import { useState, useEffect } from 'react'
import type { Socket } from 'socket.io-client'
import type { PersistedSession } from '../utils/sessionStore'
import { newPlayerId } from '../utils/sessionStore'

interface Props {
  socket: Socket | null
  resume?: PersistedSession | null
}

export function Home({ socket, resume }: Props) {
  const [name, setName] = useState(resume?.name ?? '')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!socket) return
    const onError = (err: { message: string }) => setError(err.message)
    socket.on('error', onError)
    return () => {
      socket.off('error', onError)
    }
  }, [socket])

  const createSession = () => {
    if (!name.trim()) {
      setError('Enter your name')
      return
    }
    setError('')
    socket?.emit('create_session', { name: name.trim(), playerId: newPlayerId() })
  }

  const joinSession = () => {
    if (!name.trim() || !code.trim()) {
      setError('Enter name and code')
      return
    }
    setError('')
    socket?.emit('join_session', { name: name.trim(), code: code.trim().toUpperCase(), playerId: newPlayerId() })
  }

  const resumeSession = () => {
    if (!resume) return
    setError('')
    socket?.emit('rejoin_session', { code: resume.code, playerId: resume.playerId })
  }

  return (
    <div className="container">
      <div className="card">
        <div className="hero">
          <h1 className="title">Are We Compatible?</h1>
        </div>
        {resume && (
          <button className="button ghost" onClick={resumeSession} disabled={!socket}>
            Resume session {resume.code}
          </button>
        )}
        {error && <div className="status">{error}</div>}
        <div className="form-group">
          <label className="label" htmlFor="home-name">Your Name</label>
          <input
            id="home-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            autoComplete="off"
          />
        </div>
        <button className="button" onClick={createSession} disabled={!socket}>
          Create Session
        </button>
        <div className="divider">or</div>
        <div className="form-group">
          <label className="label" htmlFor="home-code">Join Code</label>
          <input
            id="home-code"
            className="input code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD"
            maxLength={4}
            autoComplete="off"
            inputMode="text"
          />
        </div>
        <button className="button secondary" onClick={joinSession} disabled={!socket}>
          Join Session
        </button>
        {!socket && <div className="status">Connecting…</div>}
      </div>
      <div className="footer">2 players · endless rounds · private ratings</div>
    </div>
  )
}