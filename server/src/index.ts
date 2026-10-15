import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { GameStore } from './store.js'
import type { Session, Prompt, Category } from './types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 3000
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  }
})

app.use(cors({ origin: CORS_ORIGIN, credentials: true }))
app.use(express.json())

const dataPath = path.resolve(__dirname, '../data/prompts.json')
const data = JSON.parse(readFileSync(dataPath, 'utf-8')) as {
  categories: Category[]
  prompts: Array<{ catId: string; text: string }>
}

const prompts: Prompt[] = data.prompts.map((p, index) => ({ index, ...p }))

const store = new GameStore(prompts, data.categories)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', sessions: store.getSessionCount() })
})

app.get('/api/categories', (_req, res) => {
  res.json(data.categories)
})

app.get('/api/prompts/count', (_req, res) => {
  res.json({ total: data.prompts.length, byCategory: store.getPromptCounts() })
})

io.on('connection', (socket) => {
  socket.on('create_session', (payload: { name: string; playerId: string }) => {
    const { name, playerId } = payload
    if (!name || name.trim().length === 0) {
      socket.emit('error', { message: 'Name is required' })
      return
    }
    if (!playerId) {
      socket.emit('error', { message: 'Player id is required' })
      return
    }
    const session = store.createSession()
    const player = store.addPlayer(session.code, socket.id, name.trim(), playerId)
    socket.join(session.code)
    socket.emit('session_created', { session, player })
  })

  socket.on('join_session', (payload: { code: string; name: string; playerId: string }) => {
    const { code, name, playerId } = payload
    if (!code || !name || name.trim().length === 0) {
      socket.emit('error', { message: 'Code and name are required' })
      return
    }
    if (!playerId) {
      socket.emit('error', { message: 'Player id is required' })
      return
    }
    const session = store.getSession(code.toUpperCase())
    if (!session) {
      socket.emit('error', { message: 'Session not found' })
      return
    }
    try {
      const player = store.addPlayer(session.code, socket.id, name.trim(), playerId)
      socket.join(session.code)
      socket.emit('session_joined', { session, player })
      socket.to(session.code).emit('player_joined', { session })
    } catch (e) {
      socket.emit('error', { message: (e as Error).message })
    }
  })

  socket.on('rejoin_session', (payload: { code: string; playerId: string }) => {
    const { code, playerId } = payload
    if (!code || !playerId) {
      socket.emit('error', { message: 'Code and player id are required' })
      return
    }
    const session = store.getSession(code.toUpperCase())
    if (!session) {
      socket.emit('error', { message: 'Session not found' })
      return
    }
    if (!session.players.some((p) => p.id === playerId)) {
      socket.emit('error', { message: 'Player not in this session' })
      return
    }
    const player = store.reconnectPlayer(session.code, socket.id, playerId)
    socket.join(session.code)
    socket.emit('session_rejoined', { session, player })
    socket.to(session.code).emit('player_joined', { session })
  })

  socket.on('start_round', (payload: { code: string }) => {
    const { code } = payload
    const session = store.getSession(code.toUpperCase())
    if (!session) {
      socket.emit('error', { message: 'Session not found' })
      return
    }
    if (session.players.length < 2 || !session.players.every((p) => p.socketId !== null)) {
      socket.emit('error', { message: 'Need 2 connected players to start' })
      return
    }
    const updated = store.startRound(session.code)
    io.to(session.code).emit('round_started', { session: updated })
  })

  socket.on('submit_answers', (payload: { code: string; answers: Array<{ promptIndex: number; rating: number }> }) => {
    const { code, answers } = payload
    const session = store.getSession(code.toUpperCase())
    if (!session) {
      socket.emit('error', { message: 'Session not found' })
      return
    }
    // validate ratings 1-5
    for (const a of answers || []) {
      if (a.rating < 1 || a.rating > 5 || !Number.isInteger(a.rating)) {
        socket.emit('error', { message: 'Ratings must be integers between 1 and 5' })
        return
      }
    }
    if (session.state !== 'round') {
      socket.emit('error', { message: 'No active round to submit' })
      return
    }
    const updated = store.submitAnswers(session.code, socket.id, answers || [])
    io.to(session.code).emit('answers_submitted', { session: updated })
  })

  socket.on('ready_next', (payload: { code: string }) => {
    const { code } = payload
    const session = store.getSession(code.toUpperCase())
    if (!session) {
      socket.emit('error', { message: 'Session not found' })
      return
    }
    const updated = store.markReady(session.code, socket.id)
    io.to(session.code).emit('player_ready', { session: updated })
    if (store.bothReady(updated)) {
      const next = store.startRound(session.code)
      io.to(session.code).emit('round_started', { session: next })
    }
  })

  socket.on('disconnect', () => {
    const result = store.disconnectPlayer(socket.id)
    if (result) {
      io.to(result.session.code).emit('player_left', {
        session: result.session,
        playerId: result.playerId
      })
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
