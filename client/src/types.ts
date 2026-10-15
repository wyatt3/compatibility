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
  id: string
  socketId: string | null
  name: string
  ready: boolean
  submitted: boolean
}

export type SessionState = 'lobby' | 'round' | 'reveal'

export interface Answer {
  playerId: string
  promptIndex: number
  rating: number
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
