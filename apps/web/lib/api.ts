import { createClient } from '@/lib/supabase/client'
import { type Plan } from '@/lib/limits'

// Client-side API (for client components)
export const api = {
  projects: {
    async create(data: { name: string; description?: string; targetUrl: string; mode?: string; widgetStyle?: string; widgetText?: string; widgetPosition?: string; widgetColor?: string }) {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Erro ao criar projeto')
      return result
    },

    async update(id: string, data: { name?: string; description?: string; targetUrl?: string; widgetPosition?: string; widgetColor?: string; widgetStyle?: string; widgetText?: string; embedPaused?: boolean }) {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.error || 'Erro ao atualizar projeto')
      }
    },

    async archive(id: string) {
      const res = await fetch(`/api/projects/${id}/archive`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao arquivar projeto')
      }
    },
  },

  feedbacks: {
    async updateStatus(id: string, status: string) {
      const res = await fetch(`/api/feedbacks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao atualizar status')
      }
    },

    async assign(id: string, userIds: string[]) {
      const res = await fetch(`/api/feedbacks/${id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao atribuir')
      }
    },

    async unassign(id: string, userId: string) {
      const res = await fetch(`/api/feedbacks/${id}/assign`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao remover atribuição')
      }
    },

    async getAssignees(id: string) {
      const res = await fetch(`/api/feedbacks/${id}/assign`)
      if (!res.ok) throw new Error('Erro ao buscar responsáveis')
      const data = await res.json()
      return data.assignees as { id: string; userId: string; name: string | null; email: string; assignedAt: string }[]
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
        metadata: (() => {
          const m: any = {}
          if (data.rrwebEvents) m.rrwebEvents = data.rrwebEvents
          if (data.metadata?.stepsToReproduce) m.stepsToReproduce = data.metadata.stepsToReproduce
          if (data.metadata?.expectedResult) m.expectedResult = data.metadata.expectedResult
          if (data.metadata?.actualResult) m.actualResult = data.metadata.actualResult
          return Object.keys(m).length > 0 ? m : null
        })(),
        attachmentUrls: attachmentUrls.length > 0 ? attachmentUrls : null,
      })
      if (error) throw new Error(error.message)
    },
  },
}
