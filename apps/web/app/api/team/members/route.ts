import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) {
    return NextResponse.json({ error: 'orgId obrigatório' }, { status: 400 })
  }

  // Verify user is member of this org
  const { data: membership } = await supabaseAdmin
    .from('TeamMember')
    .select('role')
    .eq('organizationId', orgId)
    .eq('userId', user.id)
    .eq('status', 'ACTIVE')
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  }

  // Fetch all active members
  const { data: members } = await supabaseAdmin
    .from('TeamMember')
    .select('userId, role')
    .eq('organizationId', orgId)
    .eq('status', 'ACTIVE')

  if (!members || members.length === 0) {
    return NextResponse.json({ members: [] })
  }

  const userIds = members.map(m => m.userId)
  const { data: users } = await supabaseAdmin
    .from('User')
    .select('id, name, email')
    .in('id', userIds)

  const userMap = new Map((users || []).map(u => [u.id, u]))

  const enriched = members.map(m => ({
    id: m.userId,
    name: userMap.get(m.userId)?.name || null,
    email: userMap.get(m.userId)?.email || '',
    role: m.role,
  }))

  return NextResponse.json({ members: enriched })
}
