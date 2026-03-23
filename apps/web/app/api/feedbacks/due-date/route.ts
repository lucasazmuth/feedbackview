import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createNotification, getOrgOwnerUserId } from '@/lib/notifications'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { feedbackId, dueDate } = await req.json()

  if (!feedbackId) {
    return NextResponse.json({ error: 'feedbackId obrigatório' }, { status: 400 })
  }

  const { error } = await supabase
    .from('Feedback')
    .update({ dueDate: dueDate || null })
    .eq('id', feedbackId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send notifications when a due date is set
  if (dueDate) {
    const dueDateFormatted = new Date(dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

    // Get feedback details for notification
    const { data: feedback } = await supabaseAdmin
      .from('Feedback')
      .select('id, comment, projectId, Project:projectId(name, ownerId, organizationId)')
      .eq('id', feedbackId)
      .single()

    if (feedback) {
      const project = (feedback as any).Project
      const title = `Prazo definido: ${dueDateFormatted}`
      const message = `Report "${(feedback.comment || '').slice(0, 50)}..." no projeto ${project?.name || ''}`
      const metadata = { feedbackId, projectId: feedback.projectId, dueDate }

      // Notify assignees
      const { data: assignees } = await supabaseAdmin
        .from('FeedbackAssignee')
        .select('userId')
        .eq('feedbackId', feedbackId)

      const notifiedIds = new Set<string>()
      for (const a of assignees || []) {
        if (a.userId !== user.id) {
          createNotification({ userId: a.userId, type: 'DUE_DATE_SET', title, message, metadata })
          notifiedIds.add(a.userId)
        }
      }

      // Notify project owner
      if (project?.ownerId && project.ownerId !== user.id && !notifiedIds.has(project.ownerId)) {
        createNotification({ userId: project.ownerId, type: 'DUE_DATE_SET', title, message, metadata })
        notifiedIds.add(project.ownerId)
      }

      // Notify org owner
      if (project?.organizationId) {
        const orgOwnerId = await getOrgOwnerUserId(project.organizationId)
        if (orgOwnerId && orgOwnerId !== user.id && !notifiedIds.has(orgOwnerId)) {
          createNotification({ userId: orgOwnerId, type: 'DUE_DATE_SET', title, message, metadata })
        }
      }
    }
  }

  return NextResponse.json({ success: true })
}
