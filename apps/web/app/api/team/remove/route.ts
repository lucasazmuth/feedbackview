import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'

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

    const { memberId, orgId } = await req.json()

    if (!memberId || !orgId) {
      return NextResponse.json({ error: 'memberId and orgId are required' }, { status: 400 })
    }

    // Verify the requester is OWNER of this org
    const { data: requesterMembership } = await supabaseAdmin
      .from('TeamMember')
      .select('role')
      .eq('organizationId', orgId)
      .eq('userId', user.id)
      .eq('status', 'ACTIVE')
      .single()

    if (!requesterMembership || requesterMembership.role !== 'OWNER') {
      return NextResponse.json({ error: 'Apenas o proprietário pode remover membros.' }, { status: 403 })
    }

    // Find the member to remove
    const { data: member } = await supabaseAdmin
      .from('TeamMember')
      .select('id, role, userId, inviteEmail, organizationId')
      .eq('id', memberId)
      .eq('organizationId', orgId)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 })
    }

    // Cannot remove the owner
    if (member.role === 'OWNER') {
      return NextResponse.json({ error: 'Não é possível remover o proprietário.' }, { status: 400 })
    }

    // Set status to REMOVED
    const { error: updateError } = await supabaseAdmin
      .from('TeamMember')
      .update({ status: 'REMOVED' })
      .eq('id', memberId)

    if (updateError) {
      console.error('Error removing member:', updateError)
      return NextResponse.json({ error: 'Erro ao remover membro.' }, { status: 500 })
    }

    // Notify the removed member
    if (member.userId) {
      const { data: org } = await supabaseAdmin
        .from('Organization')
        .select('name')
        .eq('id', orgId)
        .single()

      createNotification({
        userId: member.userId,
        type: 'MEMBER_LEFT',
        title: 'Você foi removido da organização',
        message: org?.name ? `Você foi removido de ${org.name}` : 'Você foi removido de uma organização',
        metadata: {
          orgId,
          orgName: org?.name || null,
        },
      })
    }

    return NextResponse.json({ status: 'REMOVED' })
  } catch (err) {
    console.error('Remove member error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
