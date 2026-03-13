import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  targetUrl: z.string().url(),
})

export async function projectRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  app.get('/', async (request) => {
    const user = request.user as { id: string }
    return prisma.project.findMany({
      where: { ownerId: user.id },
      include: { _count: { select: { feedbacks: true } } },
      orderBy: { createdAt: 'desc' },
    })
  })

  app.post('/', async (request, reply) => {
    const user = request.user as { id: string }
    const body = createSchema.parse(request.body)
    const project = await prisma.project.create({
      data: { ...body, ownerId: user.id },
    })
    return reply.code(201).send(project)
  })

  app.get('/:id', async (request, reply) => {
    const user = request.user as { id: string }
    const { id } = request.params as { id: string }
    const project = await prisma.project.findFirst({
      where: { id, ownerId: user.id },
      include: { _count: { select: { feedbacks: true } } },
    })
    if (!project) return reply.code(404).send({ error: 'Project not found' })
    return project
  })

  app.patch('/:id', async (request, reply) => {
    const user = request.user as { id: string }
    const { id } = request.params as { id: string }
    const body = createSchema.partial().parse(request.body)
    const project = await prisma.project.findFirst({ where: { id, ownerId: user.id } })
    if (!project) return reply.code(404).send({ error: 'Not found' })
    return prisma.project.update({ where: { id }, data: body })
  })

  app.delete('/:id', async (request, reply) => {
    const user = request.user as { id: string }
    const { id } = request.params as { id: string }
    const project = await prisma.project.findFirst({ where: { id, ownerId: user.id } })
    if (!project) return reply.code(404).send({ error: 'Not found' })
    await prisma.project.delete({ where: { id } })
    return reply.code(204).send()
  })

  app.get('/:id/feedbacks', async (request, reply) => {
    const user = request.user as { id: string }
    const { id } = request.params as { id: string }
    const { type, severity, status } = request.query as Record<string, string>

    const project = await prisma.project.findFirst({ where: { id, ownerId: user.id } })
    if (!project) return reply.code(404).send({ error: 'Not found' })

    return prisma.feedback.findMany({
      where: {
        projectId: id,
        ...(type ? { type: type as any } : {}),
        ...(severity ? { severity: severity as any } : {}),
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
  })
}
