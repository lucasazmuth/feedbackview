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

    // Support orgId query param to fetch specific org's subscription
    const requestedOrgId = req.nextUrl.searchParams.get('orgId')

    let membershipQuery = supabaseAdmin
      .from('TeamMember')
      .select('organizationId, role, organization:Organization(*)')
      .eq('userId', user.id)
      .eq('status', 'ACTIVE')

    if (requestedOrgId) {
      membershipQuery = membershipQuery.eq('organizationId', requestedOrgId)
    } else {
      membershipQuery = membershipQuery.order('role', { ascending: true })
    }

    const { data: membership } = await membershipQuery.limit(1).single()

    if (!membership?.organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const org = membership.organization as unknown as Record<string, unknown>
    const orgId = org.id as string

    // Get usage counts
    const plan = (org.plan as string) || 'FREE'
    const isLifetime = plan === 'FREE'

    const projectIds = (await supabaseAdmin.from('Project').select('id').eq('organizationId', orgId)).data?.map((p: { id: string }) => p.id) || []

    // For FREE plan, count all reports ever (lifetime). For paid plans, count this month only.
    let reportsQuery = supabaseAdmin
      .from('Feedback')
      .select('id', { count: 'exact', head: true })
      .in('projectId', projectIds.length > 0 ? projectIds : ['__none__'])

    if (!isLifetime) {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      reportsQuery = reportsQuery.gte('createdAt', startOfMonth.toISOString())
    }

    const reportsResult = await reportsQuery

    return NextResponse.json({
      organization: {
        id: orgId,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        planPeriod: org.planPeriod,
        planExpiresAt: org.planExpiresAt,
        maxReportsPerMonth: org.maxReportsPerMonth,
        stripeCustomerId: org.stripeCustomerId,
        stripeSubscriptionId: org.stripeSubscriptionId,
        maxMembers: org.maxMembers,
      },
      usage: {
        reportsUsed: reportsResult.count || 0,
      },
      role: membership.role,
      isLifetimeLimit: isLifetime,
    })
  } catch (err) {
    console.error('Subscription status error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
