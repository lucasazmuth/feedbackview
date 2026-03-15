'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSidebarContext } from './AppLayout'
import { useOrg } from '@/contexts/OrgContext'

function SvgIcon({ children, size = 18 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {children}
    </svg>
  )
}

const RAIL_WIDTH = '3.5rem'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { collapsed, setCollapsed } = useSidebarContext()
  const { orgs, currentOrg, switchOrg } = useOrg()
  const [notifCount, setNotifCount] = useState(0)

  const fetchNotifCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifCount(data.count || 0)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchNotifCount()
    const interval = setInterval(fetchNotifCount, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifCount])

  function isActive(prefix: string) {
    if (prefix === '/dashboard') {
      return pathname === '/dashboard' || pathname.startsWith('/projects') || pathname.startsWith('/feedbacks')
    }
    return pathname.startsWith(prefix)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const userNavItems = [
    {
      label: 'Notificações',
      href: '/notifications',
      icon: <SvgIcon size={20}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></SvgIcon>,
      badge: notifCount,
    },
    {
      label: 'Planos',
      href: '/plans',
      icon: <SvgIcon size={20}><path d="M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" /><path d="M1 10h22" /></SvgIcon>,
    },
    {
      label: 'Configurações',
      href: '/settings',
      icon: <SvgIcon size={20}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></SvgIcon>,
    },
  ]

  const wsNavItems = [
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
  ]

  return (
    <nav
      style={{
        width: collapsed ? RAIL_WIDTH : '15rem',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        background: 'var(--surface-background)',
        display: 'flex',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        zIndex: 100,
      }}
    >
      {/* ── Left Rail ── */}
      <div
        style={{
          width: RAIL_WIDTH,
          minWidth: RAIL_WIDTH,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '1rem 0',
          gap: '0.5rem',
          borderRight: collapsed ? '1px solid var(--neutral-border-medium)' : 'none',
          background: 'var(--neutral-alpha-weak)',
        }}
      >
        {/* Expand button (only in collapsed mode) */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            title="Expandir menu"
            style={{
              width: 36,
              height: 24,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: 'var(--neutral-on-background-weak)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
              flexShrink: 0,
              marginBottom: '0.25rem',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--neutral-alpha-weak)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        )}

        {/* Workspace avatars */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem', flex: 1 }}>
          {orgs.map((org) => {
            const active = org.id === currentOrg?.id
            return (
              <button
                key={org.id}
                onClick={() => {
                  if (active) {
                    if (collapsed) setCollapsed(false)
                  } else {
                    switchOrg(org.id)
                  }
                }}
                title={org.name}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: active ? 10 : 18,
                  background: active ? 'var(--brand-solid-strong)' : 'var(--surface-background)',
                  color: active ? '#fff' : 'var(--neutral-on-background-strong)',
                  border: active ? 'none' : '1px solid var(--neutral-border-medium)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.borderRadius = '10px'
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.borderRadius = '18px'
                }}
              >
                {org.name[0].toUpperCase()}
              </button>
            )
          })}
        </div>

        {/* Separator */}
        <div style={{ width: 24, height: 1, background: 'var(--neutral-border-medium)', flexShrink: 0 }} />

        {/* User-level icons */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
          {userNavItems.map((item) => {
            const active = isActive(item.href)
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                title={item.label}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: 'none',
                  background: active ? 'var(--neutral-alpha-medium)' : 'transparent',
                  color: active ? 'var(--neutral-on-background-strong)' : 'var(--neutral-on-background-weak)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  position: 'relative',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'var(--neutral-alpha-weak)'
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent'
                }}
              >
                {item.icon}
                {item.badge && item.badge > 0 ? (
                  <span style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    background: 'var(--danger-solid-strong)',
                    color: '#fff',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                  }}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            )
          })}

          {/* Logout icon */}
          <button
            onClick={handleSignOut}
            title="Sair"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--neutral-on-background-weak)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
            <SvgIcon size={20}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </SvgIcon>
          </button>
        </div>
      </div>

      {/* ── Main Panel (hidden when collapsed) ── */}
      {!collapsed && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid var(--neutral-border-medium)',
            overflow: 'hidden',
          }}
        >
          {/* Header: Logo + collapse */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 0.75rem 0.75rem 1rem',
              minHeight: '2.5rem',
            }}
          >
            <span style={{
              fontFamily: 'var(--font-logo)',
              fontWeight: 700,
              fontSize: '1.1rem',
              letterSpacing: '-0.02em',
              color: 'var(--neutral-on-background-strong)',
              whiteSpace: 'nowrap',
            }}>
              Report Bug
            </span>
            <button
              onClick={() => setCollapsed(true)}
              title="Minimizar menu"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '1.75rem',
                height: '1.75rem',
                borderRadius: '0.375rem',
                border: 'none',
                background: 'transparent',
                color: 'var(--neutral-on-background-weak)',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--neutral-alpha-weak)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          </div>

          {/* Workspace name */}
          {currentOrg && (
            <div style={{ padding: '0 1rem 0.5rem', borderBottom: '1px solid var(--neutral-border-medium)' }}>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--neutral-on-background-strong)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              }}>
                {currentOrg.name}
              </span>
            </div>
          )}

          {/* Workspace nav items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', padding: '0.5rem', flex: 1 }}>
            {wsNavItems.map((item) => {
              const active = isActive(item.matchPrefix)
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    padding: '0.5rem 0.75rem',
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
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}
