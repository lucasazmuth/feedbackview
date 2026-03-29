import { createClient } from '@supabase/supabase-js'
import { hasActiveIntegrationEntitlement, type OrgIntegrationGate } from '@/lib/integration-entitlement'
import { decryptToken } from './crypto'
import { createTask, updateTaskStatus, getListDetails, ClickUpError } from './client'
import type { ClickUpCustomFieldDef, ClickUpCustomFieldMap, ClickUpIntegrationConfig } from './types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://buug.io'

async function getOrgClickUpContext(
  organizationId: string,
): Promise<{ token: string; config: ClickUpIntegrationConfig } | null> {
  const { data: org } = await supabaseAdmin
    .from('Organization')
    .select('clickupIntegration, plan, stripeSubscriptionId, planExpiresAt')
    .eq('id', organizationId)
    .single()

  const gate: OrgIntegrationGate = {
    plan: org?.plan,
    stripeSubscriptionId: org?.stripeSubscriptionId,
    planExpiresAt: org?.planExpiresAt,
  }
  if (!org || !hasActiveIntegrationEntitlement(gate)) return null

  const raw = org?.clickupIntegration as ClickUpIntegrationConfig | null
  if (!raw?.enabled || !raw.encryptedToken) return null

  try {
    const token = decryptToken(raw.encryptedToken)
    return { token, config: raw }
  } catch {
    return null
  }
}

function severityToClickUpPriority(severity: string | null | undefined): number | null {
  if (!severity) return null
  const s = severity.toUpperCase()
  if (s === 'CRITICAL') return 1
  if (s === 'HIGH') return 2
  if (s === 'MEDIUM') return 3
  if (s === 'LOW') return 4
  return 3
}

function parseDueDateMs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : null
}

function buildMarkdownDescription(
  feedback: {
    id: string
    comment: string
    type: string
    severity?: string | null
    pageUrl?: string | null
    projectName?: string
  },
  map: ClickUpCustomFieldMap | undefined,
): string {
  const lines: string[] = []
  lines.push(`**Report no Buug:** [Abrir report](${APP_URL}/feedbacks/${feedback.id})`)

  const skipType = !!map?.typeFieldId
  const skipSeverity = !!map?.severityFieldId
  const skipProject = !!map?.projectFieldId
  const skipPage = !!map?.pageUrlFieldId

  if (!skipProject && feedback.projectName) lines.push(`**Projeto:** ${feedback.projectName}`)
  if (!skipType) lines.push(`**Tipo:** ${feedback.type}`)
  if (!skipSeverity && feedback.severity) lines.push(`**Severidade:** ${feedback.severity}`)
  if (!skipPage && feedback.pageUrl) lines.push(`**Página:** ${feedback.pageUrl}`)

  if (lines.length > 1) lines.push('')
  lines.push(feedback.comment)
  return lines.join('\n')
}

function fieldById(fields: ClickUpCustomFieldDef[], id: string): ClickUpCustomFieldDef | undefined {
  return fields.find(f => f.id === id)
}

function valueForCustomField(
  field: ClickUpCustomFieldDef,
  raw: string,
): string | number | null {
  const t = field.type
  if (['short_text', 'text', 'url', 'email', 'phone', 'location'].includes(t)) {
    return raw
  }
  if (t === 'drop_down' && field.typeConfig?.options?.length) {
    const match = field.typeConfig.options.find(
      o => o.name.toLowerCase() === raw.toLowerCase(),
    )
    if (match) return match.id
    const byOrder = field.typeConfig.options.find(
      o => String(o.orderindex) === raw || o.id === raw,
    )
    if (byOrder) return byOrder.id
  }
  if (t === 'labels' && field.typeConfig?.options?.length) {
    const match = field.typeConfig.options.find(
      o => o.name.toLowerCase() === raw.toLowerCase(),
    )
    if (match) return match.id
  }
  return null
}

function buildCustomFieldPayload(
  defs: ClickUpCustomFieldDef[],
  map: ClickUpCustomFieldMap | undefined,
  values: {
    type: string
    severity: string
    projectName: string
    pageUrl: string
  },
): { id: string; value: string | number }[] {
  if (!map) return []
  const out: { id: string; value: string | number }[] = []

  const tryAdd = (fieldId: string | undefined, text: string) => {
    if (!fieldId || !text) return
    const field = fieldById(defs, fieldId)
    if (!field) return
    const v = valueForCustomField(field, text)
    if (v != null) out.push({ id: fieldId, value: v })
  }

  tryAdd(map.typeFieldId, values.type)
  tryAdd(map.severityFieldId, values.severity)
  tryAdd(map.projectFieldId, values.projectName)
  tryAdd(map.pageUrlFieldId, values.pageUrl)

  return out
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
    const ctx = await getOrgClickUpContext(params.organizationId)
    if (!ctx) return

    const { data: feedback } = await supabaseAdmin
      .from('Feedback')
      .select(
        'id, clickupTaskId, title, comment, type, severity, pageUrl, dueDate, projectId, Project:projectId(name, clickupListId)',
      )
      .eq('id', params.feedbackId)
      .single()

    if (!feedback) return
    if (feedback.clickupTaskId) return

    const project = (feedback as any).Project as
      | { name?: string; clickupListId?: string | null }
      | undefined
    const projectName = project?.name || ''

    let effectiveListId = ''
    const { data: autoLink } = await supabaseAdmin
      .from('ClickUpAutomationProject')
      .select('automationId')
      .eq('projectId', feedback.projectId)
      .maybeSingle()

    if (autoLink?.automationId) {
      const { data: automation } = await supabaseAdmin
        .from('ClickUpAutomation')
        .select('clickupListId, enabled')
        .eq('id', autoLink.automationId)
        .eq('organizationId', params.organizationId)
        .maybeSingle()
      if (automation?.enabled !== false && automation?.clickupListId) {
        effectiveListId = automation.clickupListId
      }
    }

    if (!effectiveListId) {
      effectiveListId = project?.clickupListId || ''
    }
    if (!effectiveListId) return

    const taskName = feedback.title || feedback.comment?.slice(0, 80) || 'Report Buug'
    const map = ctx.config.customFieldMap

    let customFieldDefs: ClickUpCustomFieldDef[] = []
    if (map && Object.values(map).some(Boolean)) {
      try {
        const details = await getListDetails(ctx.token, effectiveListId)
        customFieldDefs = details.customFields
      } catch {
        customFieldDefs = []
      }
    }

    const cfPayload = buildCustomFieldPayload(customFieldDefs, map, {
      type: feedback.type,
      severity: feedback.severity || '',
      projectName,
      pageUrl: feedback.pageUrl || '',
    })

    const description = buildMarkdownDescription(
      {
        id: feedback.id,
        comment: feedback.comment,
        type: feedback.type,
        severity: feedback.severity,
        pageUrl: feedback.pageUrl,
        projectName,
      },
      map,
    )

    const clickUpStatus = ctx.config.statusMapBuugToClickUp?.['OPEN']
    const tags = [feedback.type?.toLowerCase(), feedback.severity?.toLowerCase()].filter(Boolean) as string[]

    const task = await createTask(ctx.token, effectiveListId, {
      name: taskName,
      description,
      status: clickUpStatus,
      tags,
      priority: severityToClickUpPriority(feedback.severity),
      dueDateMs: parseDueDateMs(feedback.dueDate),
      dueDateTime: Boolean(
        feedback.dueDate && /T\d{2}:\d{2}/.test(String(feedback.dueDate)),
      ),
      customFields: cfPayload.length ? cfPayload : undefined,
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
    const ctx = await getOrgClickUpContext(params.organizationId)
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
