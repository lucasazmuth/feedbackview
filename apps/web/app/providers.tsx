'use client'

import {
  LayoutProvider,
  ThemeProvider,
  ToastProvider,
  IconProvider,
} from '@once-ui-system/core'
import { iconLibrary } from '@/resources/icons'
import { OrgProvider } from '@/contexts/OrgContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LayoutProvider>
      <ThemeProvider
        theme="light"
        brand="indigo"
        accent="violet"
        neutral="slate"
        solid="contrast"
        solidStyle="flat"
        border="playful"
        surface="filled"
        transition="all"
        scaling="100"
      >
        <ToastProvider>
          <IconProvider icons={iconLibrary}>
            <OrgProvider>
              {children}
            </OrgProvider>
          </IconProvider>
        </ToastProvider>
      </ThemeProvider>
    </LayoutProvider>
  )
}
