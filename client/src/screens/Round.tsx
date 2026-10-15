import { useState } from 'react'
import type { Session, Player, Prompt, Category } from '../types'
import type { Socket } from 'socket.io-client'
import { Header } from '../components/Header'

interface Props {
  session: Session
  currentPlayer: Player
  socket: Socket | null
  categories: Category[]
}

export function Round({ session, currentPlayer, socket, categories }: Props) {
  const [ratings, setRatings] = useState<Record<string, number>>(() =>
    Object.fromEntries(session.currentPrompts.map((p) => [p.id, 3]))
  )
  const allRated = session.currentPrompts.every((p) => ratings[p.id] !== undefined)

  const setRating = (promptId: string, rating: number) => {
    setRatings((prev) => ({ ...prev, [promptId]: rating }))
  }

  const submit = () => {
    if (!allRated) return
    const answers = session.currentPrompts.map((p) => ({
      promptId: p.id,
      rating: ratings[p.id]
    }))
    socket?.emit('submit_answers', { code: session.code, answers })
  }

  if (currentPlayer.submitted) {
    return (
      <div className="container">
        <Header code={session.code} />
        <div className="card">
          <div className="status">Waiting for the other player…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <Header code={session.code} />
      <div className="card">
        {session.currentPrompts.map((p: Prompt) => (
          <div key={p.id} className="prompt-card">
            <div className="category-name">{categories.find((c) => c.id === p.catId)?.name ?? p.catId}</div>
            <div className="prompt-text">{p.text}</div>
            <div className="rating-slider">
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={ratings[p.id]}
                onChange={(e) => setRating(p.id, Number(e.target.value))}
              />
              <div className="rating-ticks">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className="tick" />
                ))}
              </div>
            </div>
          </div>
        ))}
        <button className="button" onClick={submit} disabled={!allRated}>
          Submit Answers
        </button>
      </div>
    </div>
  )
}