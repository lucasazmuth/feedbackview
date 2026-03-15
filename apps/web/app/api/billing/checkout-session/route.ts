import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { priceId } = await req.json()
    if (!priceId) {
      return NextResponse.json({ error: 'priceId is required' }, { status: 400 })
    }

    // Get user's organization
    const { data: membership } = await supabaseAdmin
      .from('TeamMember')
      .select('organizationId, role, organization:Organization(id, name, stripeCustomerId)')
      .eq('userId', user.id)
      .in('role', ['OWNER', 'ADMIN'])
      .single()

    if (!membership?.organization) {
      return NextResponse.json({ error: 'Organization not found or insufficient permissions' }, { status: 403 })
    }

    const org = membership.organization as { id: string; name: string; stripeCustomerId: string | null }

    // Create or retrieve Stripe customer
    let customerId = org.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: { orgId: org.id, userId: user.id },
      })
      customerId = customer.id

      // Save customer ID to organization
      await supabaseAdmin
        .from('Organization')
        .update({ stripeCustomerId: customerId })
        .eq('id', org.id)
    }

    // Create checkout session
    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/settings/billing?success=true`,
      cancel_url: `${origin}/settings/billing?canceled=true`,
      metadata: { orgId: org.id },
      subscription_data: {
        metadata: { orgId: org.id },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Checkout session error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
