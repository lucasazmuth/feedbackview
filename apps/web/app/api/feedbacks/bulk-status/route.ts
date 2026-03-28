import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { syncClickUpStatus } from '@/lib/clickup/sync'

const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'RESOLVED', 'CANCELLED']

const statusLabels: Record<string, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  UNDER_REVIEW: 'Sob revisão',
  RESOLVED: 'Concluída',
  CANCELLED: 'Cancelado',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { feedbackIds, status } = await req.json()

  if (!Array.isArray(feedbackIds) || feedbackIds.length === 0) {
    return NextResponse.json({ error: 'feedbackIds obrigatório' }, { status: 400 })
  }

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Status inválido. Valores permitidos: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  let successCount = 0

  for (const feedbackId of feedbackIds) {
    const { data: feedback } = await supabase
      .from('Feedback')
      .select('status, title, comment, projectId, clickupTaskId, Project:projectId(organizationId)')
      .eq('id', feedbackId)
      .single()

    if (!feedback) continue

    const oldStatus = feedback.status

    const { error } = await supabase
      .from('Feedback')
      .update({ status })
      .eq('id', feedbackId)

    if (error) continue

    const feedbackTitle = feedback.title || feedback.comment?.slice(0, 60) || 'Report'

    logActivity({
      projectId: feedback.projectId,
      userId: user.id,
      userEmail: user.email || undefined,
      action: 'STATUS_CHANGED',
      details: {
        feedbackId,
        feedbackTitle,
        oldStatus,
        newStatus: status,
        oldStatusLabel: statusLabels[oldStatus] || oldStatus,
        newStatusLabel: statusLabels[status] || status,
      },
    })

    const orgId = (feedback as any).Project?.organizationId
    if (orgId && oldStatus !== status) {
      void syncClickUpStatus({ organizationId: orgId, feedbackId, newStatus: status })
    }

    successCount++
  }

  return NextResponse.json({ success: true, count: successCount })
}
