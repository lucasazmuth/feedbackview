import Fastify from 'fastify'
import cors from '@fastify/cors'
import { prisma } from './lib/prisma'

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
app.get('/tracker.js', async (_request, reply) => {
  const fs = await import('fs')
  const path = await import('path')
  const possiblePaths = [
    path.resolve(__dirname, '../../packages/tracker/dist/tracker.js'),
    path.resolve(__dirname, '../../../packages/tracker/dist/tracker.js'),
  ]
  for (const p of possiblePaths) {
    try {
      const content = fs.readFileSync(p, 'utf-8')
      reply.type('application/javascript')
      return reply.send(content)
    } catch {}
  }
  reply.type('application/javascript')
  return reply.send('// tracker not found')
})

// Fallback: handle requests like /assets/... that come from proxied pages.
// The JS bundle loads images with absolute paths like /assets/image.jpg
// which miss the /proxy/:projectId/ prefix.
// Try Referer first, then fall back to __fv_pid cookie (set when serving HTML).
// The cookie fallback is needed because routerFix uses replaceState to remove
// /proxy/ID from the URL, so Referer no longer contains the project ID.
app.setNotFoundHandler(async (request, reply) => {
  const referer = request.headers.referer || ''
  const refMatch = referer.match(/\/proxy\/([^/]+)/)
  const cookieMatch = (request.headers.cookie || '').match(/__fv_pid=([^;]+)/)
  const projectId = refMatch?.[1] || cookieMatch?.[1]
  if (!projectId) {
    return reply.code(404).send({ error: 'Not found' })
  }
  const targetUrl = await getTargetUrl(projectId)
  if (!targetUrl) {
    return reply.code(404).send({ error: 'Project not found' })
  }

  const base = targetUrl.replace(/\/$/, '')
  const path = request.url.split('?')[0]
  const queryString = request.url.includes('?') ? '?' + request.url.split('?')[1] : ''
  const fullUrl = `${base}${path}${queryString}`

  await createProxyHandler(request, reply, fullUrl, projectId)
})

app.listen({ port: Number(process.env.PORT) || 3002, host: '0.0.0.0' }, (err) => {
  if (err) { app.log.error(err); process.exit(1) }
})
