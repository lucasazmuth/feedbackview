import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase/server'
import { encryptToken, decryptToken } from '@/lib/clickup/crypto'
import { getAuthorizedUser, getTeams, getSpaces, getLists } from '@/lib/clickup/client'
import { DEFAULT_STATUS_MAP_BUUG_TO_CLICKUP, DEFAULT_STATUS_MAP_CLICKUP_TO_BUUG } from '@/lib/clickup/types'
import type { ClickUpIntegrationConfig } from '@/lib/clickup/types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

async function resolveOrgId(req: NextRequest): Promise<{ orgId: string; userId: string } | null> {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const orgId = req.nextUrl.searchParams.get('orgId') || ''
  if (!orgId) return null

  const { data: member } = await supabaseAdmin
    .from('TeamMember')
    .select('role')
    .eq('organizationId', orgId)
    .eq('userId', user.id)
    .eq('status', 'ACTIVE')
    .single()

  if (!member || !['OWNER', 'ADMIN'].includes(member.role)) return null
  return { orgId, userId: user.id }
}

/**
 * GET — Read current ClickUp integration config (token masked).
 */
export async function GET(req: NextRequest) {
  const auth = await resolveOrgId(req)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: org } = await supabaseAdmin
    .from('Organization')
    .select('clickupIntegration')
    .eq('id', auth.orgId)
    .single()

  const config = org?.clickupIntegration as ClickUpIntegrationConfig | null

  if (!config?.encryptedToken) {
    return NextResponse.json({ configured: false, config: null })
  }

  let tokenHint = ''
  try {
    const plain = decryptToken(config.encryptedToken)
    tokenHint = plain.slice(-4)
  } catch { /* ignore */ }

  return NextResponse.json({
    configured: true,
    config: {
      enabled: config.enabled,
      tokenHint,
      teamId: config.teamId || '',
      listId: config.listId || '',
      statusMapBuugToClickUp: config.statusMapBuugToClickUp || DEFAULT_STATUS_MAP_BUUG_TO_CLICKUP,
      statusMapClickUpToBuug: config.statusMapClickUpToBuug || DEFAULT_STATUS_MAP_CLICKUP_TO_BUUG,
    },
  })
}

/**
 * PATCH — Save/update ClickUp integration config.
 */
export async function PATCH(req: NextRequest) {
  const auth = await resolveOrgId(req)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()

  const { data: org } = await supabaseAdmin
    .from('Organization')
    .select('clickupIntegration')
    .eq('id', auth.orgId)
    .single()

  const existing = (org?.clickupIntegration || {}) as Partial<ClickUpIntegrationConfig>

  const updated: ClickUpIntegrationConfig = {
    enabled: body.enabled ?? existing.enabled ?? false,
    encryptedToken: body.token ? encryptToken(body.token) : existing.encryptedToken || '',
    teamId: body.teamId ?? existing.teamId ?? '',
    listId: body.listId ?? existing.listId ?? '',
    statusMapBuugToClickUp: body.statusMapBuugToClickUp ?? existing.statusMapBuugToClickUp ?? DEFAULT_STATUS_MAP_BUUG_TO_CLICKUP,
    statusMapClickUpToBuug: body.statusMapClickUpToBuug ?? existing.statusMapClickUpToBuug ?? DEFAULT_STATUS_MAP_CLICKUP_TO_BUUG,
    webhookId: existing.webhookId,
    webhookSecret: existing.webhookSecret,
  }

  const { error } = await supabaseAdmin
    .from('Organization')
    .update({ clickupIntegration: updated })
    .eq('id', auth.orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

/**
 * DELETE — Disconnect ClickUp integration.
 */
export async function DELETE(req: NextRequest) {
  const auth = await resolveOrgId(req)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { error } = await supabaseAdmin
    .from('Organization')
    .update({ clickupIntegration: null })
    .eq('id', auth.orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
