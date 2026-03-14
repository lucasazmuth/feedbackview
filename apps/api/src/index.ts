import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { ZodError } from 'zod'
import { authRoutes } from './routes/auth'
import { projectRoutes } from './routes/projects'
import { feedbackRoutes } from './routes/feedbacks'

const app = Fastify({ logger: true })

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ZodError) {
    return reply.code(400).send({ error: error.issues[0]?.message || 'Validation error', issues: error.issues })
  }
  app.log.error(error)
  reply.code(error.statusCode || 500).send({ error: error.message || 'Internal Server Error' })
})

app.register(cors, {
  origin: (origin, cb) => {
    const allowed = process.env.FRONTEND_URL || 'http://localhost:3000'
    // Allow main domain, Vercel preview deploys, and no-origin requests
    if (!origin || origin === allowed || origin.endsWith('.vercel.app')) {
      cb(null, true)
    } else {
      cb(null, false)
    }
  },
  credentials: true,
})

app.register(jwt, {
  secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
})

app.register(authRoutes, { prefix: '/api/auth' })
app.register(projectRoutes, { prefix: '/api/projects' })
app.register(feedbackRoutes, { prefix: '/api/feedbacks' })

app.get('/health', async () => ({ status: 'ok' }))

app.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' }, (err) => {
  if (err) { app.log.error(err); process.exit(1) }
})
