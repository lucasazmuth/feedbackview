'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Org {
  id: string
  name: string
  slug: string
  plan: string
  role: string
}

interface OrgContextType {
  orgs: Org[]
  currentOrg: Org | null
  switchOrg: (orgId: string) => void
  refreshOrgs: () => Promise<void>
  loading: boolean
}

const OrgContext = createContext<OrgContextType>({
  orgs: [],
  currentOrg: null,
  switchOrg: () => {},
  refreshOrgs: async () => {},
  loading: true,
})

export function useOrg() {
  return useContext(OrgContext)
}

const STORAGE_KEY = 'qbugs_current_org_id'

export function OrgProvider({ children }: { children: ReactNode }) {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchOrgs = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setOrgs([])
        setCurrentOrgId(null)
        setLoading(false)
        return
      }

      const { data: memberships, error } = await supabase
        .from('TeamMember')
        .select('role, organization:Organization(id, name, slug, plan)')
        .eq('userId', user.id)
        .eq('status', 'ACTIVE')
        .order('role', { ascending: true })

      if (memberships && memberships.length > 0) {
        const orgList: Org[] = memberships.map((m: Record<string, unknown>) => {
          const org = m.organization as unknown as Record<string, string>
          return {
            id: org.id,
            name: org.name,
            slug: org.slug,
            plan: org.plan,
            role: m.role as string,
          }
        })
        setOrgs(orgList)

        // Restore from localStorage or pick first
        const stored = localStorage.getItem(STORAGE_KEY)
        const validStored = stored && orgList.some((o) => o.id === stored)
        if (validStored) {
          setCurrentOrgId(stored)
        } else {
          setCurrentOrgId(orgList[0].id)
          localStorage.setItem(STORAGE_KEY, orgList[0].id)
        }
      } else {
        setOrgs([])
        setCurrentOrgId(null)
      }
    } catch {
      // defaults
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrgs()
  }, [fetchOrgs])

  const switchOrg = useCallback((orgId: string) => {
    setCurrentOrgId(orgId)
    localStorage.setItem(STORAGE_KEY, orgId)
    // Navigate to dashboard to avoid showing stale data from another org
    window.location.href = '/dashboard'
  }, [])

  const currentOrg = orgs.find((o) => o.id === currentOrgId) || null

  return (
    <OrgContext.Provider value={{ orgs, currentOrg, switchOrg, refreshOrgs: fetchOrgs, loading }}>
      {children}
    </OrgContext.Provider>
  )
}
