export interface Category {
  id: string
  name: string
}

export interface Prompt {
  id: string
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
  promptId: string
  rating: number
}

export interface Session {
  code: string
  players: Player[]
  state: SessionState
  roundIndex: number
  usedPromptIds: string[]
  currentPrompts: Prompt[]
  answers: Answer[]
}
