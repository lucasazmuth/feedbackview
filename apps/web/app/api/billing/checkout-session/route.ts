import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { PRICE_IDS } from '@/lib/stripe-shared'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Resolve price ID from plan name (server-side env vars are available here)
const PLAN_TO_PRICE: Record<string, string> = {
  PRO: PRICE_IDS.PRO_MONTHLY,
  BUSINESS: PRICE_IDS.BUSINESS_MONTHLY,
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    // Accept either priceId directly or plan name
    const newPriceId = body.priceId || PLAN_TO_PRICE[body.plan] || ''
    if (!newPriceId) {
      return NextResponse.json({ error: 'priceId or plan is required' }, { status: 400 })
    }

    // Get user's organization (including current subscription info)
    const { data: membership } = await supabaseAdmin
      .from('TeamMember')
      .select('organizationId, role, organization:Organization(id, name, stripeCustomerId, stripeSubscriptionId, plan)')
      .eq('userId', user.id)
      .in('role', ['OWNER', 'ADMIN'])
      .single()

    if (!membership?.organization) {
      return NextResponse.json({ error: 'Organization not found or insufficient permissions' }, { status: 403 })
    }

    const org = membership.organization as unknown as {
      id: string
      name: string
      stripeCustomerId: string | null
      stripeSubscriptionId: string | null
      plan: string | null
    }

    // Create or retrieve Stripe customer
    let customerId = org.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: { orgId: org.id, userId: user.id },
      })
      customerId = customer.id

      await supabaseAdmin
        .from('Organization')
        .update({ stripeCustomerId: customerId })
        .eq('id', org.id)
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://buug.io'

    // ─── UPGRADE/DOWNGRADE: If org already has an active subscription, update it ───
    if (org.stripeSubscriptionId && org.plan !== 'FREE') {
      try {
        const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId)

        if (subscription.status === 'active' || subscription.status === 'trialing') {
          const subscriptionItemId = subscription.items.data[0]?.id
          if (!subscriptionItemId) {
            throw new Error('No subscription item found')
          }

          // Update the existing subscription with the new price (prorate immediately)
          const updated = await stripe.subscriptions.update(org.stripeSubscriptionId, {
            items: [{
              id: subscriptionItemId,
              price: newPriceId,
            }],
            proration_behavior: 'create_prorations',
            metadata: { orgId: org.id, plan: body.plan },
          })

          // Update org in database immediately (don't wait for webhook)
          const { getPlanLimits } = await import('@/lib/limits')
          const plan = body.plan as 'PRO' | 'BUSINESS'
          const limits = getPlanLimits(plan)

          await supabaseAdmin
            .from('Organization')
            .update({
              plan,
              maxReportsPerMonth: limits.maxReports === -1 ? 0 : limits.maxReports,
              stripeSubscriptionId: updated.id,
              planExpiresAt: new Date((updated as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
            })
            .eq('id', org.id)

          // Return success URL directly (no Stripe checkout needed)
          return NextResponse.json({
            url: `${origin}/plans/upgrade/success?plan=${body.plan}`,
            upgraded: true,
          })
        }
      } catch (err) {
        // If subscription retrieval/update fails (e.g., expired), fall through to create new checkout
        console.error('Subscription update failed, creating new checkout:', err)
      }
    }

    // ─── NEW SUBSCRIPTION: No active subscription, create checkout session ───
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: newPriceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/plans/upgrade/success?plan=${body.plan}`,
      cancel_url: `${origin}/plans/upgrade?canceled=true`,
      metadata: { orgId: org.id, plan: body.plan },
      subscription_data: {
        metadata: { orgId: org.id, plan: body.plan },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Checkout session error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
