import { NextRequest, NextResponse } from 'next/server'
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

    // Fetch invites
    let invites: Record<string, unknown>[] = []

    const { data: byUserId } = await supabaseAdmin
      .from('TeamMember')
      .select('id, role, status, inviteEmail, organization:Organization(id, name, slug)')
      .eq('userId', user.id)
      .eq('status', 'PENDING')

    if (byUserId) invites = [...byUserId]

    if (userEmail) {
      const { data: byEmail } = await supabaseAdmin
        .from('TeamMember')
        .select('id, role, status, inviteEmail, organization:Organization(id, name, slug)')
        .eq('inviteEmail', userEmail)
        .eq('status', 'PENDING')
        .is('userId', null)

      if (byEmail) invites = [...invites, ...byEmail]
    }

    // Deduplicate invites
    const seen = new Set<string>()
    const uniqueInvites = invites.filter((inv) => {
      const id = inv.id as string
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })

    const inviteNotifications = uniqueInvites.map((inv) => {
      const org = inv.organization as unknown as Record<string, string>
      return {
        id: inv.id,
        type: 'INVITE',
        role: inv.role,
        title: `Convite para ${org?.name || 'organização'}`,
        message: `Convite para participar como ${inv.role}`,
        orgName: org?.name || 'Organização',
        orgId: org?.id,
        read: false,
        createdAt: inv.inviteEmail, // no createdAt on TeamMember
      }
    })

    // Fetch feedback notifications (unread, last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: feedbackNotifs } = await supabaseAdmin
      .from('Notification')
      .select('*')
      .eq('userId', user.id)
      .gte('createdAt', thirtyDaysAgo.toISOString())
      .order('createdAt', { ascending: false })
      .limit(50)

    const otherNotifications = (feedbackNotifs || []).map((n: any) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      metadata: n.metadata,
      read: n.read,
      createdAt: n.createdAt,
    }))

    // Merge: invites first, then others
    const notifications = [...inviteNotifications, ...otherNotifications]
    const unreadCount = inviteNotifications.length + (feedbackNotifs || []).filter((n: any) => !n.read).length

    return NextResponse.json({ notifications, count: unreadCount })
  } catch (err) {
    console.error('Notifications error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Mark notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { ids } = body // array of notification IDs to mark as read

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 })
    }

    await supabaseAdmin
      .from('Notification')
      .update({ read: true })
      .eq('userId', user.id)
      .in('id', ids)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Mark read error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
