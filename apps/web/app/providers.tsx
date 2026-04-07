'use client'

import { OrgProvider } from '@/contexts/OrgContext'
import { TooltipProvider } from '@/components/ui/tooltip'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <OrgProvider>
      <TooltipProvider delayDuration={100}>
        {children}
      </TooltipProvider>
    </OrgProvider>
  )
}
