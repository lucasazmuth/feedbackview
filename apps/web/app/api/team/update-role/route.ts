import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const VALID_ROLES = ['ADMIN', 'MEMBER', 'VIEWER']

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { memberId, orgId, role } = await req.json()

    if (!memberId || !orgId || !role) {
      return NextResponse.json({ error: 'memberId, orgId e role são obrigatórios' }, { status: 400 })
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Função inválida' }, { status: 400 })
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
      return NextResponse.json({ error: 'Apenas o proprietário pode alterar funções.' }, { status: 403 })
    }

    // Find the target member
    const { data: member } = await supabaseAdmin
      .from('TeamMember')
      .select('id, role, userId')
      .eq('id', memberId)
      .eq('organizationId', orgId)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 })
    }

    if (member.role === 'OWNER') {
      return NextResponse.json({ error: 'Não é possível alterar a função do proprietário.' }, { status: 400 })
    }

    // Update role
    const { error: updateError } = await supabaseAdmin
      .from('TeamMember')
      .update({ role })
      .eq('id', memberId)

    if (updateError) {
      console.error('Error updating role:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar função.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, role })
  } catch (err) {
    console.error('Update role error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
