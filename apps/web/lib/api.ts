import { createClient } from '@/lib/supabase/client'

// Client-side API (for client components)
export const api = {
  projects: {
    async create(data: { name: string; description?: string; targetUrl: string; mode?: string }) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check project limit via organization
      const { data: membership } = await supabase
        .from('TeamMember')
        .select('organizationId, organization:Organization(maxProjects)')
        .eq('userId', user.id)
        .eq('role', 'OWNER')
        .single()

      if (membership?.organization) {
        const org = membership.organization as unknown as { maxProjects: number }
        if (org.maxProjects > 0) {
          const { count } = await supabase
            .from('Project')
            .select('id', { count: 'exact', head: true })
            .eq('organizationId', membership.organizationId)

          if (count !== null && count >= org.maxProjects) {
            throw new Error(`Limite de ${org.maxProjects} projeto(s) atingido. Faça upgrade do plano.`)
          }
        }
      }

      const { data: project, error } = await supabase
        .from('Project')
        .insert({
          id: crypto.randomUUID(),
          name: data.name,
          description: data.description || null,
          targetUrl: data.targetUrl,
          mode: data.mode || 'proxy',
          ownerId: user.id,
          organizationId: membership?.organizationId || null,
        })
        .select()
        .single()
      if (error) throw new Error(error.message)
      return project
    },

    async update(id: string, data: { name?: string; description?: string; targetUrl?: string; widgetPosition?: string; widgetColor?: string }) {
      const supabase = createClient()
      const { error } = await supabase
        .from('Project')
        .update(data)
        .eq('id', id)
      if (error) throw new Error(error.message)
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

    async updateComment(id: string, comment: string) {
      const supabase = createClient()
      const { error } = await supabase
        .from('Feedback')
        .update({ comment })
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

      // Upload attachments if provided
      const attachmentUrls: string[] = []
      if (data.attachments && Array.isArray(data.attachments)) {
        for (const att of data.attachments.slice(0, 5)) {
          try {
            const base64Data = att.data.split(',')[1]
            const byteString = atob(base64Data)
            const bytes = new Uint8Array(byteString.length)
            for (let i = 0; i < byteString.length; i++) {
              bytes[i] = byteString.charCodeAt(i)
            }
            const ext = att.name?.split('.').pop() || 'bin'
            const fileName = `${data.projectId}/attachments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('feedbacks')
              .upload(fileName, bytes, { contentType: att.type || 'application/octet-stream' })

            if (!uploadError && uploadData) {
              const { data: { publicUrl } } = supabase.storage
                .from('feedbacks')
                .getPublicUrl(uploadData.path)
              attachmentUrls.push(publicUrl)
            }
          } catch {
            // Attachment upload failed, continue
          }
        }
      }

      const { error } = await supabase.from('Feedback').insert({
        id: crypto.randomUUID(),
        projectId: data.projectId,
        title: data.title?.trim() || null,
        comment: data.comment,
        type: data.type,
        severity: data.severity || null,
        screenshotUrl,
        consoleLogs: data.consoleLogs || null,
        networkLogs: data.networkLogs || null,
        pageUrl: data.pageUrl || null,
        userAgent: data.userAgent || null,
        metadata: data.rrwebEvents ? { rrwebEvents: data.rrwebEvents } : null,
        attachmentUrls: attachmentUrls.length > 0 ? attachmentUrls : null,
      })
      if (error) throw new Error(error.message)
    },
  },
}
