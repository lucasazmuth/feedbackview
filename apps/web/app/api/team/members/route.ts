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
    .select('userId, role, inviteEmail')
    .eq('organizationId', orgId)
    .eq('status', 'ACTIVE')

  if (!members || members.length === 0) {
    return NextResponse.json({ members: [] })
  }

  // Enrich with User table + inviteEmail + auth.users as fallbacks
  const userIds = members.map(m => m.userId)
  const { data: users } = await supabaseAdmin
    .from('User')
    .select('id, name, email')
    .in('id', userIds)

  const userMap = new Map((users || []).map(u => [u.id, u]))

  // For members without email, try auth.admin.listUsers
  const missingEmailIds = members.filter(m => !userMap.get(m.userId)?.email && !m.inviteEmail).map(m => m.userId)
  const authUserMap = new Map<string, { email: string; name: string | null }>()
  if (missingEmailIds.length > 0) {
    try {
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 100 })
      if (authData?.users) {
        for (const au of authData.users) {
          if (missingEmailIds.includes(au.id)) {
            authUserMap.set(au.id, {
              email: au.email || '',
              name: au.user_metadata?.name || au.email?.split('@')[0] || null,
            })
          }
        }
      }
    } catch { /* auth admin may not be available */ }
  }

  const enriched = members.map(m => {
    const dbUser = userMap.get(m.userId)
    const authUser = authUserMap.get(m.userId)
    const email = dbUser?.email || m.inviteEmail || authUser?.email || ''
    const name = dbUser?.name || authUser?.name || (email ? email.split('@')[0] : null)
    return { id: m.userId, name, email, role: m.role }
  })

  return NextResponse.json({ members: enriched })
}
