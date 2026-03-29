import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { resolveClickUpOrgAdmin, supabaseAdmin } from '@/lib/clickup/org-admin'
import {
  fetchOrgIntegrationGate,
  hasActiveIntegrationEntitlement,
  integrationEntitlementErrorBody,
} from '@/lib/integration-entitlement'

type AutomationRow = {
  id: string
  organizationId: string
  name: string | null
  enabled: boolean
  clickupTeamId: string
  clickupSpaceId: string
  clickupListId: string
  listPath: string | null
  createdAt: string
  updatedAt: string
}

async function assertOrgProjects(orgId: string, projectIds: string[]): Promise<{ ok: true } | { ok: false; error: string }> {
  const unique = [...new Set(projectIds.filter(Boolean))]
  if (unique.length === 0) return { ok: false, error: 'Selecione um projeto Buug.' }
  if (unique.length !== 1) return { ok: false, error: 'Cada automação pode ter apenas um projeto Buug.' }
  const { data: rows, error } = await supabaseAdmin
    .from('Project')
    .select('id')
    .eq('organizationId', orgId)
    .in('id', unique)

  if (error) return { ok: false, error: error.message }
  if (!rows || rows.length !== unique.length) {
    return { ok: false, error: 'Um ou mais projetos não pertencem a esta organização.' }
  }
  return { ok: true }
}

/**
 * GET — List ClickUp automations for the org (with linked project ids and names).
 */
export async function GET(req: NextRequest) {
  const auth = await resolveClickUpOrgAdmin(req)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const orgGateGet = await fetchOrgIntegrationGate(supabaseAdmin, auth.orgId)
  if (!orgGateGet || !hasActiveIntegrationEntitlement(orgGateGet)) {
    return NextResponse.json(integrationEntitlementErrorBody(), { status: 403 })
  }

  const { data: automations, error: aErr } = await supabaseAdmin
    .from('ClickUpAutomation')
    .select('*')
    .eq('organizationId', auth.orgId)
    .order('createdAt', { ascending: true })

  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })

  const list = (automations || []) as AutomationRow[]
  if (list.length === 0) {
    return NextResponse.json({ automations: [] })
  }

  const ids = list.map(a => a.id)
  const { data: links, error: lErr } = await supabaseAdmin
    .from('ClickUpAutomationProject')
    .select('automationId, projectId, Project:projectId(id, name)')
    .in('automationId', ids)

  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 })

  const byAuto = new Map<string, { id: string; name: string }[]>()
  for (const row of links || []) {
    const r = row as {
      automationId: string
      projectId: string
      Project?: { id: string; name: string } | { id: string; name: string }[] | null
    }
    const p = r.Project == null ? null : Array.isArray(r.Project) ? r.Project[0] : r.Project
    const name = p?.name || r.projectId
    const arr = byAuto.get(r.automationId) || []
    arr.push({ id: r.projectId, name })
    byAuto.set(r.automationId, arr)
  }

  return NextResponse.json({
    automations: list.map(a => ({
      ...a,
      projects: byAuto.get(a.id) || [],
    })),
  })
}

/**
 * POST — Create automation and attach Buug projects (steals projects from other automations if needed).
 */
export async function POST(req: NextRequest) {
  const auth = await resolveClickUpOrgAdmin(req)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const orgGatePost = await fetchOrgIntegrationGate(supabaseAdmin, auth.orgId)
  if (!orgGatePost || !hasActiveIntegrationEntitlement(orgGatePost)) {
    return NextResponse.json(integrationEntitlementErrorBody(), { status: 403 })
  }

  const body = await req.json()
  const projectIds: string[] = Array.isArray(body.projectIds) ? body.projectIds.filter(Boolean) : []
  const clickupTeamId = String(body.clickupTeamId || '').trim()
  const clickupSpaceId = String(body.clickupSpaceId || '').trim()
  const clickupListId = String(body.clickupListId || '').trim()
  const listPath = body.listPath != null ? String(body.listPath).trim() || null : null
  const name = body.name != null ? String(body.name).trim() || null : null
  const enabled = body.enabled !== false

  if (!clickupTeamId || !clickupSpaceId || !clickupListId) {
    return NextResponse.json(
      { error: 'Workspace, espaço e lista ClickUp são obrigatórios.' },
      { status: 400 },
    )
  }

  const check = await assertOrgProjects(auth.orgId, projectIds)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  const id = randomUUID()
  const now = new Date().toISOString()

  const { error: insErr } = await supabaseAdmin.from('ClickUpAutomation').insert({
    id,
    organizationId: auth.orgId,
    name,
    enabled,
    clickupTeamId,
    clickupSpaceId,
    clickupListId,
    listPath,
    createdAt: now,
    updatedAt: now,
  })

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  const { error: delErr } = await supabaseAdmin
    .from('ClickUpAutomationProject')
    .delete()
    .in('projectId', projectIds)

  if (delErr) {
    await supabaseAdmin.from('ClickUpAutomation').delete().eq('id', id)
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  const linkRows = projectIds.map(projectId => ({ automationId: id, projectId }))
  const { error: linkErr } = await supabaseAdmin.from('ClickUpAutomationProject').insert(linkRows)

  if (linkErr) {
    await supabaseAdmin.from('ClickUpAutomation').delete().eq('id', id)
    return NextResponse.json({ error: linkErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, id })
}
