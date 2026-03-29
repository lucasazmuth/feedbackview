import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase/server'
import { decryptToken } from '@/lib/clickup/crypto'
import { getTeams, getSpaces, getLists, getListDetails } from '@/lib/clickup/client'
import {
  fetchOrgIntegrationGate,
  hasActiveIntegrationEntitlement,
  integrationEntitlementErrorBody,
} from '@/lib/integration-entitlement'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

async function resolveOrgAdmin(req: NextRequest, orgId: string): Promise<boolean> {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: member } = await supabaseAdmin
    .from('TeamMember')
    .select('role')
    .eq('organizationId', orgId)
    .eq('userId', user.id)
    .eq('status', 'ACTIVE')
    .single()

  return !!(member && ['OWNER', 'ADMIN'].includes(member.role))
}

async function getOrgToken(orgId: string): Promise<string | null> {
  const { data: org } = await supabaseAdmin
    .from('Organization')
    .select('clickupIntegration')
    .eq('id', orgId)
    .single()

  const enc = (org?.clickupIntegration as { encryptedToken?: string } | null)?.encryptedToken
  if (!enc) return null
  try {
    return decryptToken(enc)
  } catch {
    return null
  }
}

/**
 * POST — Browse ClickUp hierarchy.
 * Body: { token?, useOrgToken?, action, teamId?, spaceId?, listId? }
 * When useOrgToken is true, pass orgId as query param (?orgId=) and use saved org token.
 */
export async function POST(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('orgId') || ''
  if (!orgId) return NextResponse.json({ error: 'orgId obrigatório' }, { status: 400 })

  const adminOk = await resolveOrgAdmin(req, orgId)
  if (!adminOk) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const orgGate = await fetchOrgIntegrationGate(supabaseAdmin, orgId)
  if (!orgGate || !hasActiveIntegrationEntitlement(orgGate)) {
    return NextResponse.json(integrationEntitlementErrorBody(), { status: 403 })
  }

  let body: {
    token?: string
    useOrgToken?: boolean
    action?: string
    teamId?: string
    spaceId?: string
    listId?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { token: bodyToken, useOrgToken, action, teamId, spaceId, listId } = body

  let token = typeof bodyToken === 'string' ? bodyToken : ''
  if (!token && useOrgToken) {
    const t = await getOrgToken(orgId)
    if (!t) return NextResponse.json({ error: 'ClickUp não configurado para esta organização' }, { status: 400 })
    token = t
  }

  if (!token) return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 })

  try {
    if (action === 'teams') {
      const teams = await getTeams(token)
      return NextResponse.json({ teams })
    }
    if (action === 'spaces' && teamId) {
      const spaces = await getSpaces(token, teamId)
      return NextResponse.json({ spaces })
    }
    if (action === 'lists' && spaceId) {
      const lists = await getLists(token, spaceId)
      return NextResponse.json({ lists })
    }
    if (action === 'list' && listId) {
      const details = await getListDetails(token, listId)
      return NextResponse.json({
        list: {
          id: details.id,
          name: details.name,
          statuses: details.statuses,
          customFields: details.customFields,
        },
      })
    }
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao buscar dados do ClickUp' }, { status: 500 })
  }
}
