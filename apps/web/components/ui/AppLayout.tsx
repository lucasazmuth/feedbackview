'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
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

const STORAGE_KEY = 'sidebar-collapsed'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') setCollapsed(true)
  }, [])

  const handleSetCollapsed = useCallback((v: boolean) => {
    setCollapsed(v)
    localStorage.setItem(STORAGE_KEY, String(v))
  }, [])

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed: handleSetCollapsed }}>
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
