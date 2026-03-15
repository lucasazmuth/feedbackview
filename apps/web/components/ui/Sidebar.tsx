'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSidebarContext } from './AppLayout'
import { useOrg } from '@/contexts/OrgContext'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  matchPrefix: string
  badge?: number
}

function SvgIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {children}
    </svg>
  )
}

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
  const { orgs, currentOrg, switchOrg } = useOrg()
  const [wsOpen, setWsOpen] = useState(false)
  const wsRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wsRef.current && !wsRef.current.contains(e.target as Node)) {
        setWsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH

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
      label: 'Notificações',
      href: '/notifications',
      icon: <SvgIcon><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></SvgIcon>,
      matchPrefix: '/notifications',
      badge: notifCount,
    },
    {
      label: 'Planos',
      href: '/plans',
      icon: <SvgIcon><path d="M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" /><path d="M1 10h22" /></SvgIcon>,
      matchPrefix: '/plans',
    },
    {
      label: 'Configurações',
      href: '/settings',
      icon: <SvgIcon><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></SvgIcon>,
      matchPrefix: '/settings',
    },
  ]

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
        gap: '1rem',
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
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em', color: 'var(--neutral-on-background-strong)', whiteSpace: 'nowrap' }}>QBugs</span>
          </div>
        )}
        {collapsed && (
          <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em', color: 'var(--neutral-on-background-strong)' }}>Q</span>
        )}
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

      {/* Workspace Switcher */}
      {orgs.length > 0 && (
        <div ref={wsRef} style={{ position: 'relative', padding: collapsed ? '0' : '0 0.5rem' }}>
          <button
            onClick={() => orgs.length > 1 && setWsOpen(!wsOpen)}
            title={collapsed ? (currentOrg?.name || 'Workspace') : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: collapsed ? '0.5rem' : '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--neutral-border-medium)',
              background: 'var(--surface-background)',
              cursor: orgs.length > 1 ? 'pointer' : 'default',
              justifyContent: collapsed ? 'center' : 'flex-start',
              transition: 'background 0.15s ease',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              if (orgs.length > 1) e.currentTarget.style.background = 'var(--neutral-alpha-weak)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface-background)'
            }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: 'var(--brand-solid-strong)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
            }}>
              {(currentOrg?.name || 'O')[0].toUpperCase()}
            </div>
            {!collapsed && (
              <>
                <span style={{
                  flex: 1, fontSize: '0.8rem', fontWeight: 500,
                  color: 'var(--neutral-on-background-strong)',
                  textAlign: 'left', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {currentOrg?.name || 'Workspace'}
                </span>
                {orgs.length > 1 && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                )}
              </>
            )}
          </button>

          {wsOpen && !collapsed && (
            <div style={{
              position: 'absolute', top: '100%', left: '0.5rem', right: '0.5rem',
              marginTop: '0.25rem', background: 'var(--surface-background)',
              border: '1px solid var(--neutral-border-medium)', borderRadius: '0.5rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 200, overflow: 'hidden',
            }}>
              {orgs.map((org) => (
                <button
                  key={org.id}
                  onClick={() => { setWsOpen(false); if (org.id !== currentOrg?.id) switchOrg(org.id) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                    padding: '0.625rem 0.75rem', border: 'none',
                    background: org.id === currentOrg?.id ? 'var(--neutral-alpha-weak)' : 'transparent',
                    cursor: 'pointer', fontSize: '0.8rem',
                    color: 'var(--neutral-on-background-strong)', textAlign: 'left',
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--neutral-alpha-weak)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = org.id === currentOrg?.id ? 'var(--neutral-alpha-weak)' : 'transparent' }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 4,
                    background: org.id === currentOrg?.id ? 'var(--brand-solid-strong)' : 'var(--neutral-alpha-medium)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {org.name[0].toUpperCase()}
                  </div>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {org.name}
                  </span>
                  {org.id === currentOrg?.id && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand-on-background-strong)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
                position: 'relative',
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
              {item.badge && item.badge > 0 ? (
                <span style={{
                  position: collapsed ? 'absolute' : 'relative',
                  top: collapsed ? 2 : 'auto',
                  right: collapsed ? 2 : 'auto',
                  marginLeft: collapsed ? 0 : 'auto',
                  minWidth: 18, height: 18, borderRadius: 9,
                  background: 'var(--danger-solid-strong)', color: '#fff',
                  fontSize: '0.65rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                }}>
                  {item.badge}
                </span>
              ) : null}
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
