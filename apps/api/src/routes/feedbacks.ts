import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { z } from 'zod'
import { uploadToR2, getSignedUrl } from '../plugins/storage'

const createSchema = z.object({
  projectId: z.string(),
  comment: z.string().min(10),
  type: z.enum(['BUG', 'SUGGESTION', 'QUESTION', 'PRAISE']),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  screenshotBase64: z.string().optional(),
  consoleLogs: z.array(z.any()).optional(),
  networkLogs: z.array(z.any()).optional(),
  replayEvents: z.array(z.any()).optional(),
  pageUrl: z.string().optional(),
  userAgent: z.string().optional(),
})

export async function feedbackRoutes(app: FastifyInstance) {
  // Public: submit feedback (anyone with project link)
  app.post('/', async (request, reply) => {
    const body = createSchema.parse(request.body)
    const project = await prisma.project.findUnique({ where: { id: body.projectId } })
    if (!project) return reply.code(404).send({ error: 'Project not found' })

    let screenshotUrl: string | undefined
    let replayUrl: string | undefined

    if (body.screenshotBase64) {
      const buffer = Buffer.from(body.screenshotBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
      screenshotUrl = await uploadToR2(buffer, `screenshots/${body.projectId}/${Date.now()}.png`, 'image/png')
    }

    if (body.replayEvents?.length) {
      const buffer = Buffer.from(JSON.stringify(body.replayEvents))
      replayUrl = await uploadToR2(buffer, `replays/${body.projectId}/${Date.now()}.json`, 'application/json')
    }

    const feedback = await prisma.feedback.create({
      data: {
        projectId: body.projectId,
        comment: body.comment,
        type: body.type,
        severity: body.severity,
        screenshotUrl,
        replayUrl,
        consoleLogs: body.consoleLogs as any,
        networkLogs: body.networkLogs as any,
        pageUrl: body.pageUrl,
        userAgent: body.userAgent || request.headers['user-agent'],
      },
    })

    // Emit WebSocket notification
    ;(app as any).wsClients?.get(body.projectId)?.forEach((ws: any) => {
      ws.send(JSON.stringify({ type: 'NEW_FEEDBACK', feedback }))
    })

    return reply.code(201).send(feedback)
  })

  // Protected routes
  app.get('/:id', { onRequest: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: { project: { select: { ownerId: true } } },
    })
    if (!feedback) return reply.code(404).send({ error: 'Not found' })
    const user = request.user as { id: string }
    if (feedback.project.ownerId !== user.id) return reply.code(403).send({ error: 'Forbidden' })
    return feedback
  })

  app.patch('/:id/status', { onRequest: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { status } = request.body as { status: string }
    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: { project: { select: { ownerId: true } } },
    })
    if (!feedback) return reply.code(404).send({ error: 'Not found' })
    const user = request.user as { id: string }
    if (feedback.project.ownerId !== user.id) return reply.code(403).send({ error: 'Forbidden' })
    return prisma.feedback.update({ where: { id }, data: { status: status as any } })
  })
}
