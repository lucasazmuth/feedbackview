import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type ProjectRow = { ownerId: string; organizationId: string | null; name: string }

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { feedbackIds } = await req.json()
  if (!Array.isArray(feedbackIds) || feedbackIds.length === 0) {
    return NextResponse.json({ error: 'feedbackIds obrigatório' }, { status: 400 })
  }

  const { data: memberships } = await supabaseAdmin
    .from('TeamMember')
    .select('organizationId')
    .eq('userId', user.id)
    .eq('status', 'ACTIVE')

  const userOrgIds = new Set(
    (memberships || [])
      .map((m: { organizationId: string | null }) => m.organizationId)
      .filter((id): id is string => Boolean(id)),
  )

  const { data: rows, error: fetchError } = await supabaseAdmin
    .from('Feedback')
    .select('id, title, comment, projectId, Project!inner(ownerId, organizationId, name)')
    .in('id', feedbackIds)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const allowedIds: string[] = []
  for (const row of rows || []) {
    const p = row.Project as unknown as ProjectRow
    if (p.ownerId === user.id) {
      allowedIds.push(row.id)
      continue
    }
    if (p.organizationId && userOrgIds.has(p.organizationId)) {
      allowedIds.push(row.id)
    }
  }

  if (allowedIds.length === 0) {
    return NextResponse.json({ success: true, count: 0 })
  }

  const { error: assigneeErr } = await supabaseAdmin.from('FeedbackAssignee').delete().in('feedbackId', allowedIds)
  if (assigneeErr) {
    return NextResponse.json({ error: assigneeErr.message }, { status: 500 })
  }

  const { error: delErr } = await supabaseAdmin.from('Feedback').delete().in('id', allowedIds)
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  for (const row of rows || []) {
    if (!allowedIds.includes(row.id)) continue
    const p = row.Project as unknown as ProjectRow
    const feedbackTitle = row.title || row.comment?.slice(0, 60) || 'Report'
    logActivity({
      projectId: row.projectId,
      userId: user.id,
      userEmail: user.email || undefined,
      action: 'FEEDBACK_DELETED',
      details: {
        feedbackId: row.id,
        feedbackTitle,
        projectName: p.name,
      },
    })
  }

  return NextResponse.json({ success: true, count: allowedIds.length })
}
