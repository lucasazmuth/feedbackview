import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function POST(req: NextRequest) {
  try {
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
      .select('id, organizationId, ownerId, name')
      .eq('id', data.projectId)
      .single()

    if (projectError || !project) {
      return corsJson({ error: 'Project not found' }, 404)
    }

    // Check report limits if project has an organization
    if (project.organizationId) {
      const { data: org } = await supabase
        .from('Organization')
        .select('maxReportsPerMonth')
        .eq('id', project.organizationId)
        .single()

      if (org && org.maxReportsPerMonth > 0) {
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const { count } = await supabase
          .from('Feedback')
          .select('id', { count: 'exact', head: true })
          .eq('projectId', data.projectId)
          .gte('createdAt', startOfMonth.toISOString())

        if (count !== null && count >= org.maxReportsPerMonth) {
          return corsJson({
            error: `Limite de ${org.maxReportsPerMonth} reports/mês atingido. Faça upgrade do plano.`,
          }, 429)
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
      metadata: data.rrwebEvents ? { rrwebEvents: data.rrwebEvents } : null,
      attachmentUrls: attachmentUrls.length > 0 ? attachmentUrls : null,
    })

    if (insertError) {
      return corsJson({ error: insertError.message }, 500)
    }

    return corsJson({ success: true })
  } catch (err: any) {
    return corsJson({ error: err.message || 'Internal server error' }, 500)
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}
