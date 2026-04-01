'use client'

import { OrgProvider } from '@/contexts/OrgContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <OrgProvider>
      {children}
    </OrgProvider>
  )
}
