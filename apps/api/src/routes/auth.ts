import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body)
    const existing = await prisma.user.findUnique({ where: { email: body.email } })
    if (existing) return reply.code(409).send({ error: 'Email already in use' })

    const hash = await bcrypt.hash(body.password, 10)
    const user = await prisma.user.create({
      data: { email: body.email, password: hash, name: body.name },
      select: { id: true, email: true, name: true, createdAt: true },
    })
    const token = app.jwt.sign({ id: user.id, email: user.email })
    return { user, token }
  })

  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body)
    const user = await prisma.user.findUnique({ where: { email: body.email } })
    if (!user) return reply.code(401).send({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(body.password, user.password)
    if (!valid) return reply.code(401).send({ error: 'Invalid credentials' })

    const token = app.jwt.sign({ id: user.id, email: user.email })
    return {
      user: { id: user.id, email: user.email, name: user.name },
      token,
    }
  })
}
