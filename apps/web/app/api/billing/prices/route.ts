import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { PRICE_IDS } from '@/lib/stripe-shared'

export const revalidate = 3600 // ISR: revalidate every 1 hour

function formatBRL(cents: number): string {
  return `R$ ${Math.floor(cents / 100)}`
}

export async function GET() {
  try {
    // Fetch all configured prices from Stripe in parallel
    const [proMonthly, proYearly, businessMonthly, businessYearly] =
      await Promise.all([
        PRICE_IDS.PRO_MONTHLY
          ? stripe.prices.retrieve(PRICE_IDS.PRO_MONTHLY)
          : null,
        PRICE_IDS.PRO_YEARLY
          ? stripe.prices.retrieve(PRICE_IDS.PRO_YEARLY)
          : null,
        PRICE_IDS.BUSINESS_MONTHLY
          ? stripe.prices.retrieve(PRICE_IDS.BUSINESS_MONTHLY)
          : null,
        PRICE_IDS.BUSINESS_YEARLY
          ? stripe.prices.retrieve(PRICE_IDS.BUSINESS_YEARLY)
          : null,
      ])

    const prices = {
      FREE: {
        monthly: 0,
        monthlyFormatted: 'R$ 0',
        yearly: 0,
        yearlyFormatted: 'R$ 0',
      },
      PRO: {
        monthly: proMonthly?.unit_amount ?? 4900,
        monthlyFormatted: formatBRL(proMonthly?.unit_amount ?? 4900),
        yearly: proYearly?.unit_amount ?? 0,
        yearlyFormatted: proYearly ? formatBRL(proYearly.unit_amount ?? 0) : null,
      },
      BUSINESS: {
        monthly: businessMonthly?.unit_amount ?? 14900,
        monthlyFormatted: formatBRL(businessMonthly?.unit_amount ?? 14900),
        yearly: businessYearly?.unit_amount ?? 0,
        yearlyFormatted: businessYearly ? formatBRL(businessYearly.unit_amount ?? 0) : null,
      },
    }

    return NextResponse.json(prices, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (err) {
    console.error('Failed to fetch Stripe prices:', err)

    // Return fallback prices so the UI doesn't break
    return NextResponse.json(
      {
        FREE: { monthly: 0, monthlyFormatted: 'R$ 0', yearly: 0, yearlyFormatted: 'R$ 0' },
        PRO: { monthly: 4900, monthlyFormatted: 'R$ 49', yearly: 0, yearlyFormatted: null },
        BUSINESS: { monthly: 14900, monthlyFormatted: 'R$ 149', yearly: 0, yearlyFormatted: null },
      },
      {
        status: 200, // Still 200 — fallback is valid
        headers: {
          'Cache-Control': 'public, s-maxage=60', // Short cache on errors
        },
      }
    )
  }
}
