import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createNotification } from '@/lib/notifications'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=300',
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function corsJson(body: any, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data: project, error } = await supabase
      .from('Project')
      .select('widgetPosition, widgetColor, widgetStyle, widgetText, ownerId, name, embedLastSeenAt')
      .eq('id', id)
      .single()

    if (error || !project) {
      return corsJson({ error: 'Project not found' }, 404)
    }

    const isFirstConnection = !project.embedLastSeenAt

    // Record embed ping (fire-and-forget, non-blocking)
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

    return corsJson({
      widgetPosition: project.widgetPosition || 'bottom-right',
      widgetColor: project.widgetColor || '#4f46e5',
      widgetStyle: project.widgetStyle || 'text',
      widgetText: project.widgetText || 'Reportar Bug',
    })
  } catch (err: any) {
    return corsJson({ error: err.message || 'Internal server error' }, 500)
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}
