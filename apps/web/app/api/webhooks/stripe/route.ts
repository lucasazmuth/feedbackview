import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe, priceIdToPlan, priceIdToPeriod } from '@/lib/stripe'
import { getPlanLimits, type Plan } from '@/lib/limits'
import { createNotification, getOrgOwnerUserId } from '@/lib/notifications'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getOrgUpdatesForPlan(plan: Plan) {
  const limits = getPlanLimits(plan)
  return {
    plan,
    maxReportsPerMonth: limits.maxReports === -1 ? 0 : limits.maxReports,
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orgId = session.metadata?.orgId
  if (!orgId) {
    console.error('Webhook: no orgId in session metadata')
    return
  }

  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : (session.subscription as unknown as { id: string })?.id

  if (!subscriptionId) {
    console.error('Webhook: no subscriptionId in session')
    return
  }

  // Try to get plan from metadata first (most reliable), then fallback to price lookup
  let plan: 'PRO' | 'BUSINESS' | null = (session.metadata?.plan as 'PRO' | 'BUSINESS') || null

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0]?.price.id

  if (!plan && priceId) {
    plan = priceIdToPlan(priceId)
  }

  if (!plan) {
    // Last resort: determine from price amount
    const amount = subscription.items.data[0]?.price.unit_amount
    if (amount === 4900) plan = 'PRO'
    else if (amount === 14900) plan = 'BUSINESS'
  }

  if (!plan) {
    console.error('Webhook: could not determine plan from session', { priceId, metadata: session.metadata })
    return
  }

  const period = priceIdToPeriod(priceId || '')
  const planUpdates = getOrgUpdatesForPlan(plan)

  await supabase
    .from('Organization')
    .update({
      ...planUpdates,
      planPeriod: period,
      stripeSubscriptionId: subscriptionId,
      planExpiresAt: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
    })
    .eq('id', orgId)

  // Notify workspace owner about plan activation
  const ownerUserId = await getOrgOwnerUserId(orgId)
  if (ownerUserId) {
    const { data: org } = await supabase.from('Organization').select('name').eq('id', orgId).single()
    createNotification({
      userId: ownerUserId,
      type: 'PLAN_ACTIVATED',
      title: `Plano ${plan} ativado`,
      message: org?.name ? `Plano atualizado em ${org.name}` : 'Plano atualizado no workspace',
      metadata: { orgId, plan },
    })
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const inv = invoice as unknown as Record<string, unknown>
  const subscriptionId = typeof inv.subscription === 'string'
    ? inv.subscription
    : (inv.subscription as { id?: string })?.id

  if (!subscriptionId) return

  // Find org by subscription ID
  const { data: org } = await supabase
    .from('Organization')
    .select('id')
    .eq('stripeSubscriptionId', subscriptionId)
    .single()

  if (!org) return

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  await supabase
    .from('Organization')
    .update({
      planExpiresAt: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
    })
    .eq('id', org.id)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const orgId = subscription.metadata?.orgId
  if (!orgId) return

  const priceId = subscription.items.data[0]?.price.id
  if (!priceId) return

  const plan = priceIdToPlan(priceId)
  if (!plan) return

  const period = priceIdToPeriod(priceId)
  const planUpdates = getOrgUpdatesForPlan(plan)

  await supabase
    .from('Organization')
    .update({
      ...planUpdates,
      planPeriod: period,
      planExpiresAt: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
    })
    .eq('id', orgId)

  // Notify workspace owner about plan update
  const ownerUserId = await getOrgOwnerUserId(orgId)
  if (ownerUserId) {
    const { data: org } = await supabase.from('Organization').select('name').eq('id', orgId).single()
    createNotification({
      userId: ownerUserId,
      type: 'PLAN_ACTIVATED',
      title: `Plano atualizado para ${plan}`,
      message: org?.name ? `Plano atualizado em ${org.name}` : 'Plano atualizado no workspace',
      metadata: { orgId, plan },
    })
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const orgId = subscription.metadata?.orgId
  // Also try finding by subscription ID if no metadata
  const query = orgId
    ? supabase.from('Organization').select('id').eq('id', orgId).single()
    : supabase.from('Organization').select('id').eq('stripeSubscriptionId', subscription.id).single()

  const { data: org } = await query
  if (!org) return

  // Get current plan before downgrade
  const { data: currentOrg } = await supabase
    .from('Organization')
    .select('plan, name')
    .eq('id', org.id)
    .single()

  const freeUpdates = getOrgUpdatesForPlan('FREE')

  await supabase
    .from('Organization')
    .update({
      ...freeUpdates,
      planPeriod: null,
      planExpiresAt: null,
      stripeSubscriptionId: null,
    })
    .eq('id', org.id)

  // Notify workspace owner about plan expiration
  const ownerUserId = await getOrgOwnerUserId(org.id)
  if (ownerUserId) {
    createNotification({
      userId: ownerUserId,
      type: 'PLAN_EXPIRED',
      title: 'Assinatura cancelada',
      message: currentOrg?.name
        ? `Plano revertido para Free em ${currentOrg.name}`
        : 'Plano revertido para Free',
      metadata: { orgId: org.id, previousPlan: currentOrg?.plan || null },
    })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      default:
        // Unhandled event type
        break
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err)
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
