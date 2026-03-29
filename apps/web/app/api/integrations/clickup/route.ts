import { NextRequest, NextResponse } from 'next/server'
import { encryptToken, decryptToken } from '@/lib/clickup/crypto'
import { resolveClickUpOrgAdmin, supabaseAdmin } from '@/lib/clickup/org-admin'
import {
  fetchOrgIntegrationGate,
  hasActiveIntegrationEntitlement,
  integrationEntitlementErrorBody,
} from '@/lib/integration-entitlement'
import { DEFAULT_STATUS_MAP_BUUG_TO_CLICKUP, DEFAULT_STATUS_MAP_CLICKUP_TO_BUUG } from '@/lib/clickup/types'
import type { ClickUpCustomFieldMap, ClickUpIntegrationConfig } from '@/lib/clickup/types'

/**
 * GET — Read current ClickUp integration config (token masked) + org projects for list binding.
 */
export async function GET(req: NextRequest) {
  const auth = await resolveClickUpOrgAdmin(req)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: org } = await supabaseAdmin
    .from('Organization')
    .select('clickupIntegration')
    .eq('id', auth.orgId)
    .single()

  const config = org?.clickupIntegration as ClickUpIntegrationConfig | null

  // Same idea as serverApi.projects.list: include org-linked projects plus the
  // current user's projects with no organizationId (legacy / personal), which
  // still appear on the dashboard but were excluded by .eq('organizationId', orgId) only.
  const { data: projects } = await supabaseAdmin
    .from('Project')
    .select('id, name, organizationId')
    .or(
      `organizationId.eq.${auth.orgId},and(ownerId.eq.${auth.userId},organizationId.is.null)`,
    )
    .order('name', { ascending: true })

  if (!config?.encryptedToken) {
    return NextResponse.json({
      configured: false,
      config: null,
      projects: projects || [],
    })
  }

  let tokenHint = ''
  try {
    const plain = decryptToken(config.encryptedToken)
    tokenHint = plain.slice(-4)
  } catch { /* ignore */ }

  const statusReferenceListId = config.statusReferenceListId || ''

  return NextResponse.json({
    configured: true,
    config: {
      enabled: config.enabled,
      tokenHint,
      teamId: config.teamId || '',
      statusReferenceListId,
      statusMapBuugToClickUp: config.statusMapBuugToClickUp || DEFAULT_STATUS_MAP_BUUG_TO_CLICKUP,
      statusMapClickUpToBuug: config.statusMapClickUpToBuug || DEFAULT_STATUS_MAP_CLICKUP_TO_BUUG,
      customFieldMap: config.customFieldMap || {},
    },
    projects: projects || [],
  })
}

/**
 * PATCH — Save/update ClickUp integration config.
 */
export async function PATCH(req: NextRequest) {
  const auth = await resolveClickUpOrgAdmin(req)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const orgGate = await fetchOrgIntegrationGate(supabaseAdmin, auth.orgId)
  if (!orgGate || !hasActiveIntegrationEntitlement(orgGate)) {
    return NextResponse.json(integrationEntitlementErrorBody(), { status: 403 })
  }

  const body = await req.json()

  const { data: org } = await supabaseAdmin
    .from('Organization')
    .select('clickupIntegration')
    .eq('id', auth.orgId)
    .single()

  const existing = (org?.clickupIntegration || {}) as Partial<ClickUpIntegrationConfig>

  const nextCustomFieldMap: ClickUpCustomFieldMap | undefined =
    body.customFieldMap !== undefined ? body.customFieldMap : existing.customFieldMap

  const updated: ClickUpIntegrationConfig = {
    enabled: body.enabled ?? existing.enabled ?? false,
    encryptedToken: body.token ? encryptToken(body.token) : existing.encryptedToken || '',
    teamId: body.teamId ?? existing.teamId ?? '',
    listId: undefined,
    statusReferenceListId:
      body.statusReferenceListId !== undefined
        ? body.statusReferenceListId === null || body.statusReferenceListId === ''
          ? undefined
          : body.statusReferenceListId
        : existing.statusReferenceListId,
    statusMapBuugToClickUp: DEFAULT_STATUS_MAP_BUUG_TO_CLICKUP,
    statusMapClickUpToBuug: DEFAULT_STATUS_MAP_CLICKUP_TO_BUUG,
    customFieldMap: nextCustomFieldMap,
    webhookId: existing.webhookId,
    webhookSecret: existing.webhookSecret,
  }

  if (updated.enabled && !updated.encryptedToken) {
    return NextResponse.json({ error: 'Token ClickUp obrigatório para ativar.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('Organization')
    .update({ clickupIntegration: updated })
    .eq('id', auth.orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

/**
 * DELETE — Disconnect ClickUp integration and clear per-project list bindings.
 */
export async function DELETE(req: NextRequest) {
  const auth = await resolveClickUpOrgAdmin(req)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { error: autoErr } = await supabaseAdmin
    .from('ClickUpAutomation')
    .delete()
    .eq('organizationId', auth.orgId)

  if (autoErr) return NextResponse.json({ error: autoErr.message }, { status: 500 })

  const { error: orgErr } = await supabaseAdmin
    .from('Organization')
    .update({ clickupIntegration: null })
    .eq('id', auth.orgId)

  if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 })

  await supabaseAdmin
    .from('Project')
    .update({ clickupListId: null, clickupListPath: null })
    .eq('organizationId', auth.orgId)

  return NextResponse.json({ success: true })
}
