import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'
import { logActivity } from '@/lib/activity-log'
import { dispatchWebhookEvent } from '@/lib/webhook-dispatcher'
import { syncClickUpStatus } from '@/lib/clickup/sync'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { status } = await req.json()
  if (!status) {
    return NextResponse.json({ error: 'Status obrigatório' }, { status: 400 })
  }

  // Fetch current feedback + project info
  const { data: feedback } = await supabase
    .from('Feedback')
    .select('status, title, comment, projectId')
    .eq('id', id)
    .single()

  if (!feedback) {
    return NextResponse.json({ error: 'Feedback não encontrado' }, { status: 404 })
  }

  const oldStatus = feedback.status

  // Update status
  const { error } = await supabase
    .from('Feedback')
    .update({ status })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log activity
  const statusLabels: Record<string, string> = {
    OPEN: 'Aberto',
    IN_PROGRESS: 'Em andamento',
    UNDER_REVIEW: 'Sob revisão',
    RESOLVED: 'Concluída',
    CANCELLED: 'Cancelado',
  }
  const feedbackTitle = feedback.title || feedback.comment?.slice(0, 60) || 'Report'

  logActivity({
    projectId: feedback.projectId,
    userId: user.id,
    userEmail: user.email || undefined,
    action: 'STATUS_CHANGED',
    details: {
      feedbackId: id,
      feedbackTitle,
      oldStatus,
      newStatus: status,
      oldStatusLabel: statusLabels[oldStatus] || oldStatus,
      newStatusLabel: statusLabels[status] || status,
    },
  })

  // Notify project owner if changed by someone else
  const { data: project } = await supabase
    .from('Project')
    .select('ownerId, name, organizationId')
    .eq('id', feedback.projectId)
    .single()

  if (project && project.ownerId !== user.id) {
    createNotification({
      userId: project.ownerId,
      type: 'STATUS_CHANGE',
      title: `"${feedbackTitle}" marcado como ${statusLabels[status] || status}`,
      message: `Status alterado em ${project.name}`,
      metadata: {
        feedbackId: id,
        feedbackTitle,
        projectId: feedback.projectId,
        projectName: project.name,
        oldStatus,
        newStatus: status,
      },
    })
  }

  // Dispatch webhook + ClickUp sync (fire-and-forget)
  if (project?.organizationId) {
    void dispatchWebhookEvent({
      organizationId: project.organizationId,
      event: 'feedback.status_changed',
      payload: { feedbackId: id, projectId: feedback.projectId, oldStatus, newStatus: status },
    })
    void syncClickUpStatus({ organizationId: project.organizationId, feedbackId: id, newStatus: status })
  }

  return NextResponse.json({ success: true })
}
