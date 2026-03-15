import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createNotification, getOrgOwnerUserId } from '@/lib/notifications'

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

    const { inviteId } = await req.json()

    if (!inviteId) {
      return NextResponse.json({ error: 'inviteId is required' }, { status: 400 })
    }

    // Find the pending invite
    const { data: invite } = await supabaseAdmin
      .from('TeamMember')
      .select('id, organizationId, inviteEmail, userId')
      .eq('id', inviteId)
      .eq('status', 'PENDING')
      .single()

    if (!invite) {
      return NextResponse.json({ error: 'Convite não encontrado ou já processado.' }, { status: 404 })
    }

    // Verify the invite belongs to this user
    const userEmail = user.email?.toLowerCase()
    if (invite.userId && invite.userId !== user.id) {
      return NextResponse.json({ error: 'Este convite não pertence a você.' }, { status: 403 })
    }
    if (invite.inviteEmail && invite.inviteEmail !== userEmail) {
      return NextResponse.json({ error: 'Este convite não pertence a você.' }, { status: 403 })
    }

    // Reject: update status to REMOVED
    const { error: updateError } = await supabaseAdmin
      .from('TeamMember')
      .update({ status: 'REMOVED' })
      .eq('id', inviteId)

    if (updateError) {
      console.error('Error rejecting invite:', updateError)
      return NextResponse.json({ error: 'Erro ao rejeitar convite.' }, { status: 500 })
    }

    // Notify workspace owner about rejected invite
    if (invite.organizationId) {
      const ownerUserId = await getOrgOwnerUserId(invite.organizationId)
      if (ownerUserId && ownerUserId !== user.id) {
        const { data: org } = await supabaseAdmin
          .from('Organization')
          .select('name')
          .eq('id', invite.organizationId)
          .single()

        const memberEmail = user.email || invite.inviteEmail || 'Alguém'
        createNotification({
          userId: ownerUserId,
          type: 'MEMBER_LEFT',
          title: `${memberEmail} recusou o convite`,
          message: org?.name ? `Convite recusado em ${org.name}` : 'Convite recusado no workspace',
          metadata: {
            memberEmail: user.email || invite.inviteEmail,
            orgId: invite.organizationId,
            orgName: org?.name || null,
          },
        })
      }
    }

    return NextResponse.json({ status: 'REMOVED' })
  } catch (err) {
    console.error('Reject invite error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
