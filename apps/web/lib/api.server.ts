import { createClient } from '@/lib/supabase/server'

// Server-side API (for server components only)
export const serverApi = {
  projects: {
    async list(userId: string) {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('Project')
        .select('*, Feedback(id, status)')
        .eq('ownerId', userId)
        .is('archivedAt', null)
        .order('createdAt', { ascending: false })
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
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('Project')
        .select('id, name, targetUrl, createdAt, archivedAt')
        .eq('ownerId', userId)
        .not('archivedAt', 'is', null)
        .order('archivedAt', { ascending: false })
      if (error) throw new Error(error.message)
      return (data || []).map((p: any) => ({ ...p, url: p.targetUrl }))
    },

    async get(userId: string, id: string) {
      const supabase = await createClient()
      const [{ data, error }, { data: { user } }] = await Promise.all([
        supabase
          .from('Project')
          .select('*')
          .eq('id', id)
          .eq('ownerId', userId)
          .single(),
        supabase.auth.getUser(),
      ])
      if (error) throw new Error(error.message)
      const ownerName = user?.user_metadata?.name || user?.email || null
      return { ...data, url: data.targetUrl, ownerName }
    },

    async feedbacks(userId: string, projectId: string) {
      const supabase = await createClient()
      const { data: project } = await supabase
        .from('Project')
        .select('id')
        .eq('id', projectId)
        .eq('ownerId', userId)
        .single()
      if (!project) throw new Error('Project not found')

      const { data, error } = await supabase
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
      const supabase = await createClient()
      // Verify ownership
      const { data: project } = await supabase
        .from('Project')
        .select('id')
        .eq('id', projectId)
        .eq('ownerId', userId)
        .single()
      if (!project) throw new Error('Project not found')

      const { data, error } = await supabase
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
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('Feedback')
        .select('*, Project!inner(ownerId, name)')
        .eq('id', id)
        .single()
      if (error) throw new Error(error.message)
      if (data?.Project?.ownerId !== userId) throw new Error('Not found')
      return data
    },

    async listAll(userId: string) {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('Feedback')
        .select('*, Project!inner(id, name, ownerId)')
        .eq('Project.ownerId', userId)
        .is('archivedAt', null)
        .order('createdAt', { ascending: false })
      if (error) throw new Error(error.message)
      return data || []
    },
  },
}
