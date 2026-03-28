import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { ClickUpIntegrationConfig } from '@/lib/clickup/types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

/**
 * POST — Inbound webhook from ClickUp.
 * ClickUp sends task events here; we map status changes back to Buug.
 */
export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event = body.event
  const taskId = body.task_id

  if (!taskId) return NextResponse.json({ ok: true })

  if (event !== 'taskStatusUpdated') {
    return NextResponse.json({ ok: true })
  }

  const newClickUpStatus = (
    body.history_items?.[0]?.after?.status || ''
  ).toLowerCase().trim()

  if (!newClickUpStatus) return NextResponse.json({ ok: true })

  const { data: feedback } = await supabaseAdmin
    .from('Feedback')
    .select('id, status, projectId, Project:projectId(organizationId)')
    .eq('clickupTaskId', taskId)
    .single()

  if (!feedback) return NextResponse.json({ ok: true })

  const orgId = (feedback as any).Project?.organizationId
  if (!orgId) return NextResponse.json({ ok: true })

  const { data: org } = await supabaseAdmin
    .from('Organization')
    .select('clickupIntegration')
    .eq('id', orgId)
    .single()

  const config = org?.clickupIntegration as ClickUpIntegrationConfig | null
  if (!config?.enabled) return NextResponse.json({ ok: true })

  const buugStatus = config.statusMapClickUpToBuug?.[newClickUpStatus]
  if (!buugStatus) return NextResponse.json({ ok: true })

  if (buugStatus === feedback.status) return NextResponse.json({ ok: true })

  await supabaseAdmin
    .from('Feedback')
    .update({ status: buugStatus })
    .eq('id', feedback.id)

  return NextResponse.json({ ok: true, updated: feedback.id })
}
