import { requireUser } from '@/lib/auth'
import { serverApi } from '@/lib/api.server'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import FeedbackClient from './FeedbackClient'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function FeedbackPage({ params }: PageProps) {
  const { id } = await params
  const user = await requireUser()

  let feedback: any = null
  let error: string | null = null

  try {
    feedback = await serverApi.feedbacks.get(user.id, id)
  } catch (err: any) {
    if (err.message?.includes('not found') || err.message?.includes('Not found') || err.message?.includes('No rows')) {
      notFound()
    }
    error = 'Não foi possível carregar o feedback.'
    console.error('Feedback fetch error:', err)
  }

  if (!feedback && !error) {
    notFound()
  }

  // Fetch assignees for this feedback
  let initialAssignees: any[] = []
  if (feedback) {
    const { data: rawAssignees } = await supabaseAdmin
      .from('FeedbackAssignee')
      .select('id, userId, assignedAt')
      .eq('feedbackId', id)
      .order('assignedAt', { ascending: true })

    if (rawAssignees && rawAssignees.length > 0) {
      const userIds = rawAssignees.map((a: any) => a.userId)
      const { data: users } = await supabaseAdmin
        .from('User')
        .select('id, name, email')
        .in('id', userIds)

      const userMap = new Map((users || []).map((u: any) => [u.id, u]))
      initialAssignees = rawAssignees.map((a: any) => ({
        id: a.id,
        userId: a.userId,
        name: userMap.get(a.userId)?.name || null,
        email: userMap.get(a.userId)?.email || '',
        assignedAt: a.assignedAt,
      }))
    }
  }

  // Fetch org members and check permissions
  let orgMembers: any[] = []
  let canAssign = false
  if (feedback?.Project?.organizationId) {
    const orgId = feedback.Project.organizationId

    const { data: membership } = await supabaseAdmin
      .from('TeamMember')
      .select('role')
      .eq('organizationId', orgId)
      .eq('userId', user.id)
      .eq('status', 'ACTIVE')
      .single()

    const isOwner = feedback.Project.ownerId === user.id
    canAssign = isOwner || membership?.role === 'OWNER' || membership?.role === 'ADMIN'

    const { data: members } = await supabaseAdmin
      .from('TeamMember')
      .select('userId, role')
      .eq('organizationId', orgId)
      .eq('status', 'ACTIVE')

    if (members && members.length > 0) {
      const memberUserIds = members.map((m: any) => m.userId)
      const { data: memberUsers } = await supabaseAdmin
        .from('User')
        .select('id, name, email')
        .in('id', memberUserIds)

      const memberUserMap = new Map((memberUsers || []).map((u: any) => [u.id, u]))
      orgMembers = members.map((m: any) => ({
        id: m.userId,
        name: memberUserMap.get(m.userId)?.name || null,
        email: memberUserMap.get(m.userId)?.email || '',
        role: m.role,
      }))
    }
  }

  return (
    <FeedbackClient
      feedback={feedback}
      error={error}
      initialAssignees={initialAssignees}
      orgMembers={orgMembers}
      canAssign={canAssign}
    />
  )
}
