'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSidebarContext } from './AppLayout'
import { useOrg } from '@/contexts/OrgContext'
import { getPlanLimits, type Plan } from '@/lib/limits'

function SvgIcon({ children, size = 18 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {children}
    </svg>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { collapsed, setCollapsed } = useSidebarContext()
  const { orgs, currentOrg, switchOrg } = useOrg()
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false)
  const [wsSearch, setWsSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [usage, setUsage] = useState<{ reportsUsed: number; maxReports: number; isLifetimeLimit: boolean } | null>(null)

  // Fetch usage data for the currently selected org
  useEffect(() => {
    let cancelled = false
    async function fetchUsage() {
      if (!currentOrg?.id) return
      try {
        const res = await fetch(`/api/billing/subscription?orgId=${currentOrg.id}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          const plan = (data.organization?.plan || 'FREE') as Plan
          const limits = getPlanLimits(plan)
          setUsage({
            reportsUsed: data.usage?.reportsUsed ?? 0,
            maxReports: limits.maxReports,
            isLifetimeLimit: limits.isLifetimeLimit,
          })
        }
      } catch { /* ignore */ }
    }
    setUsage(null) // Reset while loading new org data
    fetchUsage()
    return () => { cancelled = true }
  }, [currentOrg?.id])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setWsDropdownOpen(false)
        setWsSearch('')
      }
    }
    if (wsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [wsDropdownOpen])

  function isActive(prefix: string) {
    if (prefix === '/dashboard') {
      return pathname === '/dashboard' || pathname.startsWith('/projects') || pathname.startsWith('/feedbacks')
    }
    if (prefix === '/reports') {
      return pathname === '/reports' || pathname.startsWith('/reports/')
    }
    return pathname.startsWith(prefix)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    // Clear cached org data so next login doesn't show stale data
    try {
      localStorage.removeItem('qbugs_current_org_id')
      sessionStorage.clear()
    } catch {}
    // Hard navigation to clear Next.js Router Cache completely
    window.location.href = '/auth/login'
  }

  const filteredOrgs = orgs.filter((org) =>
    org.name.toLowerCase().includes(wsSearch.toLowerCase())
  )

  const wsNavItems = [
    {
      label: 'Projetos',
      href: '/dashboard',
      icon: <SvgIcon><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></SvgIcon>,
      matchPrefix: '/dashboard',
    },
    {
      label: 'Reports',
      href: '/reports',
      icon: <SvgIcon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></SvgIcon>,
      matchPrefix: '/reports',
    },
    {
      label: 'Equipe',
      href: '/team',
      icon: <SvgIcon><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></SvgIcon>,
      matchPrefix: '/team',
    },
  ]

  const SIDEBAR_WIDTH = '15rem'

  const bottomNavItems = [
    {
      label: 'Planos',
      href: '/plans',
      icon: <SvgIcon><path d="M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" /><path d="M1 10h22" /></SvgIcon>,
    },
    {
      label: 'Configurações',
      href: '/settings',
      icon: <SvgIcon><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></SvgIcon>,
    },
  ]

  function CollapsedIconButton({ icon, label, badge, onClick, active }: { icon: React.ReactNode; label: string; badge?: number; onClick: () => void; active?: boolean }) {
    return (
      <button
        onClick={onClick}
        title={label}
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
          transition: 'background 0.15s',
          position: 'relative',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--neutral-alpha-weak)' }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? 'var(--neutral-alpha-medium)' : 'transparent' }}
      >
        {icon}
        {badge && badge > 0 ? (
          <span style={{
            position: 'absolute',
            top: 2,
            right: 2,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            background: '#ef4444',
            color: '#fff',
            fontSize: '0.6rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
          }}>
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </button>
    )
  }

  // Collapsed state: icon-only rail
  if (collapsed) {
    return (
      <nav
        style={{
          width: '3.5rem',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          background: 'var(--surface-background)',
          borderRight: '1px solid var(--neutral-border-medium)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '0.75rem 0',
          gap: '0.25rem',
          zIndex: 100,
          transition: 'width 0.2s ease',
        }}
      >
        {/* Active workspace avatar */}
        {currentOrg && (
          <button
            onClick={() => setCollapsed(false)}
            title={currentOrg.name}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--brand-solid-strong)',
              color: '#fff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
              marginBottom: '0.25rem',
            }}
          >
            {currentOrg.name[0].toUpperCase()}
          </button>
        )}

        {/* Separator */}
        <div style={{ width: 24, height: 1, background: 'var(--neutral-border-medium)', flexShrink: 0, margin: '0.25rem 0' }} />

        {/* Workspace nav icons */}
        {wsNavItems.map((item) => (
          <CollapsedIconButton
            key={item.href}
            icon={item.icon}
            label={item.label}
            onClick={() => router.push(item.href)}
            active={isActive(item.matchPrefix)}
          />
        ))}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Separator */}
        <div style={{ width: 24, height: 1, background: 'var(--neutral-border-medium)', flexShrink: 0, margin: '0.25rem 0' }} />

        {/* Bottom nav icons */}
        {bottomNavItems.map((item) => (
          <CollapsedIconButton
            key={item.href}
            icon={item.icon}
            label={item.label}
            onClick={() => router.push(item.href)}
            active={isActive(item.href)}
          />
        ))}

        {/* Sign out */}
        <CollapsedIconButton
          icon={<SvgIcon><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></SvgIcon>}
          label="Sair"
          onClick={handleSignOut}
        />

        {/* Expand */}
        <CollapsedIconButton
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m9 18 6-6-6-6" /></svg>}
          label="Expandir menu"
          onClick={() => setCollapsed(false)}
        />
      </nav>
    )
  }

  return (
    <nav
      style={{
        width: SIDEBAR_WIDTH,
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        background: 'var(--surface-background)',
        borderRight: '1px solid var(--neutral-border-medium)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        transition: 'width 0.2s ease',
        overflow: 'visible',
      }}
    >
      {/* ── Top: Workspace Switcher ── */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            width: '100%',
            height: 56,
            padding: '0 1rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--neutral-alpha-weak)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--brand-solid-strong)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {currentOrg?.name?.[0]?.toUpperCase() || '?'}
          </div>

          {/* Name + plan */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--neutral-on-background-strong)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {currentOrg?.name || 'Workspace'}
            </div>
            <div style={{
              fontSize: '0.6875rem',
              color: 'var(--neutral-on-background-weak)',
              marginTop: 1,
            }}>
              {currentOrg?.plan || 'Free'}
            </div>
          </div>

          {/* Chevron */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--neutral-on-background-weak)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              flexShrink: 0,
              transition: 'transform 0.15s',
              transform: wsDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {/* ── Workspace Dropdown ── */}
        {wsDropdownOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              width: '100%',
              background: 'var(--surface-background)',
              border: '1px solid var(--neutral-border-medium)',
              borderRadius: '0 0 12px 12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 200,
              maxHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Search */}
            <div style={{ padding: '0.625rem 0.75rem', borderBottom: '1px solid var(--neutral-border-medium)' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4375rem 0.625rem',
                borderRadius: 8,
                background: 'var(--neutral-alpha-weak)',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--neutral-on-background-weak)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar workspaces"
                  value={wsSearch}
                  onChange={(e) => setWsSearch(e.target.value)}
                  autoFocus
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '0.8125rem',
                    color: 'var(--neutral-on-background-strong)',
                    width: '100%',
                  }}
                />
              </div>
            </div>

            {/* Workspace list */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '0.375rem 0' }}>
              {filteredOrgs.map((org) => {
                const active = org.id === currentOrg?.id
                return (
                  <button
                    key={org.id}
                    onClick={() => {
                      if (!active) switchOrg(org.id)
                      setWsDropdownOpen(false)
                      setWsSearch('')
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: 'none',
                      background: active ? 'var(--neutral-alpha-weak)' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = 'var(--neutral-alpha-weak)'
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: active ? 'var(--brand-solid-strong)' : 'var(--neutral-alpha-medium)',
                      color: active ? '#fff' : 'var(--neutral-on-background-strong)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {org.name[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.8125rem',
                        fontWeight: active ? 600 : 400,
                        color: 'var(--neutral-on-background-strong)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {org.name}
                      </div>
                      <div style={{
                        fontSize: '0.6875rem',
                        color: 'var(--neutral-on-background-weak)',
                      }}>
                        {org.plan || 'Free'}
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--neutral-on-background-weak)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                )
              })}
            </div>

          </div>
        )}
      </div>

      {/* ── Separator ── */}
      <div style={{ height: 1, background: 'var(--neutral-border-medium)', margin: '0 0.75rem', flexShrink: 0 }} />

      {/* ── Navigation ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', padding: '0.5rem 0.5rem', flex: 1 }}>
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
                transition: 'background 0.15s',
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

      {/* ── Usage Bar ── */}
      {usage && usage.maxReports > 0 && (() => {
        const pct = Math.min(100, Math.round((usage.reportsUsed / usage.maxReports) * 100))
        const isNear = pct >= 80
        const isAt = pct >= 100
        return (
          <div style={{ padding: '0 0.75rem 0.5rem', flexShrink: 0 }}>
            <div
              onClick={() => router.push('/plans')}
              style={{ cursor: 'pointer', padding: '0.5rem 0.625rem', borderRadius: '0.5rem', background: 'var(--neutral-alpha-weak)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--neutral-on-background-weak)', fontWeight: 500 }}>
                  Reports
                </span>
                <span style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: isAt ? 'var(--danger-on-background-strong)' : isNear ? 'var(--warning-on-background-strong)' : 'var(--neutral-on-background-medium)',
                }}>
                  {usage.reportsUsed}/{usage.maxReports}
                </span>
              </div>
              <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'var(--neutral-alpha-medium)' }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  borderRadius: 2,
                  background: isAt ? 'var(--danger-solid-strong)' : isNear ? 'var(--warning-solid-strong)' : 'var(--brand-solid-strong)',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Bottom: Utilities ── */}
      <div style={{
        borderTop: '1px solid var(--neutral-border-medium)',
        padding: '0.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.125rem',
      }}>
        {bottomNavItems.map((item) => {
          const active = isActive(item.href)
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
                transition: 'background 0.15s',
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
              {item.label}
            </button>
          )
        })}

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: 'transparent',
            color: 'var(--neutral-on-background-weak)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 400,
            width: '100%',
            textAlign: 'left',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--neutral-alpha-weak)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          <SvgIcon>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </SvgIcon>
          Sair
        </button>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: 'transparent',
            color: 'var(--neutral-on-background-weak)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 400,
            width: '100%',
            textAlign: 'left',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--neutral-alpha-weak)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="m15 18-6-6 6-6" />
          </svg>
          Minimizar
        </button>
      </div>
    </nav>
  )
}
