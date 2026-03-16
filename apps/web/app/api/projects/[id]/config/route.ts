import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createNotification } from '@/lib/notifications'
import { normalizeDomain } from '@/lib/url-utils'

export const dynamic = 'force-dynamic'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function corsJson(body: any, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data: project, error } = await supabase
      .from('Project')
      .select('widgetPosition, widgetColor, widgetStyle, widgetText, ownerId, name, embedLastSeenAt, targetUrl, embedPaused, organizationId')
      .eq('id', id)
      .single()

    if (error || !project) {
      return corsJson({ error: 'Project not found' }, 404)
    }

    // Origin validation — block unauthorized sites (skip for localhost dev)
    const origin = req.headers.get('origin') || req.headers.get('referer') || ''
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1')
    if (origin && project.targetUrl && !isLocalhost) {
      const originDomain = normalizeDomain(origin)
      const projectDomain = normalizeDomain(project.targetUrl)
      if (originDomain !== projectDomain) {
        return corsJson({
          error: 'blocked',
          message: 'Site não autorizado. Crie sua conta em reportbug.pro',
        }, 403)
      }
    }

    // Paused check — widget appears but form is disabled
    if (project.embedPaused) {
      return corsJson({
        paused: true,
        widgetPosition: project.widgetPosition || 'bottom-right',
        widgetColor: project.widgetColor || '#4f46e5',
        widgetStyle: project.widgetStyle || 'text',
        widgetText: project.widgetText || 'Reportar Bug',
      })
    }

    // Record embed ping (fire-and-forget, non-blocking)
    const isFirstConnection = !project.embedLastSeenAt
    void supabase
      .from('Project')
      .update({ embedLastSeenAt: new Date().toISOString() })
      .eq('id', id)
      .then(() => {})

    // Notify project owner on first embed connection
    if (isFirstConnection && project.ownerId) {
      createNotification({
        userId: project.ownerId,
        type: 'EMBED_CONNECTED',
        title: `Widget conectado em "${project.name}"`,
        message: 'O script embed foi detectado no seu site.',
        metadata: { projectId: id, projectName: project.name },
      })
    }

    // Check report limit
    let limitReached = false
    if (project.organizationId) {
      const { data: org } = await supabase
        .from('Organization')
        .select('maxReportsPerMonth, plan')
        .eq('id', project.organizationId)
        .single()

      if (org && org.maxReportsPerMonth > 0) {
        const isLifetime = org.plan === 'FREE'

        let reportsQuery = supabase
          .from('Feedback')
          .select('id', { count: 'exact', head: true })
          .eq('organizationId', project.organizationId)

        if (!isLifetime) {
          const startOfMonth = new Date()
          startOfMonth.setDate(1)
          startOfMonth.setHours(0, 0, 0, 0)
          reportsQuery = reportsQuery.gte('createdAt', startOfMonth.toISOString())
        }

        const { count } = await reportsQuery

        if (count !== null && count >= org.maxReportsPerMonth) {
          limitReached = true
        }
      }
    }

    return corsJson({
      widgetPosition: project.widgetPosition || 'bottom-right',
      widgetColor: project.widgetColor || '#4f46e5',
      widgetStyle: project.widgetStyle || 'text',
      widgetText: project.widgetText || 'Reportar Bug',
      limitReached,
    })
  } catch (err: any) {
    return corsJson({ error: err.message || 'Internal server error' }, 500)
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}
