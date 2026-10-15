import type { Session, Player } from '../types'
import type { Socket } from 'socket.io-client'
import { Header } from '../components/Header'

interface Props {
  session: Session
  currentPlayer: Player
  socket: Socket | null
}

export function Lobby({ session, currentPlayer, socket }: Props) {
  const start = () => {
    socket?.emit('start_round', { code: session.code })
  }

  const { players } = session
  const connectedCount = players.filter((p) => p.socketId !== null).length

  return (
    <div className="container">
      <Header code={session.code} />
      <div className="card">
        <h1 className="title">Lobby</h1>
        <div className="code-display">{session.code}</div>
        <div className="section-label">
          Players <span className="count-pill">{connectedCount}/2</span>
        </div>
        <ul className="player-list">
          {players.map((p) => (
            <li key={p.id} className="player-item">
              <span>{p.name} {p.id === currentPlayer.id && <em>(you)</em>}</span>
              <span className={p.socketId !== null ? 'online-dot' : 'online-dot offline'} aria-label={p.socketId !== null ? 'online' : 'offline'} />
            </li>
          ))}
        </ul>
        {connectedCount < 2 && (
          <div className="status">Waiting for the other player to connect…</div>
        )}
        {connectedCount === 2 && (
          <button className="button" onClick={start}>
            Start Round
          </button>
        )}
      </div>
    </div>
  )
}