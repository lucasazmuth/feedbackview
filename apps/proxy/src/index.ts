import Fastify from 'fastify'
import cors from '@fastify/cors'
import { prisma } from './lib/prisma'
import { Transform } from 'stream'
import { createProxyHandler } from './proxy-handler'

const app = Fastify({ logger: true })

app.register(cors, { origin: '*' })

// Cache project targetUrl in memory for performance
const projectCache = new Map<string, { targetUrl: string; expires: number }>()

async function getTargetUrl(projectId: string): Promise<string | null> {
  const cached = projectCache.get(projectId)
  if (cached && cached.expires > Date.now()) return cached.targetUrl

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return null

  projectCache.set(projectId, { targetUrl: project.targetUrl, expires: Date.now() + 60_000 })
  return project.targetUrl
}

app.get('/proxy/:projectId/*', async (request, reply) => {
  const { projectId } = request.params as { projectId: string }
  const wildcard = (request.params as any)['*'] || ''
  const queryString = Object.keys(request.query as object).length
    ? '?' + new URLSearchParams(request.query as Record<string, string>).toString()
    : ''

  const targetUrl = await getTargetUrl(projectId)
  if (!targetUrl) {
    return reply.code(404).send({ error: 'Project not found' })
  }

  const base = targetUrl.replace(/\/$/, '')
  const path = wildcard ? `/${wildcard}` : '/'
  const fullUrl = `${base}${path}${queryString}`

  await createProxyHandler(request, reply, fullUrl, projectId)
})

// Serve tracker.js
app.get('/tracker.js', async (request, reply) => {
  const trackerPath = require.resolve('@feedbackview/tracker/dist/tracker.js').catch?.() ||
    `${__dirname}/../../packages/tracker/dist/tracker.js`
  reply.type('application/javascript')
  return reply.sendFile?.('tracker.js') || reply.send('// tracker placeholder')
})

app.listen({ port: Number(process.env.PORT) || 3002, host: '0.0.0.0' }, (err) => {
  if (err) { app.log.error(err); process.exit(1) }
})
