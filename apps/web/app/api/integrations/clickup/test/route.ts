import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase/server'
import { getAuthorizedUser } from '@/lib/clickup/client'
import {
  fetchOrgIntegrationGate,
  hasActiveIntegrationEntitlement,
  integrationEntitlementErrorBody,
} from '@/lib/integration-entitlement'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

/**
 * POST — Test a ClickUp API token by calling /user.
 * Body: { token: string, orgId: string }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const token = typeof body.token === 'string' ? body.token : ''
  const orgId = typeof body.orgId === 'string' ? body.orgId : ''
  if (!token) {
    return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 })
  }
  if (!orgId) {
    return NextResponse.json({ error: 'orgId obrigatório' }, { status: 400 })
  }

  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: member } = await supabaseAdmin
    .from('TeamMember')
    .select('role')
    .eq('organizationId', orgId)
    .eq('userId', user.id)
    .eq('status', 'ACTIVE')
    .single()

  if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const orgGate = await fetchOrgIntegrationGate(supabaseAdmin, orgId)
  if (!orgGate || !hasActiveIntegrationEntitlement(orgGate)) {
    return NextResponse.json(integrationEntitlementErrorBody(), { status: 403 })
  }

  try {
    const data = await getAuthorizedUser(token)
    return NextResponse.json({
      valid: true,
      user: { username: data.user.username, email: data.user.email },
    })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return NextResponse.json({
      valid: false,
      error: e.status === 401 ? 'Token inválido ou expirado' : (e.message || 'Erro ao conectar'),
    })
  }
}
