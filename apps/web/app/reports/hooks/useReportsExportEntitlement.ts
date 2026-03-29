'use client'

import { useState, useEffect } from 'react'
import { hasActiveIntegrationEntitlement } from '@/lib/integration-entitlement'

export function useReportsExportEntitlement(orgId: string | null | undefined) {
  const [entitled, setEntitled] = useState<boolean | null>(() => (orgId ? null : false))

  useEffect(() => {
    if (!orgId) {
      setEntitled(false)
      return
    }
    let cancelled = false
    setEntitled(null)
    void (async () => {
      try {
        const res = await fetch(`/api/billing/subscription?orgId=${encodeURIComponent(orgId)}`)
        if (cancelled) return
        if (!res.ok) {
          setEntitled(false)
          return
        }
        const data = await res.json()
        const o = data.organization as {
          plan?: string
          stripeSubscriptionId?: string | null
          planExpiresAt?: string | null
        }
        const allowed = hasActiveIntegrationEntitlement({
          plan: o?.plan,
          stripeSubscriptionId: o?.stripeSubscriptionId,
          planExpiresAt: o?.planExpiresAt,
        })
        if (!cancelled) setEntitled(allowed)
      } catch {
        if (!cancelled) setEntitled(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orgId])

  return entitled
}
