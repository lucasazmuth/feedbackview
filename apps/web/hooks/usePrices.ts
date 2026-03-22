'use client'

import { useState, useEffect } from 'react'

export interface PlanPricing {
  monthly: number
  monthlyFormatted: string
  yearly: number
  yearlyFormatted: string | null
}

export type PricesMap = Record<'FREE' | 'PRO' | 'BUSINESS', PlanPricing>

const DEFAULT_PRICES: PricesMap = {
  FREE: { monthly: 0, monthlyFormatted: 'R$ 0', yearly: 0, yearlyFormatted: 'R$ 0' },
  PRO: { monthly: 4900, monthlyFormatted: 'R$ 49', yearly: 0, yearlyFormatted: null },
  BUSINESS: { monthly: 14900, monthlyFormatted: 'R$ 149', yearly: 0, yearlyFormatted: null },
}

// Module-level cache so multiple components share the same data
let cachedPrices: PricesMap | null = null
let fetchPromise: Promise<PricesMap> | null = null

async function fetchPrices(): Promise<PricesMap> {
  try {
    const res = await fetch('/api/billing/prices')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    return DEFAULT_PRICES
  }
}

export function usePrices() {
  const [prices, setPrices] = useState<PricesMap>(cachedPrices ?? DEFAULT_PRICES)
  const [loading, setLoading] = useState(!cachedPrices)

  useEffect(() => {
    if (cachedPrices) {
      setPrices(cachedPrices)
      setLoading(false)
      return
    }

    // Deduplicate concurrent fetches
    if (!fetchPromise) {
      fetchPromise = fetchPrices()
    }

    fetchPromise.then((data) => {
      cachedPrices = data
      fetchPromise = null
      setPrices(data)
      setLoading(false)
    })
  }, [])

  return { prices, loading }
}
