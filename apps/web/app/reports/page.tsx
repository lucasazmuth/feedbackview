import { requireUser } from '@/lib/auth'
import { serverApi } from '@/lib/api.server'
import { createClient } from '@supabase/supabase-js'
import ReportsClient from './ReportsClient'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function ReportsPage() {
  const user = await requireUser()

  let feedbacks: any[] = []
  let projects: any[] = []
  let error: string | null = null

  try {
    ;[feedbacks, projects] = await Promise.all([
      serverApi.feedbacks.listAll(user.id),
      serverApi.projects.list(user.id),
    ])
  } catch (err) {
    error = 'Não foi possível carregar os reports.'
    console.error('Reports fetch error:', err)
  }

  // Fetch assignees for all feedbacks
  let feedbackAssigneesMap: Record<string, { userId: string; name: string | null; email: string }[]> = {}
  if (feedbacks.length > 0) {
    try {
      const feedbackIds = feedbacks.map((f: any) => f.id)
      const { data: allAssignees } = await supabaseAdmin
        .from('FeedbackAssignee')
        .select('feedbackId, userId')
        .in('feedbackId', feedbackIds)

      if (allAssignees && allAssignees.length > 0) {
        const assigneeUserIds = [...new Set(allAssignees.map(a => a.userId))]
        const { data: teamMembers } = await supabaseAdmin
          .from('TeamMember')
          .select('userId, inviteEmail')
          .in('userId', assigneeUserIds)
          .eq('status', 'ACTIVE')
        const tmMap = new Map((teamMembers || []).map(tm => [tm.userId, tm.inviteEmail]))

        let authMap = new Map<string, string>()
        const missingIds = assigneeUserIds.filter(uid => !tmMap.get(uid))
        if (missingIds.length > 0) {
          try {
            const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 100 })
            if (authData?.users) {
              for (const au of authData.users) {
                if (missingIds.includes(au.id)) authMap.set(au.id, au.email || '')
              }
            }
          } catch {}
        }

        for (const a of allAssignees) {
          const email = tmMap.get(a.userId) || authMap.get(a.userId) || ''
          const name = email ? email.split('@')[0] : null
          if (!feedbackAssigneesMap[a.feedbackId]) feedbackAssigneesMap[a.feedbackId] = []
          feedbackAssigneesMap[a.feedbackId].push({ userId: a.userId, name, email })
        }
      }
    } catch {}
  }

  return (
    <ReportsClient
      feedbacks={feedbacks}
      projects={projects}
      error={error}
      feedbackAssigneesMap={feedbackAssigneesMap}
    />
  )
}
