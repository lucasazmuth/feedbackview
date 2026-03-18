import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logActivity } from '@/lib/activity-log'
import { normalizeDomain } from '@/lib/url-utils'

// Increase body size limit (default 4.5MB is too small for screenshot + rrweb events)
export const maxDuration = 30

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Use service role for public feedback submissions (no user auth required)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function corsJson(body: any, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS })
}

// ─── IP-based rate limiting (in-memory, 10 requests/minute per IP) ──────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60_000 // 1 minute
const RATE_LIMIT_MAX = 10

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip)
  }
}, 300_000)

export async function POST(req: NextRequest) {
  try {
    // Rate limit check
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
    if (isRateLimited(ip)) {
      return corsJson({ error: 'Muitas requisições. Tente novamente em 1 minuto.' }, 429)
    }

    const data = await req.json()

    if (!data.projectId || !data.comment || !data.type) {
      return corsJson({ error: 'projectId, comment, and type are required' }, 400)
    }

    if (data.comment.trim().length < 10) {
      return corsJson({ error: 'Description must be at least 10 characters' }, 400)
    }

    // Verify project exists and get organization info + owner
    const { data: project, error: projectError } = await supabase
      .from('Project')
      .select('id, organizationId, ownerId, name, targetUrl, embedPaused')
      .eq('id', data.projectId)
      .single()

    if (projectError || !project) {
      return corsJson({ error: 'Project not found' }, 404)
    }

    // Origin validation
    const origin = req.headers.get('origin') || req.headers.get('referer') || ''
    if (origin && project.targetUrl) {
      const originDomain = normalizeDomain(origin)
      const projectDomain = normalizeDomain(project.targetUrl)
      if (originDomain !== projectDomain) {
        // Allow localhost in development mode
        const isDev = process.env.NODE_ENV === 'development'
        const isLocalhost = originDomain === 'localhost' || originDomain === '127.0.0.1'
        // Allow requests from own app (proxy/shared URL mode)
        const isOwnApp = origin.includes('feedbackview-web.vercel.app') || origin.includes('reportbug.pro') || origin.includes('buug.io')
        if (!(isDev && isLocalhost) && !isOwnApp) {
          return corsJson({ error: 'Site não autorizado.' }, 403)
        }
      }
    }

    // Paused check
    if (project.embedPaused) {
      return corsJson({ error: 'Widget pausado.' }, 403)
    }

    // Check report limits if project has an organization
    if (project.organizationId) {
      const { data: org } = await supabase
        .from('Organization')
        .select('maxReportsPerMonth, plan')
        .eq('id', project.organizationId)
        .single()

      if (org && org.maxReportsPerMonth > 0) {
        const isLifetime = org.plan === 'FREE'

        // Get all project IDs in this organization
        const { data: orgProjects } = await supabase
          .from('Project')
          .select('id')
          .eq('organizationId', project.organizationId)

        const projectIds = orgProjects?.map((p: any) => p.id) || []

        if (projectIds.length > 0) {
          let reportsQuery = supabase
            .from('Feedback')
            .select('id', { count: 'exact', head: true })
            .in('projectId', projectIds)

          if (!isLifetime) {
            const startOfMonth = new Date()
            startOfMonth.setDate(1)
            startOfMonth.setHours(0, 0, 0, 0)
            reportsQuery = reportsQuery.gte('createdAt', startOfMonth.toISOString())
          }

          const { count } = await reportsQuery

          if (count !== null && count >= org.maxReportsPerMonth) {
            const periodLabel = isLifetime ? '' : '/mês'
            return corsJson({
              error: `Limite de ${org.maxReportsPerMonth} reports${periodLabel} atingido. Faça upgrade do plano.`,
            }, 429)
          }
        }
      }
    }

    // Upload screenshot if provided
    let screenshotUrl: string | null = null
    if (data.screenshotBase64) {
      try {
        const base64Data = data.screenshotBase64.split(',')[1]
        const byteString = atob(base64Data)
        const bytes = new Uint8Array(byteString.length)
        for (let i = 0; i < byteString.length; i++) {
          bytes[i] = byteString.charCodeAt(i)
        }
        const fileName = `${data.projectId}/${Date.now()}.jpg`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('feedbacks')
          .upload(fileName, bytes, { contentType: 'image/jpeg' })

        if (!uploadError && uploadData) {
          const {
            data: { publicUrl },
          } = supabase.storage.from('feedbacks').getPublicUrl(uploadData.path)
          screenshotUrl = publicUrl
        }
      } catch {
        // Screenshot upload failed, continue without it
      }
    }

    // Upload attachments if provided
    const attachmentUrls: string[] = []
    if (data.attachments && Array.isArray(data.attachments)) {
      for (const att of data.attachments.slice(0, 5)) {
        try {
          const base64Data = att.data.split(',')[1]
          const byteString = atob(base64Data)
          const bytes = new Uint8Array(byteString.length)
          for (let i = 0; i < byteString.length; i++) {
            bytes[i] = byteString.charCodeAt(i)
          }
          const ext = att.name?.split('.').pop() || 'bin'
          const fileName = `${data.projectId}/attachments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('feedbacks')
            .upload(fileName, bytes, { contentType: att.type || 'application/octet-stream' })

          if (!uploadError && uploadData) {
            const { data: { publicUrl } } = supabase.storage.from('feedbacks').getPublicUrl(uploadData.path)
            attachmentUrls.push(publicUrl)
          }
        } catch {
          // Attachment upload failed, continue
        }
      }
    }

    // Insert feedback
    const feedbackId = crypto.randomUUID()
    const { error: insertError } = await supabase.from('Feedback').insert({
      id: feedbackId,
      projectId: data.projectId,
      title: data.title?.trim() || null,
      comment: data.comment.trim(),
      type: data.type,
      severity: data.severity || null,
      screenshotUrl,
      consoleLogs: data.consoleLogs || null,
      networkLogs: data.networkLogs || null,
      pageUrl: data.pageUrl || null,
      userAgent: data.userAgent || null,
      metadata: (() => {
        const meta: any = {}
        if (data.rrwebEvents?.length > 0) meta.rrwebEvents = data.rrwebEvents
        if (data.source) meta.source = data.source
        else meta.source = 'embed'
        if (data.viewport) meta.viewport = data.viewport
        // Bug-specific metadata from client
        if (data.metadata?.stepsToReproduce) meta.stepsToReproduce = data.metadata.stepsToReproduce
        if (data.metadata?.expectedResult) meta.expectedResult = data.metadata.expectedResult
        if (data.metadata?.actualResult) meta.actualResult = data.metadata.actualResult
        // Enhanced session capture data (sanitized)
        if (Array.isArray(data.metadata?.clickBreadcrumbs)) {
          meta.clickBreadcrumbs = data.metadata.clickBreadcrumbs.slice(-30).map((b: any) => ({
            ts: Number(b.ts) || 0, tag: String(b.tag || '').slice(0, 20), text: String(b.text || '').slice(0, 50),
            sel: String(b.sel || '').slice(0, 200), x: Number(b.x) || 0, y: Number(b.y) || 0,
          }))
        }
        if (Array.isArray(data.metadata?.rageClicks)) {
          meta.rageClicks = data.metadata.rageClicks.slice(-10).map((r: any) => ({
            ts: Number(r.ts) || 0, count: Number(r.count) || 0, sel: String(r.sel || '').slice(0, 200),
            tag: String(r.tag || '').slice(0, 20), text: String(r.text || '').slice(0, 50),
          }))
        }
        if (Array.isArray(data.metadata?.deadClicks)) {
          meta.deadClicks = data.metadata.deadClicks.slice(-10).map((d: any) => ({
            ts: Number(d.ts) || 0, sel: String(d.sel || '').slice(0, 200),
            tag: String(d.tag || '').slice(0, 20), text: String(d.text || '').slice(0, 50),
          }))
        }
        if (data.metadata?.performance && typeof data.metadata.performance === 'object') {
          const p = data.metadata.performance
          meta.performance = {
            lcp: p.lcp != null ? Number(p.lcp) : undefined,
            cls: p.cls != null ? Number(p.cls) : undefined,
            inp: p.inp != null ? Number(p.inp) : undefined,
            pageLoadMs: p.pageLoadMs != null ? Number(p.pageLoadMs) : undefined,
            memoryMB: p.memoryMB != null ? Number(p.memoryMB) : undefined,
          }
        }
        if (data.metadata?.connection && typeof data.metadata.connection === 'object') {
          const c = data.metadata.connection
          meta.connection = {
            effectiveType: String(c.effectiveType || '').slice(0, 10),
            downlink: c.downlink != null ? Number(c.downlink) : undefined,
            rtt: c.rtt != null ? Number(c.rtt) : undefined,
            saveData: !!c.saveData,
          }
        }
        if (data.metadata?.display && typeof data.metadata.display === 'object') {
          const d = data.metadata.display
          meta.display = {
            screenW: Number(d.screenW) || 0, screenH: Number(d.screenH) || 0,
            dpr: Number(d.dpr) || 1, colorDepth: Number(d.colorDepth) || 0,
            touch: !!d.touch,
          }
        }
        if (data.metadata?.geo && typeof data.metadata.geo === 'object') {
          const g = data.metadata.geo
          meta.geo = {
            tz: String(g.tz || '').slice(0, 50),
            lang: String(g.lang || '').slice(0, 10),
            langs: Array.isArray(g.langs) ? g.langs.slice(0, 3).map((l: any) => String(l).slice(0, 10)) : undefined,
          }
        }
        return Object.keys(meta).length > 0 ? meta : null
      })(),
      attachmentUrls: attachmentUrls.length > 0 ? attachmentUrls : null,
    })

    if (insertError) {
      return corsJson({ error: insertError.message }, 500)
    }

    // Log activity
    const typeLabels: Record<string, string> = { BUG: 'Bug', SUGGESTION: 'Sugestão', QUESTION: 'Dúvida', PRAISE: 'Elogio' }
    logActivity({
      projectId: data.projectId,
      action: 'FEEDBACK_RECEIVED',
      details: {
        feedbackId,
        title: data.title?.trim() || null,
        type: data.type,
        typeLabel: typeLabels[data.type] || data.type,
        severity: data.severity || null,
      },
    })

    return corsJson({ success: true })
  } catch (err: any) {
    return corsJson({ error: err.message || 'Internal server error' }, 500)
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}
