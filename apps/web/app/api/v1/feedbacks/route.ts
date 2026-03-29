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
  if (!apiKey) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  if (!hasPermission(apiKey.permissions, 'read:feedbacks')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  if (isApiRateLimited(apiKey.id)) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const orgGate = await fetchOrgIntegrationGate(supabase, apiKey.organizationId)
  if (!orgGate || !hasActiveIntegrationEntitlement(orgGate)) {
    return NextResponse.json(integrationEntitlementErrorBody(), { status: 403 })
  }

  const params = req.nextUrl.searchParams
  const projectId = params.get('project_id')
  const status = params.get('status')
  const type = params.get('type')
  const severity = params.get('severity')
  const page = parseInt(params.get('page') || '1', 10)
  const perPage = Math.min(parseInt(params.get('per_page') || '50', 10), 100)

  // Get org's project IDs
  const { data: projects } = await supabase
    .from('Project')
    .select('id')
    .eq('organizationId', apiKey.organizationId)
    .is('archivedAt', null)

  const projectIds = projects?.map(p => p.id) || []
  if (projectIds.length === 0) return NextResponse.json({ data: [], meta: { total: 0, page, per_page: perPage } })

  let query = supabase
    .from('Feedback')
    .select('id, projectId, title, comment, type, severity, status, pageUrl, screenshotUrl, dueDate, startDate, createdAt, Project:projectId(id, name)', { count: 'exact' })
    .in('projectId', projectId ? [projectId] : projectIds)
    .is('archivedAt', null)

  if (status) query = query.eq('status', status)
  if (type) query = query.eq('type', type)
  if (severity) query = query.eq('severity', severity)

  query = query
    .order('createdAt', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: data || [],
    meta: { total: count || 0, page, per_page: perPage },
  })
}
