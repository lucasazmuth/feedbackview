import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateApiKey, hasPermission, isApiRateLimited } from '@/lib/api-auth'
import {
  fetchOrgIntegrationGate,
  hasActiveIntegrationEntitlement,
  integrationEntitlementErrorBody,
} from '@/lib/integration-entitlement'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const apiKey = await validateApiKey(req.headers.get('authorization'))
  if (!apiKey) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  if (!hasPermission(apiKey.permissions, 'read:projects')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  if (isApiRateLimited(apiKey.id)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Max 100 requests/minute.' }, { status: 429 })
  }

  const orgGate = await fetchOrgIntegrationGate(supabase, apiKey.organizationId)
  if (!orgGate || !hasActiveIntegrationEntitlement(orgGate)) {
    return NextResponse.json(integrationEntitlementErrorBody(), { status: 403 })
  }

  const { data, error } = await supabase
    .from('Project')
    .select('id, name, targetUrl, mode, createdAt, embedLastSeenAt, embedPaused')
    .eq('organizationId', apiKey.organizationId)
    .is('archivedAt', null)
    .order('createdAt', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: data || [],
    meta: { total: data?.length || 0 },
  })
}
