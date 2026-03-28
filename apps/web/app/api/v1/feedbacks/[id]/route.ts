import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateApiKey, hasPermission, isApiRateLimited } from '@/lib/api-auth'
import { dispatchWebhookEvent } from '@/lib/webhook-dispatcher'
import { syncClickUpStatus } from '@/lib/clickup/sync'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/v1/feedbacks/:id
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const apiKey = await validateApiKey(req.headers.get('authorization'))
  if (!apiKey) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  if (!hasPermission(apiKey.permissions, 'read:feedbacks')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  if (isApiRateLimited(apiKey.id)) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const { data, error } = await supabase
    .from('Feedback')
    .select('*, Project:projectId(id, name, organizationId)')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })

  // Verify ownership
  if ((data as any).Project?.organizationId !== apiKey.organizationId) {
    return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
  }

  return NextResponse.json({ data })
}

// PATCH /api/v1/feedbacks/:id — Update status, due date, etc.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const apiKey = await validateApiKey(req.headers.get('authorization'))
  if (!apiKey) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  if (!hasPermission(apiKey.permissions, 'write:feedbacks')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  if (isApiRateLimited(apiKey.id)) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const body = await req.json()
  const allowedFields: Record<string, any> = {}

  if (body.status && ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'RESOLVED', 'CANCELLED'].includes(body.status)) {
    allowedFields.status = body.status
  }
  if (body.dueDate !== undefined) allowedFields.dueDate = body.dueDate || null
  if (body.startDate !== undefined) allowedFields.startDate = body.startDate || null

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Verify ownership first
  const { data: existing } = await supabase
    .from('Feedback')
    .select('id, status, projectId, Project:projectId(organizationId)')
    .eq('id', id)
    .single()

  if (!existing || (existing as any).Project?.organizationId !== apiKey.organizationId) {
    return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('Feedback')
    .update(allowedFields)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Dispatch webhook + ClickUp sync if status changed (fire-and-forget)
  if (allowedFields.status && allowedFields.status !== existing.status) {
    void dispatchWebhookEvent({
      organizationId: apiKey.organizationId,
      event: 'feedback.status_changed',
      payload: { feedbackId: id, oldStatus: existing.status, newStatus: allowedFields.status },
    })
    void syncClickUpStatus({ organizationId: apiKey.organizationId, feedbackId: id, newStatus: allowedFields.status })
  }

  return NextResponse.json({ data: { id, ...allowedFields } })
}
