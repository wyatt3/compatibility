import type { Session, Player, Prompt, Category, Answer } from './types.js'

export class GameStore {
  private sessions = new Map<string, Session>()
  private prompts: Prompt[]
  private categories: Category[]

  constructor(prompts: Prompt[], categories: Category[]) {
    this.prompts = prompts
    this.categories = categories
  }

  generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  createSession(): Session {
    let code: string
    do {
      code = this.generateCode()
    } while (this.sessions.has(code))
    const session: Session = {
      code,
      players: [],
      state: 'lobby',
      roundIndex: 0,
      usedPromptIds: [],
      currentPrompts: [],
      answers: []
    }
    this.sessions.set(code, session)
    return session
  }

  getSession(code: string): Session | undefined {
    return this.sessions.get(code)
  }

  getSessionCount(): number {
    return this.sessions.size
  }

  getPromptCounts(): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const c of this.categories) {
      counts[c.id] = this.prompts.filter((p) => p.catId === c.id).length
    }
    return counts
  }

  reconnectPlayer(code: string, socketId: string, playerId: string): Player {
    const session = this.getSession(code)
    if (!session) {
      throw new Error('Session not found')
    }
    const player = session.players.find((p) => p.id === playerId)
    if (!player) {
      throw new Error('Player not in this session')
    }
    player.socketId = socketId
    return player
  }

  addPlayer(code: string, socketId: string, name: string, playerId: string): Player {
    const session = this.getSession(code)
    if (!session) {
      throw new Error('Session not found')
    }
    const existing = session.players.find((p) => p.id === playerId)
    if (existing) {
      existing.socketId = socketId
      existing.name = name
      return existing
    }
    if (session.players.length >= 2) {
      const free = session.players.find((p) => p.socketId === null)
      if (free) {
        session.players.splice(session.players.indexOf(free), 1)
      } else {
        throw new Error('Session is full')
      }
    }
    const player: Player = {
      id: playerId,
      socketId,
      name,
      ready: false,
      submitted: false
    }
    session.players.push(player)
    return player
  }

  disconnectPlayer(socketId: string): { session: Session; playerId: string } | undefined {
    for (const session of this.sessions.values()) {
      const player = session.players.find((p) => p.socketId === socketId)
      if (player) {
        player.socketId = null
        return { session, playerId: player.id }
      }
    }
    return undefined
  }

  startRound(code: string): Session {
    const session = this.getSession(code)
    if (!session) {
      throw new Error('Session not found')
    }
    session.players.forEach((p) => {
      p.ready = false
      p.submitted = false
    })
    session.answers = []
    session.currentPrompts = []
    session.state = 'round'
    session.roundIndex += 1

    const used = new Set(session.usedPromptIds)
    for (const cat of this.categories) {
      const catPrompts = this.prompts.filter((p) => p.catId === cat.id && !used.has(p.id))
      let selected: Prompt | undefined
      if (catPrompts.length > 0) {
        selected = catPrompts[Math.floor(Math.random() * catPrompts.length)]
      } else {
        // Reset used prompts for this category if exhausted
        const allCat = this.prompts.filter((p) => p.catId === cat.id)
        if (allCat.length > 0) {
          selected = allCat[Math.floor(Math.random() * allCat.length)]
          // remove old used from this cat to allow cycling
          session.usedPromptIds = session.usedPromptIds.filter((id) => {
            const pr = this.prompts.find((x) => x.id === id)
            return pr && pr.catId !== cat.id
          })
          used.clear()
          for (const id of session.usedPromptIds) used.add(id)
        }
      }
      if (selected) {
        session.currentPrompts.push(selected)
        session.usedPromptIds.push(selected.id)
      }
    }
    return session
  }

  submitAnswers(code: string, socketId: string, answers: Array<{ promptId: string; rating: number }>): Session {
    const session = this.getSession(code)
    if (!session) {
      throw new Error('Session not found')
    }
    const player = session.players.find((p) => p.socketId === socketId)
    if (!player) {
      throw new Error('Player not found')
    }
    // remove previous answers for this player
    session.answers = session.answers.filter((a) => a.playerId !== player.id)
    for (const a of answers) {
      session.answers.push({ playerId: player.id, promptId: a.promptId, rating: a.rating })
    }
    player.submitted = true
    if (session.players.every((p) => p.submitted)) {
      session.state = 'reveal'
    }
    return session
  }

  markReady(code: string, socketId: string): Session {
    const session = this.getSession(code)
    if (!session) {
      throw new Error('Session not found')
    }
    const player = session.players.find((p) => p.socketId === socketId)
    if (player) {
      player.ready = true
    }
    return session
  }

  bothReady(session: Session): boolean {
    return (
      session.players.length === 2 &&
      session.players.every((p) => p.ready && p.socketId !== null)
    )
  }
}