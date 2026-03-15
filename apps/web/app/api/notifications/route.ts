import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userEmail = user.email?.toLowerCase()

    // Find pending invites for this user (by userId or email)
    let invites: Record<string, unknown>[] = []

    // By userId
    const { data: byUserId } = await supabaseAdmin
      .from('TeamMember')
      .select('id, role, status, inviteEmail, organization:Organization(id, name, slug)')
      .eq('userId', user.id)
      .eq('status', 'PENDING')

    if (byUserId) {
      invites = [...byUserId]
    }

    // By email (for invites created before user registered)
    if (userEmail) {
      const { data: byEmail } = await supabaseAdmin
        .from('TeamMember')
        .select('id, role, status, inviteEmail, organization:Organization(id, name, slug)')
        .eq('inviteEmail', userEmail)
        .eq('status', 'PENDING')
        .is('userId', null)

      if (byEmail) {
        invites = [...invites, ...byEmail]
      }
    }

    // Deduplicate by id
    const seen = new Set<string>()
    const unique = invites.filter((inv) => {
      const id = inv.id as string
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })

    const notifications = unique.map((inv) => {
      const org = inv.organization as unknown as Record<string, string>
      return {
        id: inv.id,
        type: 'INVITE',
        role: inv.role,
        orgName: org?.name || 'Organização',
        orgId: org?.id,
        createdAt: inv.inviteEmail, // We don't have createdAt on TeamMember, use id ordering
      }
    })

    return NextResponse.json({ notifications, count: notifications.length })
  } catch (err) {
    console.error('Notifications error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
