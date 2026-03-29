import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { generateApiKey } from '@/lib/api-auth'
import {
  fetchOrgIntegrationGate,
  hasActiveIntegrationEntitlement,
  integrationEntitlementErrorBody,
} from '@/lib/integration-entitlement'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/keys — List API keys for user's org
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId obrigatório' }, { status: 400 })

  // Verify user is member of org
  const { data: member } = await supabaseAdmin
    .from('TeamMember')
    .select('role')
    .eq('organizationId', orgId)
    .eq('userId', user.id)
    .eq('status', 'ACTIVE')
    .single()

  if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { data: keys } = await supabaseAdmin
    .from('ApiKey')
    .select('id, name, prefix, permissions, lastUsedAt, createdAt, expiresAt')
    .eq('organizationId', orgId)
    .order('createdAt', { ascending: false })

  return NextResponse.json({ keys: keys || [] })
}

// POST /api/keys — Create new API key
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { orgId, name, permissions } = await req.json()
  if (!orgId || !name) return NextResponse.json({ error: 'orgId e name obrigatórios' }, { status: 400 })

  // Verify user is OWNER or ADMIN
  const { data: member } = await supabaseAdmin
    .from('TeamMember')
    .select('role')
    .eq('organizationId', orgId)
    .eq('userId', user.id)
    .eq('status', 'ACTIVE')
    .single()

  if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const orgGate = await fetchOrgIntegrationGate(supabaseAdmin, orgId)
  if (!orgGate || !hasActiveIntegrationEntitlement(orgGate)) {
    return NextResponse.json(integrationEntitlementErrorBody(), { status: 403 })
  }

  const { key, keyHash, prefix } = generateApiKey()

  const { error } = await supabaseAdmin
    .from('ApiKey')
    .insert({
      organizationId: orgId,
      name,
      keyHash,
      prefix,
      permissions: permissions || ['read:feedbacks', 'read:projects', 'write:feedbacks'],
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return the full key ONLY on creation (never stored in plaintext)
  return NextResponse.json({ key, prefix, name })
}

// DELETE /api/keys — Revoke API key
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id, orgId } = await req.json()
  if (!id || !orgId) return NextResponse.json({ error: 'id e orgId obrigatórios' }, { status: 400 })

  // Verify permission
  const { data: member } = await supabaseAdmin
    .from('TeamMember')
    .select('role')
    .eq('organizationId', orgId)
    .eq('userId', user.id)
    .eq('status', 'ACTIVE')
    .single()

  if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  await supabaseAdmin.from('ApiKey').delete().eq('id', id).eq('organizationId', orgId)

  return NextResponse.json({ success: true })
}
