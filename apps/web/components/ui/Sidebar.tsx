'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Heading } from '@once-ui-system/core'
import { useSidebarContext } from './AppLayout'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  matchPrefix: string
}

function SvgIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {children}
    </svg>
  )
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Projetos',
    href: '/dashboard',
    icon: <SvgIcon><path d="M2 17l10 5 10-5M2 12l10 5 10-5M12 2l10 5-10 5L2 7z" /></SvgIcon>,
    matchPrefix: '/dashboard',
  },
  {
    label: 'Equipe',
    href: '/team',
    icon: <SvgIcon><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></SvgIcon>,
    matchPrefix: '/team',
  },
  {
    label: 'Configuracoes',
    href: '/settings',
    icon: <SvgIcon><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></SvgIcon>,
    matchPrefix: '/settings',
  },
]

const LogoutIcon = (
  <SvgIcon>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </SvgIcon>
)

const EXPANDED_WIDTH = '15rem'
const COLLAPSED_WIDTH = '4rem'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { collapsed, setCollapsed } = useSidebarContext()

  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH

  function isActive(item: NavItem) {
    if (item.matchPrefix === '/dashboard') {
      return pathname === '/dashboard' || pathname.startsWith('/projects') || pathname.startsWith('/feedbacks')
    }
    return pathname.startsWith(item.matchPrefix)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <nav
      style={{
        width,
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        borderRight: '1px solid var(--neutral-border-medium)',
        background: 'var(--surface-background)',
        display: 'flex',
        flexDirection: 'column',
        padding: collapsed ? '1.5rem 0.5rem' : '1.5rem 0',
        gap: '1.5rem',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        zIndex: 100,
      }}
    >
      {/* Header: Logo + collapse toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0' : '0 1rem 0 1.5rem',
          minHeight: '2rem',
        }}
      >
        {!collapsed && <Heading variant="heading-strong-m">Qbug</Heading>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expandir menu' : 'Minimizar menu'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '2rem',
            height: '2rem',
            borderRadius: '0.375rem',
            border: 'none',
            background: 'transparent',
            color: 'var(--neutral-on-background-weak)',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--neutral-alpha-weak)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? <path d="m9 18 6-6-6-6" /> : <path d="m15 18-6-6 6-6" />}
          </svg>
        </button>
      </div>

      {/* Nav items */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          flex: 1,
          padding: collapsed ? '0' : '0 0.5rem',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item)
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: '0.625rem',
                padding: collapsed ? '0.5rem' : '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: active ? 'var(--neutral-alpha-weak)' : 'transparent',
                color: active ? 'var(--neutral-on-background-strong)' : 'var(--neutral-on-background-weak)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: active ? 600 : 400,
                width: '100%',
                textAlign: 'left',
                transition: 'background 0.15s ease',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'var(--neutral-alpha-weak)'
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent'
              }}
            >
              {item.icon}
              {!collapsed && item.label}
            </button>
          )
        })}
      </div>

      {/* Logout */}
      <div style={{ padding: collapsed ? '0' : '0 0.5rem' }}>
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sair' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '0.625rem',
            padding: collapsed ? '0.5rem' : '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: 'transparent',
            color: 'var(--neutral-on-background-weak)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 400,
            width: '100%',
            textAlign: 'left',
            transition: 'background 0.15s ease',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--neutral-alpha-weak)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          {LogoutIcon}
          {!collapsed && 'Sair'}
        </button>
      </div>
    </nav>
  )
}
