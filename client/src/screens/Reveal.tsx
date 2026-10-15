import { useEffect, useState, type CSSProperties } from 'react'
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

function matchInfo(diff: number) {
  if (diff === 0) return { label: 'Perfect match', cls: 'perfect' }
  if (diff === 1) return { label: 'Close', cls: 'close' }
  if (diff === 2) return { label: 'Split', cls: 'split' }
  return { label: 'Opposites', cls: 'opposites' }
}

export function Reveal({ session, currentPlayer, socket, categories }: Props) {
  const [p1, p2] = session.players

  const scored = session.currentPrompts.map((pr) => {
    const a = p1 ? getAnswer(session, p1.id, pr.index) : null
    const b = p2 ? getAnswer(session, p2.id, pr.index) : null
    const diff = a != null && b != null ? Math.abs(a - b) : null
    return { pr, a, b, diff }
  })

  const valid = scored.filter((s) => s.diff != null)
  const avgDiff = valid.length > 0 ? valid.reduce((sum, s) => sum + (s.diff as number), 0) / valid.length : 0
  const score = valid.length > 0 ? Math.round(100 * (1 - avgDiff / 4)) : 0

  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(score)
      return
    }
    let raf = 0
    const start = performance.now()
    const duration = 1100
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(score * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [score])

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
        <div className="score-wrap">
          <div className="score-ring" style={{ '--pct': `${display}%` } as CSSProperties}>
            <div className="score-inner">
              <span className="score-value">{display}%</span>
              <span className="score-label">Compatible</span>
            </div>
          </div>
        </div>
        {scored.map(({ pr, a, b, diff }, i) => {
          const rows = [
            { player: p1, value: a, cls: 'p1' },
            { player: p2, value: b, cls: 'p2' }
          ]
          const match = diff != null ? matchInfo(diff) : null
          return (
            <div
              key={pr.index}
              className="comparison-card"
              style={{ animationDelay: `${0.15 + i * 0.08}s` }}
            >
              <div className="comparison-header">
                <span className="comparison-category">{getCategoryName(pr.catId, categories)}</span>
                {match && <span className={`match-badge ${match.cls}`}>{match.label}</span>}
              </div>
              <div className="prompt-text" style={{ fontSize: '0.95rem' }}>{pr.text}</div>
              <div className="comparison-sliders">
                {rows.map(({ player, value, cls }) => {
                  const ratio = value != null ? (value - 1) / 4 : 0
                  const pos = `calc(9px + (100% - 18px) * ${ratio})`
                  return (
                    <div key={player.id} className="comparison-slider-row">
                      <span className="slider-player">{player.name}</span>
                      <div className="slider-track">
                        <div className={`slider-fill ${cls}`} style={{ width: value != null ? pos : '0%' }} />
                        {value != null && (
                          <span className={`slider-thumb ${cls}`} style={{ left: pos }} />
                        )}
                      </div>
                    </div>
                  )
                })}
                <div className="comparison-slider-row comparison-axis">
                  <div className="rating-ticks">
                    <span className="tick-label">Disagree</span>
                    <span className="tick" />
                    <span className="tick" />
                    <span className="tick" />
                    <span className="tick-label">Agree</span>
                  </div>
                </div>
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
