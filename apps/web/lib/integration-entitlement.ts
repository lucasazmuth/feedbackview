import type { SupabaseClient } from '@supabase/supabase-js'
import type { Plan } from '@/lib/limits'

export const INTEGRATIONS_PLAN_ERROR_CODE = 'INTEGRATIONS_REQUIRE_PAID_PLAN' as const

export interface OrgIntegrationGate {
  plan: string | null | undefined
  stripeSubscriptionId: string | null | undefined
  planExpiresAt: string | null | undefined
}

export function hasActiveIntegrationEntitlement(org: OrgIntegrationGate): boolean {
  const plan = (org.plan || 'FREE') as Plan
  if (plan !== 'PRO' && plan !== 'BUSINESS') return false
  if (!org.stripeSubscriptionId) return false
  if (org.planExpiresAt) {
    const end = new Date(org.planExpiresAt)
    if (Number.isFinite(end.getTime()) && end < new Date()) return false
  }
  return true
}

export function integrationEntitlementErrorBody() {
  return {
    error: 'Integrações disponíveis apenas nos planos Pro e Business com assinatura ativa.',
    code: INTEGRATIONS_PLAN_ERROR_CODE,
  }
}

export async function fetchOrgIntegrationGate(
  admin: SupabaseClient,
  organizationId: string,
): Promise<OrgIntegrationGate | null> {
  const { data } = await admin
    .from('Organization')
    .select('plan, stripeSubscriptionId, planExpiresAt')
    .eq('id', organizationId)
    .single()
  if (!data) return null
  return data as OrgIntegrationGate
}
