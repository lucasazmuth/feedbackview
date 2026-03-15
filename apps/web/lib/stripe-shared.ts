/** Shared Stripe constants — safe to import from client and server */

export const PRICE_IDS = {
  PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '',
  PRO_YEARLY: process.env.STRIPE_PRO_YEARLY_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID || '',
  BUSINESS_MONTHLY: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID || '',
  BUSINESS_YEARLY: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PRICE_ID || '',
}

/** Map a Stripe price ID to the corresponding plan */
export function priceIdToPlan(priceId: string): 'PRO' | 'BUSINESS' | null {
  if (priceId === PRICE_IDS.PRO_MONTHLY || priceId === PRICE_IDS.PRO_YEARLY) return 'PRO'
  if (priceId === PRICE_IDS.BUSINESS_MONTHLY || priceId === PRICE_IDS.BUSINESS_YEARLY) return 'BUSINESS'
  return null
}

/** Map a Stripe price ID to the billing period */
export function priceIdToPeriod(priceId: string): 'MONTHLY' | 'YEARLY' {
  if (priceId === PRICE_IDS.PRO_YEARLY || priceId === PRICE_IDS.BUSINESS_YEARLY) return 'YEARLY'
  return 'MONTHLY'
}
