import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Admin client bypasses RLS — access control is enforced via org membership checks below
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Helper: get all org IDs the user belongs to
async function getUserOrgIds(userId: string): Promise<string[]> {
  const { data: memberships } = await supabaseAdmin
    .from('TeamMember')
    .select('organizationId')
    .eq('userId', userId)
    .eq('status', 'ACTIVE')
  return memberships?.map((m: any) => m.organizationId).filter(Boolean) || []
}

// Server-side API (for server components only)
export const serverApi = {
  projects: {
    async list(userId: string) {
      const orgIds = await getUserOrgIds(userId)

      // Query projects belonging to any of the user's organizations, or owned directly
      let query = supabaseAdmin
        .from('Project')
        .select('*, Feedback(id, status)')
        .is('archivedAt', null)
        .order('createdAt', { ascending: false })

      if (orgIds.length > 0) {
        query = query.or(`organizationId.in.(${orgIds.join(',')}),ownerId.eq.${userId}`)
      } else {
        query = query.eq('ownerId', userId)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data || []).map((p: any) => ({
        ...p,
        url: p.targetUrl,
        _count: { feedbacks: p.Feedback?.length || 0 },
        openFeedbackCount: p.Feedback?.filter((f: any) => f.status === 'OPEN').length || 0,
        embedLastSeenAt: p.embedLastSeenAt || null,
      }))
    },

    async listArchived(userId: string) {
      const orgIds = await getUserOrgIds(userId)

      let query = supabaseAdmin
        .from('Project')
        .select('id, name, targetUrl, createdAt, archivedAt')
        .not('archivedAt', 'is', null)
        .order('archivedAt', { ascending: false })

      if (orgIds.length > 0) {
        query = query.or(`organizationId.in.(${orgIds.join(',')}),ownerId.eq.${userId}`)
      } else {
        query = query.eq('ownerId', userId)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data || []).map((p: any) => ({ ...p, url: p.targetUrl }))
    },

    async get(userId: string, id: string) {
      const orgIds = await getUserOrgIds(userId)

      let query = supabaseAdmin
        .from('Project')
        .select('*')
        .eq('id', id)

      if (orgIds.length > 0) {
        query = query.or(`organizationId.in.(${orgIds.join(',')}),ownerId.eq.${userId}`)
      } else {
        query = query.eq('ownerId', userId)
      }

      // Need user auth client just for getUser() metadata
      const supabaseAuth = await createServerClient()
      const [{ data, error }, { data: { user } }] = await Promise.all([
        query.single(),
        supabaseAuth.auth.getUser(),
      ])
      if (error) throw new Error(error.message)
      const ownerName = user?.user_metadata?.name || user?.email || null
      return { ...data, url: data.targetUrl, ownerName }
    },

    async feedbacks(userId: string, projectId: string) {
      const orgIds = await getUserOrgIds(userId)

      let query = supabaseAdmin
        .from('Project')
        .select('id')
        .eq('id', projectId)

      if (orgIds.length > 0) {
        query = query.or(`organizationId.in.(${orgIds.join(',')}),ownerId.eq.${userId}`)
      } else {
        query = query.eq('ownerId', userId)
      }

      const { data: project } = await query.single()
      if (!project) throw new Error('Project not found')

      const { data, error } = await supabaseAdmin
        .from('Feedback')
        .select('*')
        .eq('projectId', projectId)
        .is('archivedAt', null)
        .order('createdAt', { ascending: false })
      if (error) throw new Error(error.message)
      return data || []
    },
  },

  activityLog: {
    async list(userId: string, projectId: string) {
      const orgIds = await getUserOrgIds(userId)

      let query = supabaseAdmin
        .from('Project')
        .select('id')
        .eq('id', projectId)

      if (orgIds.length > 0) {
        query = query.or(`organizationId.in.(${orgIds.join(',')}),ownerId.eq.${userId}`)
      } else {
        query = query.eq('ownerId', userId)
      }

      const { data: project } = await query.single()
      if (!project) throw new Error('Project not found')

      const { data, error } = await supabaseAdmin
        .from('ActivityLog')
        .select('*')
        .eq('projectId', projectId)
        .order('createdAt', { ascending: false })
        .limit(100)
      if (error) throw new Error(error.message)
      return data || []
    },
  },

  feedbacks: {
    async get(userId: string, id: string) {
      const orgIds = await getUserOrgIds(userId)

      const { data, error } = await supabaseAdmin
        .from('Feedback')
        .select('*, Project!inner(ownerId, organizationId, name)')
        .eq('id', id)
        .single()
      if (error) throw new Error(error.message)

      const projectOrgId = data?.Project?.organizationId
      const isOrgMember = projectOrgId && orgIds.includes(projectOrgId)
      const isOwner = data?.Project?.ownerId === userId
      if (!isOwner && !isOrgMember) throw new Error('Not found')
      return data
    },

    async listAll(userId: string) {
      const orgIds = await getUserOrgIds(userId)

      // Get all project IDs accessible to this user
      let projectQuery = supabaseAdmin
        .from('Project')
        .select('id')
        .is('archivedAt', null)

      if (orgIds.length > 0) {
        projectQuery = projectQuery.or(`organizationId.in.(${orgIds.join(',')}),ownerId.eq.${userId}`)
      } else {
        projectQuery = projectQuery.eq('ownerId', userId)
      }

      const { data: projects } = await projectQuery
      const projectIds = projects?.map((p: any) => p.id) || []
      if (projectIds.length === 0) return []

      // Try with sortOrder first, fallback to createdAt only if column doesn't exist
      let query = supabaseAdmin
        .from('Feedback')
        .select('*, Project!inner(id, name, ownerId)')
        .in('projectId', projectIds)
        .is('archivedAt', null)
        .order('sortOrder', { ascending: true })
        .order('createdAt', { ascending: false })

      const { data, error } = await query

      // Fallback if sortOrder column doesn't exist yet
      if (error && error.message?.includes('sortOrder')) {
        const { data: fallbackData, error: fallbackError } = await supabaseAdmin
          .from('Feedback')
          .select('*, Project!inner(id, name, ownerId)')
          .in('projectId', projectIds)
          .is('archivedAt', null)
          .order('createdAt', { ascending: false })
        if (fallbackError) throw new Error(fallbackError.message)
        return fallbackData || []
      }

      if (error) throw new Error(error.message)
      return data || []
    },
  },
}
