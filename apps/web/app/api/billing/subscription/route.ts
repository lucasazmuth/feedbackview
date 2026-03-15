import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization with membership
    const { data: membership } = await supabaseAdmin
      .from('TeamMember')
      .select('organizationId, role, organization:Organization(*)')
      .eq('userId', user.id)
      .eq('status', 'ACTIVE')
      .order('role', { ascending: true }) // OWNER comes first alphabetically... actually use limit
      .limit(1)
      .single()

    if (!membership?.organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const org = membership.organization as Record<string, unknown>
    const orgId = org.id as string

    // Get usage counts
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [projectsResult, membersResult, reportsResult] = await Promise.all([
      supabaseAdmin
        .from('Project')
        .select('id', { count: 'exact', head: true })
        .eq('organizationId', orgId),
      supabaseAdmin
        .from('TeamMember')
        .select('id', { count: 'exact', head: true })
        .eq('organizationId', orgId)
        .eq('status', 'ACTIVE'),
      supabaseAdmin
        .from('Feedback')
        .select('id', { count: 'exact', head: true })
        .in('projectId',
          (await supabaseAdmin.from('Project').select('id').eq('organizationId', orgId)).data?.map((p: { id: string }) => p.id) || []
        )
        .gte('createdAt', startOfMonth.toISOString()),
    ])

    return NextResponse.json({
      organization: {
        id: orgId,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        planPeriod: org.planPeriod,
        planExpiresAt: org.planExpiresAt,
        maxProjects: org.maxProjects,
        maxMembers: org.maxMembers,
        maxReportsPerMonth: org.maxReportsPerMonth,
        stripeCustomerId: org.stripeCustomerId,
        stripeSubscriptionId: org.stripeSubscriptionId,
      },
      usage: {
        projectCount: projectsResult.count || 0,
        memberCount: membersResult.count || 0,
        reportsThisMonth: reportsResult.count || 0,
      },
      role: membership.role,
    })
  } catch (err) {
    console.error('Subscription status error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
