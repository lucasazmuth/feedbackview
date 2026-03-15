import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, orgId, role } = await req.json()

    if (!email || !orgId) {
      return NextResponse.json({ error: 'email and orgId are required' }, { status: 400 })
    }

    const inviteRole = role || 'MEMBER'
    if (!['ADMIN', 'MEMBER', 'VIEWER'].includes(inviteRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Verify the requester is OWNER or ADMIN of this org
    const { data: requesterMembership } = await supabaseAdmin
      .from('TeamMember')
      .select('role')
      .eq('organizationId', orgId)
      .eq('userId', user.id)
      .eq('status', 'ACTIVE')
      .single()

    if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check member limit
    const { count: activeCount } = await supabaseAdmin
      .from('TeamMember')
      .select('id', { count: 'exact', head: true })
      .eq('organizationId', orgId)
      .eq('status', 'ACTIVE')

    const { data: org } = await supabaseAdmin
      .from('Organization')
      .select('maxMembers')
      .eq('id', orgId)
      .single()

    if (org && activeCount !== null && activeCount >= (org.maxMembers || 1)) {
      return NextResponse.json({
        error: `Limite de ${org.maxMembers || 1} membro(s) atingido. Faça upgrade para convidar mais membros.`,
      }, { status: 403 })
    }

    // Check if already has a pending invite for this email in this org
    const { data: existingInvite } = await supabaseAdmin
      .from('TeamMember')
      .select('id')
      .eq('organizationId', orgId)
      .eq('inviteEmail', email.toLowerCase())
      .eq('status', 'PENDING')
      .single()

    if (existingInvite) {
      return NextResponse.json({ error: 'Já existe um convite pendente para este email.' }, { status: 409 })
    }

    // Check if user with this email is already an active member
    // Look up user by email in auth.users via admin API
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const targetUser = users?.find((u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase())

    if (targetUser) {
      const { data: existingMember } = await supabaseAdmin
        .from('TeamMember')
        .select('id')
        .eq('organizationId', orgId)
        .eq('userId', targetUser.id)
        .eq('status', 'ACTIVE')
        .single()

      if (existingMember) {
        return NextResponse.json({ error: 'Este usuário já é membro da organização.' }, { status: 409 })
      }
    }

    // Create pending invite
    const inviteId = `inv_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`

    const { error: insertError } = await supabaseAdmin
      .from('TeamMember')
      .insert({
        id: inviteId,
        organizationId: orgId,
        userId: targetUser?.id || null,
        inviteEmail: email.toLowerCase(),
        role: inviteRole,
        status: 'PENDING',
      })

    if (insertError) {
      console.error('Error creating invite:', insertError)
      return NextResponse.json({ error: 'Erro ao criar convite.' }, { status: 500 })
    }

    return NextResponse.json({ id: inviteId, status: 'PENDING' })
  } catch (err) {
    console.error('Invite error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
