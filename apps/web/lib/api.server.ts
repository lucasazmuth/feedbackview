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
        .order('createdAt', { ascending: false })
      if (error) throw new Error(error.message)
      return (data || []).map((p: any) => ({
        ...p,
        url: p.targetUrl,
        _count: { feedbacks: p.Feedback?.length || 0 },
        openFeedbackCount: p.Feedback?.filter((f: any) => f.status === 'OPEN').length || 0,
      }))
    },

    async get(userId: string, id: string) {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('Project')
        .select('*')
        .eq('id', id)
        .eq('ownerId', userId)
        .single()
      if (error) throw new Error(error.message)
      return { ...data, url: data.targetUrl }
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
        .order('createdAt', { ascending: false })
      if (error) throw new Error(error.message)
      return data || []
    },
  },

  feedbacks: {
    async get(userId: string, id: string) {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('Feedback')
        .select('*, Project!inner(ownerId)')
        .eq('id', id)
        .single()
      if (error) throw new Error(error.message)
      if (data?.Project?.ownerId !== userId) throw new Error('Not found')
      return data
    },
  },
}
