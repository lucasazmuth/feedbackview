import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'
import { logActivity } from '@/lib/activity-log'

// GET — List assignees for a feedback
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: assignees } = await supabase
    .from('FeedbackAssignee')
    .select('id, userId, assignedAt, assignedBy')
    .eq('feedbackId', id)
    .order('assignedAt', { ascending: true })

  if (!assignees || assignees.length === 0) {
    return NextResponse.json({ assignees: [] })
  }

  // Fetch user details for assignees
  const userIds = [...new Set(assignees.map(a => a.userId))]
  const { data: users } = await supabase
    .from('User')
    .select('id, name, email')
    .in('id', userIds)

  const userMap = new Map((users || []).map(u => [u.id, u]))

  const enriched = assignees.map(a => ({
    id: a.id,
    userId: a.userId,
    name: userMap.get(a.userId)?.name || null,
    email: userMap.get(a.userId)?.email || '',
    assignedAt: a.assignedAt,
  }))

  return NextResponse.json({ assignees: enriched })
}

// POST — Assign members to a feedback
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { userIds } = await req.json()
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: 'userIds obrigatório' }, { status: 400 })
  }

  // Fetch feedback + project to verify access
  const { data: feedback } = await supabase
    .from('Feedback')
    .select('id, projectId, comment, title')
    .eq('id', id)
    .single()

  if (!feedback) {
    return NextResponse.json({ error: 'Feedback não encontrado' }, { status: 404 })
  }

  const { data: project } = await supabase
    .from('Project')
    .select('id, name, organizationId, ownerId')
    .eq('id', feedback.projectId)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  }

  // Check if user is OWNER or ADMIN of the org
  const { data: membership } = await supabase
    .from('TeamMember')
    .select('role')
    .eq('organizationId', project.organizationId)
    .eq('userId', user.id)
    .eq('status', 'ACTIVE')
    .single()

  const isOwner = project.ownerId === user.id
  const isAdmin = membership?.role === 'OWNER' || membership?.role === 'ADMIN'

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Sem permissão para atribuir' }, { status: 403 })
  }

  // Get existing assignees to avoid duplicate notifications
  const { data: existing } = await supabase
    .from('FeedbackAssignee')
    .select('userId')
    .eq('feedbackId', id)

  const existingUserIds = new Set((existing || []).map(e => e.userId))

  // Insert new assignments (upsert — ignore duplicates)
  const rows = userIds.map((uid: string) => ({
    feedbackId: id,
    userId: uid,
    assignedBy: user.id,
  }))

  const { error } = await supabase
    .from('FeedbackAssignee')
    .upsert(rows, { onConflict: 'feedbackId,userId', ignoreDuplicates: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get assignee user details for logging/notifications
  const { data: assignedUsers } = await supabase
    .from('User')
    .select('id, name, email')
    .in('id', userIds)

  const feedbackTitle = feedback.title || feedback.comment?.slice(0, 60) || 'Report'

  // Log + notify only for NEW assignments
  for (const assignedUser of (assignedUsers || [])) {
    if (!existingUserIds.has(assignedUser.id)) {
      logActivity({
        projectId: feedback.projectId,
        userId: user.id,
        userEmail: user.email || undefined,
        action: 'FEEDBACK_ASSIGNED',
        details: {
          feedbackId: id,
          feedbackTitle,
          assigneeId: assignedUser.id,
          assigneeEmail: assignedUser.email,
          assigneeName: assignedUser.name,
        },
      })

      if (assignedUser.id !== user.id) {
        createNotification({
          userId: assignedUser.id,
          type: 'FEEDBACK_ASSIGNED',
          title: `Novo report atribuído: "${feedbackTitle}"`,
          message: `Você foi atribuído ao report em ${project.name}`,
          metadata: {
            feedbackId: id,
            projectId: feedback.projectId,
            projectName: project.name,
            assignedBy: user.email,
          },
        })
      }
    }
  }

  return NextResponse.json({ success: true })
}

// DELETE — Remove an assignee from a feedback
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { userId } = await req.json()
  if (!userId) {
    return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 })
  }

  // Fetch feedback + project
  const { data: feedback } = await supabase
    .from('Feedback')
    .select('id, projectId, comment, title')
    .eq('id', id)
    .single()

  if (!feedback) {
    return NextResponse.json({ error: 'Feedback não encontrado' }, { status: 404 })
  }

  const { data: project } = await supabase
    .from('Project')
    .select('id, name, organizationId, ownerId')
    .eq('id', feedback.projectId)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  }

  // Check permissions
  const { data: membership } = await supabase
    .from('TeamMember')
    .select('role')
    .eq('organizationId', project.organizationId)
    .eq('userId', user.id)
    .eq('status', 'ACTIVE')
    .single()

  const isOwner = project.ownerId === user.id
  const isAdmin = membership?.role === 'OWNER' || membership?.role === 'ADMIN'

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  // Get removed user info before deleting
  const { data: removedUser } = await supabase
    .from('User')
    .select('id, name, email')
    .eq('id', userId)
    .single()

  const { error } = await supabase
    .from('FeedbackAssignee')
    .delete()
    .eq('feedbackId', id)
    .eq('userId', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const feedbackTitle = feedback.title || feedback.comment?.slice(0, 60) || 'Report'

  logActivity({
    projectId: feedback.projectId,
    userId: user.id,
    userEmail: user.email || undefined,
    action: 'FEEDBACK_UNASSIGNED',
    details: {
      feedbackId: id,
      feedbackTitle,
      removedUserId: userId,
      removedEmail: removedUser?.email,
      removedName: removedUser?.name,
    },
  })

  return NextResponse.json({ success: true })
}
