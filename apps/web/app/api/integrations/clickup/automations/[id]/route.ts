import { NextRequest, NextResponse } from 'next/server'
import { resolveClickUpOrgAdmin, supabaseAdmin } from '@/lib/clickup/org-admin'
import {
  fetchOrgIntegrationGate,
  hasActiveIntegrationEntitlement,
  integrationEntitlementErrorBody,
} from '@/lib/integration-entitlement'

type Ctx = { params: Promise<{ id: string }> }

/**
 * PATCH — Update automation metadata and/or replace linked projects.
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await resolveClickUpOrgAdmin(req)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const orgGatePatch = await fetchOrgIntegrationGate(supabaseAdmin, auth.orgId)
  if (!orgGatePatch || !hasActiveIntegrationEntitlement(orgGatePatch)) {
    return NextResponse.json(integrationEntitlementErrorBody(), { status: 403 })
  }

  const { id } = await params

  const { data: existing, error: exErr } = await supabaseAdmin
    .from('ClickUpAutomation')
    .select('id')
    .eq('id', id)
    .eq('organizationId', auth.orgId)
    .maybeSingle()

  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 })
  if (!existing) return NextResponse.json({ error: 'Automação não encontrada' }, { status: 404 })

  const body = await req.json()

  const patch: Record<string, unknown> = {}
  if (body.name !== undefined) patch.name = body.name === null || body.name === '' ? null : String(body.name).trim()
  if (body.enabled !== undefined) patch.enabled = Boolean(body.enabled)
  if (body.clickupTeamId !== undefined) patch.clickupTeamId = String(body.clickupTeamId || '').trim()
  if (body.clickupSpaceId !== undefined) patch.clickupSpaceId = String(body.clickupSpaceId || '').trim()
  if (body.clickupListId !== undefined) patch.clickupListId = String(body.clickupListId || '').trim()
  if (body.listPath !== undefined) patch.listPath = body.listPath == null || body.listPath === '' ? null : String(body.listPath).trim()

  if (Object.keys(patch).length > 0) {
    patch.updatedAt = new Date().toISOString()
    const team = (patch.clickupTeamId as string) ?? ''
    const space = (patch.clickupSpaceId as string) ?? ''
    const list = (patch.clickupListId as string) ?? ''
    if (patch.clickupTeamId !== undefined && !team) {
      return NextResponse.json({ error: 'Workspace ClickUp obrigatório.' }, { status: 400 })
    }
    if (patch.clickupSpaceId !== undefined && !space) {
      return NextResponse.json({ error: 'Espaço ClickUp obrigatório.' }, { status: 400 })
    }
    if (patch.clickupListId !== undefined && !list) {
      return NextResponse.json({ error: 'Lista ClickUp obrigatória.' }, { status: 400 })
    }

    const { error: upErr } = await supabaseAdmin
      .from('ClickUpAutomation')
      .update(patch)
      .eq('id', id)
      .eq('organizationId', auth.orgId)

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  if (Array.isArray(body.projectIds)) {
    const unique = [...new Set(body.projectIds.filter(Boolean) as string[])]
    if (unique.length === 0) {
      return NextResponse.json({ error: 'Selecione um projeto Buug.' }, { status: 400 })
    }
    if (unique.length !== 1) {
      return NextResponse.json({ error: 'Cada automação pode ter apenas um projeto Buug.' }, { status: 400 })
    }
    const { data: rows, error: pErr } = await supabaseAdmin
      .from('Project')
      .select('id')
      .eq('organizationId', auth.orgId)
      .in('id', unique)

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
    if (!rows || rows.length !== unique.length) {
      return NextResponse.json({ error: 'Um ou mais projetos não pertencem a esta organização.' }, { status: 400 })
    }

    await supabaseAdmin.from('ClickUpAutomationProject').delete().eq('automationId', id)

    const { error: delErr } = await supabaseAdmin
      .from('ClickUpAutomationProject')
      .delete()
      .in('projectId', unique)

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    const linkRows = unique.map(projectId => ({ automationId: id, projectId }))
    const { error: linkErr } = await supabaseAdmin.from('ClickUpAutomationProject').insert(linkRows)

    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

/**
 * DELETE — Remove automation and its project links.
 */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = await resolveClickUpOrgAdmin(req)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  const { error } = await supabaseAdmin
    .from('ClickUpAutomation')
    .delete()
    .eq('id', id)
    .eq('organizationId', auth.orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
