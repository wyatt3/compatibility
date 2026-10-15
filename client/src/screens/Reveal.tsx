import type { Session, Player } from '../types'
import type { Socket } from 'socket.io-client'
import { Header } from '../components/Header'

interface Props {
  session: Session
  currentPlayer: Player
  socket: Socket | null
  categories: Array<{ id: string; name: string }>
}

function getCategoryName(catId: string, categories: Array<{ id: string; name: string }>) {
  const c = categories.find((x) => x.id === catId)
  return c?.name || catId
}

function getAnswer(session: Session, playerId: string, promptIndex: number): number | null {
  const a = session.answers.find((x) => x.playerId === playerId && x.promptIndex === promptIndex)
  return a ? a.rating : null
}

export function Reveal({ session, currentPlayer, socket, categories }: Props) {
  const [p1, p2] = session.players
  if (!p1 || !p2) return null

  const markReady = () => {
    socket?.emit('ready_next', { code: session.code })
  }

  const bothReady = p1.ready && p2.ready

  return (
    <div className="container">
      <Header code={session.code} />
      <div className="card">
        <h1 className="title">Results</h1>
        {session.currentPrompts.map((pr) => {
          const a = getAnswer(session, p1.id, pr.index)
          const b = getAnswer(session, p2.id, pr.index)
          const rows = [
            { player: p1, value: a, cls: 'p1' },
            { player: p2, value: b, cls: 'p2' }
          ]
          return (
            <div key={pr.index} className="comparison-card">
              <div className="comparison-header">
                {getCategoryName(pr.catId, categories)}
              </div>
              <div className="prompt-text" style={{ fontSize: '0.95rem' }}>{pr.text}</div>
              <div className="comparison-sliders">
                {rows.map(({ player, value, cls }) => {
                  const pct = value != null ? ((value - 1) / 4) * 100 : 0
                  return (
                    <div key={player.id} className="comparison-slider-row">
                      <span className="slider-player">{player.name}</span>
                      <div className="slider-track">
                        <div className={`slider-fill ${cls}`} style={{ width: `${pct}%` }} />
                        {value != null && (
                          <span className={`slider-thumb ${cls}`} style={{ left: `${pct}%` }} />
                        )}
                      </div>
                      <span className="slider-value">{value ?? '-'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {bothReady ? (
          <div className="status">Starting next round...</div>
        ) : currentPlayer.ready ? (
          <div className="status">Waiting for the other player to be ready...</div>
        ) : (
          <button className="button" onClick={markReady}>
            Ready for next round
          </button>
        )}
      </div>
    </div>
  )
}
