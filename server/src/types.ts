export interface Category {
  id: string
  name: string
}

export interface Prompt {
  index: number
  catId: string
  text: string
}

export interface Player {
  id: string // persistent client-generated player id
  socketId: string | null // current socket connection; null when disconnected
  name: string
  ready: boolean
  submitted: boolean
}

export type SessionState = 'lobby' | 'round' | 'reveal'

export interface Answer {
  playerId: string
  promptIndex: number
  rating: number // 1-5
}

export interface Session {
  code: string
  players: Player[]
  state: SessionState
  roundIndex: number
  usedPromptIndices: number[]
  currentPrompts: Prompt[]
  answers: Answer[]
}
