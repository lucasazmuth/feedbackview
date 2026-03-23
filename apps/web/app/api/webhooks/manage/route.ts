import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const VALID_EVENTS = [
  'feedback.created',
  'feedback.status_changed',
  'feedback.assigned',
  'feedback.due_date_set',
  'project.created',
  '*',
]

// GET — List webhooks
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId obrigatório' }, { status: 400 })

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

  const { data: webhooks } = await supabaseAdmin
    .from('Webhook')
    .select('id, url, events, active, createdAt')
    .eq('organizationId', orgId)
    .order('createdAt', { ascending: false })

  return NextResponse.json({ webhooks: webhooks || [] })
}

// POST — Create webhook
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { orgId, url, events } = await req.json()
  if (!orgId || !url) return NextResponse.json({ error: 'orgId e url obrigatórios' }, { status: 400 })

  // Validate URL
  try { new URL(url) } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
  }

  // Validate events
  const validEvents = (events || ['feedback.created']).filter((e: string) => VALID_EVENTS.includes(e))
  if (validEvents.length === 0) {
    return NextResponse.json({ error: 'Pelo menos um evento válido é obrigatório' }, { status: 400 })
  }

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

  const secret = `whsec_${randomBytes(24).toString('hex')}`

  const { data: webhook, error } = await supabaseAdmin
    .from('Webhook')
    .insert({
      organizationId: orgId,
      url,
      events: validEvents,
      secret,
    })
    .select('id, url, events, secret, active, createdAt')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ webhook })
}

// DELETE — Remove webhook
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id, orgId } = await req.json()
  if (!id || !orgId) return NextResponse.json({ error: 'id e orgId obrigatórios' }, { status: 400 })

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

  await supabaseAdmin.from('Webhook').delete().eq('id', id).eq('organizationId', orgId)

  return NextResponse.json({ success: true })
}
