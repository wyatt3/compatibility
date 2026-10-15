export interface PersistedSession {
  code: string
  playerId: string
  name: string
}

const TAB_KEY = 'awc.session'
const RESUME_KEY = 'awc.resume'

function readTab(): PersistedSession | null {
  try {
    const raw = sessionStorage.getItem(TAB_KEY)
    return raw ? (JSON.parse(raw) as PersistedSession) : null
  } catch {
    return null
  }
}

function readResume(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY)
    return raw ? (JSON.parse(raw) as PersistedSession) : null
  } catch {
    return null
  }
}

export const sessionStore = {
  getTabSession: readTab,
  getResumeSession: readResume,

  saveTabSession(session: PersistedSession): void {
    try {
      sessionStorage.setItem(TAB_KEY, JSON.stringify(session))
    } catch {
      /* ignore storage errors */
    }
    try {
      localStorage.setItem(RESUME_KEY, JSON.stringify(session))
    } catch {
      /* ignore storage errors */
    }
  },

  clearTabSession(): void {
    try {
      sessionStorage.removeItem(TAB_KEY)
    } catch {
      /* ignore */
    }
  },

  clearResumeSession(): void {
    try {
      localStorage.removeItem(RESUME_KEY)
    } catch {
      /* ignore */
    }
  }
}

export function newPlayerId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'p-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}