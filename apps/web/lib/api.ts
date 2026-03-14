import { createClient } from '@/lib/supabase/client'

// Client-side API (for client components)
export const api = {
  projects: {
    async create(data: { name: string; description?: string; targetUrl: string }) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: project, error } = await supabase
        .from('Project')
        .insert({
          id: crypto.randomUUID(),
          name: data.name,
          description: data.description || null,
          targetUrl: data.targetUrl,
          ownerId: user.id,
        })
        .select()
        .single()
      if (error) throw new Error(error.message)
      return project
    },

    async delete(id: string) {
      const supabase = createClient()
      const { error } = await supabase.from('Project').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
  },

  feedbacks: {
    async updateStatus(id: string, status: string) {
      const supabase = createClient()
      const { error } = await supabase
        .from('Feedback')
        .update({ status })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },

    async submit(data: any) {
      const supabase = createClient()

      let screenshotUrl: string | null = null
      if (data.screenshotBase64) {
        const base64Data = data.screenshotBase64.split(',')[1]
        const byteString = atob(base64Data)
        const bytes = new Uint8Array(byteString.length)
        for (let i = 0; i < byteString.length; i++) {
          bytes[i] = byteString.charCodeAt(i)
        }
        const fileName = `${data.projectId}/${Date.now()}.jpg`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('feedbacks')
          .upload(fileName, bytes, { contentType: 'image/jpeg' })

        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('feedbacks')
            .getPublicUrl(uploadData.path)
          screenshotUrl = publicUrl
        }
      }

      const { error } = await supabase.from('Feedback').insert({
        id: crypto.randomUUID(),
        projectId: data.projectId,
        comment: data.comment,
        type: data.type,
        severity: data.severity || null,
        screenshotUrl,
        consoleLogs: data.consoleLogs || null,
        networkLogs: data.networkLogs || null,
        pageUrl: data.pageUrl || null,
        userAgent: data.userAgent || null,
        metadata: data.rrwebEvents ? { rrwebEvents: data.rrwebEvents } : null,
      })
      if (error) throw new Error(error.message)
    },
  },
}
