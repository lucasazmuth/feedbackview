import { createClient } from '@supabase/supabase-js'
import { decryptToken } from './crypto'
import { createTask, updateTaskStatus, ClickUpError } from './client'
import type { ClickUpIntegrationConfig } from './types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://buug.io'

async function getOrgConfig(
  organizationId: string,
): Promise<{ token: string; config: ClickUpIntegrationConfig } | null> {
  const { data: org } = await supabaseAdmin
    .from('Organization')
    .select('clickupIntegration')
    .eq('id', organizationId)
    .single()

  const raw = org?.clickupIntegration as ClickUpIntegrationConfig | null
  if (!raw?.enabled || !raw.encryptedToken || !raw.listId) return null

  try {
    const token = decryptToken(raw.encryptedToken)
    return { token, config: raw }
  } catch {
    return null
  }
}

function buildDescription(feedback: {
  id: string
  title?: string | null
  comment: string
  type: string
  severity?: string | null
  pageUrl?: string | null
  projectName?: string
}): string {
  const lines: string[] = []
  lines.push(`**Report no Buug:** [Abrir report](${APP_URL}/feedbacks/${feedback.id})`)
  if (feedback.projectName) lines.push(`**Projeto:** ${feedback.projectName}`)
  lines.push(`**Tipo:** ${feedback.type}`)
  if (feedback.severity) lines.push(`**Severidade:** ${feedback.severity}`)
  if (feedback.pageUrl) lines.push(`**Página:** ${feedback.pageUrl}`)
  lines.push('')
  lines.push(feedback.comment)
  return lines.join('\n')
}

/**
 * Create a ClickUp task for a newly created feedback.
 * Fire-and-forget — never throws to the caller.
 */
export async function syncClickUpCreate(params: {
  organizationId: string
  feedbackId: string
}): Promise<void> {
  try {
    const ctx = await getOrgConfig(params.organizationId)
    if (!ctx) return

    const { data: feedback } = await supabaseAdmin
      .from('Feedback')
      .select('id, clickupTaskId, title, comment, type, severity, pageUrl, projectId, Project:projectId(name)')
      .eq('id', params.feedbackId)
      .single()

    if (!feedback) return
    if (feedback.clickupTaskId) return

    const projectName = (feedback as any).Project?.name || ''
    const taskName = feedback.title || feedback.comment?.slice(0, 80) || 'Report Buug'
    const description = buildDescription({
      id: feedback.id,
      title: feedback.title,
      comment: feedback.comment,
      type: feedback.type,
      severity: feedback.severity,
      pageUrl: feedback.pageUrl,
      projectName,
    })

    const clickUpStatus = ctx.config.statusMapBuugToClickUp?.['OPEN']
    const tags = [feedback.type?.toLowerCase(), feedback.severity?.toLowerCase()].filter(Boolean) as string[]

    const task = await createTask(ctx.token, ctx.config.listId, {
      name: taskName,
      description,
      status: clickUpStatus,
      tags,
    })

    await supabaseAdmin
      .from('Feedback')
      .update({ clickupTaskId: task.id })
      .eq('id', params.feedbackId)
  } catch (err) {
    console.error('[ClickUp sync create]', err instanceof ClickUpError ? err.message : err)
  }
}

/**
 * Update the ClickUp task status when feedback status changes in Buug.
 * Fire-and-forget — never throws to the caller.
 */
export async function syncClickUpStatus(params: {
  organizationId: string
  feedbackId: string
  newStatus: string
  source?: string
}): Promise<void> {
  if (params.source === 'clickup') return

  try {
    const ctx = await getOrgConfig(params.organizationId)
    if (!ctx) return

    const { data: feedback } = await supabaseAdmin
      .from('Feedback')
      .select('clickupTaskId')
      .eq('id', params.feedbackId)
      .single()

    if (!feedback?.clickupTaskId) return

    const clickUpStatus = ctx.config.statusMapBuugToClickUp?.[params.newStatus]
    if (!clickUpStatus) return

    await updateTaskStatus(ctx.token, feedback.clickupTaskId, clickUpStatus)
  } catch (err) {
    console.error('[ClickUp sync status]', err instanceof ClickUpError ? err.message : err)
  }
}
