'use client'

import { createContext, useContext, useState } from 'react'
import Sidebar from './Sidebar'

interface SidebarContextValue {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue>({ collapsed: false, setCollapsed: () => {} })

export function useSidebarContext() {
  return useContext(SidebarContext)
}

const EXPANDED_WIDTH = '15rem'
const COLLAPSED_WIDTH = '4rem'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-background)' }}>
        <Sidebar />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            marginLeft: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
            transition: 'margin-left 0.2s ease',
          }}
        >
          {children}
        </div>
      </div>
    </SidebarContext.Provider>
  )
}
