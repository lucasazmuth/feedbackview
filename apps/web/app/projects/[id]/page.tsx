import { requireUser } from '@/lib/auth'
import { serverApi } from '@/lib/api.server'
import { getProjectRole } from '@/lib/project-access'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ProjectClient from './ProjectClient'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params
  const user = await requireUser()

  let project: any = null
  let feedbacks: any[] = []
  let activityLog: any[] = []
  let error: string | null = null
  let userRole = 'MEMBER'

  try {
    [project, feedbacks, userRole] = await Promise.all([
      serverApi.projects.get(user.id, id),
      serverApi.projects.feedbacks(user.id, id),
      getProjectRole(user.id, id).then(r => r || 'MEMBER'),
    ])
    // Fetch activity log separately (non-blocking if table doesn't exist yet)
    try {
      activityLog = await serverApi.activityLog.list(user.id, id)
    } catch {
      // ActivityLog table may not exist yet
    }
  } catch (err: any) {
    if (err.message?.includes('not found') || err.message?.includes('No rows')) {
      notFound()
    }
    error = 'Não foi possível carregar os dados do projeto.'
    console.error('Project fetch error:', err)
  }

  if (!project && !error) {
    notFound()
  }

  // Fetch assignees for all feedbacks in this project
  let feedbackAssigneesMap: Record<string, { userId: string; name: string | null; email: string }[]> = {}
  if (feedbacks.length > 0) {
    try {
      const feedbackIds = feedbacks.map((f: any) => f.id)
      const { data: allAssignees } = await supabaseAdmin
        .from('FeedbackAssignee')
        .select('feedbackId, userId')
        .in('feedbackId', feedbackIds)

      if (allAssignees && allAssignees.length > 0) {
        // Get unique user IDs and fetch their info
        const assigneeUserIds = [...new Set(allAssignees.map(a => a.userId))]

        // Try TeamMember for inviteEmail
        const { data: teamMembers } = await supabaseAdmin
          .from('TeamMember')
          .select('userId, inviteEmail')
          .in('userId', assigneeUserIds)
          .eq('status', 'ACTIVE')

        const tmMap = new Map((teamMembers || []).map(tm => [tm.userId, tm.inviteEmail]))

        // Try auth.admin for remaining
        let authMap = new Map<string, string>()
        const missingIds = assigneeUserIds.filter(uid => !tmMap.get(uid))
        if (missingIds.length > 0) {
          try {
            const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 100 })
            if (authData?.users) {
              for (const au of authData.users) {
                if (missingIds.includes(au.id)) {
                  authMap.set(au.id, au.email || '')
                }
              }
            }
          } catch {}
        }

        // Build map
        for (const a of allAssignees) {
          const email = tmMap.get(a.userId) || authMap.get(a.userId) || ''
          const name = email ? email.split('@')[0] : null
          if (!feedbackAssigneesMap[a.feedbackId]) feedbackAssigneesMap[a.feedbackId] = []
          feedbackAssigneesMap[a.feedbackId].push({ userId: a.userId, name, email })
        }
      }
    } catch {}
  }

  // Fetch team members for inline assignee editing
  let teamMembersList: { id: string; name: string | null; email: string }[] = []
  try {
    if (project?.organizationId) {
      const { data: members } = await supabaseAdmin
        .from('TeamMember')
        .select('userId, inviteEmail')
        .eq('organizationId', project.organizationId)
        .eq('status', 'ACTIVE')

      if (members) {
        const uniqueMembers = new Map<string, { id: string; name: string | null; email: string }>()
        for (const m of members) {
          if (!uniqueMembers.has(m.userId)) {
            const email = m.inviteEmail || ''
            uniqueMembers.set(m.userId, { id: m.userId, name: email ? email.split('@')[0] : null, email })
          }
        }
        teamMembersList = Array.from(uniqueMembers.values())
      }
    }
  } catch {}

  return (
    <ProjectClient
      project={project}
      feedbacks={feedbacks}
      activityLog={activityLog}
      error={error}
      userEmail={user.email ?? ''}
      userRole={userRole}
      feedbackAssigneesMap={feedbackAssigneesMap}
      teamMembers={teamMembersList}
      currentUserId={user.id}
    />
  )
}
