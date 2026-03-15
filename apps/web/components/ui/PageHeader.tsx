'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/contexts/OrgContext'
import UpgradeModal from './UpgradeModal'

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free',
  STARTER: 'Starter',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
}

function HeaderIconButton({ icon, label, badge, onClick }: { icon: React.ReactNode; label: string; badge?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
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
        transition: 'background 0.15s, color 0.15s',
        position: 'relative',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--neutral-alpha-weak)'
        e.currentTarget.style.color = 'var(--neutral-on-background-strong)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--neutral-on-background-weak)'
      }}
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

export default function PageHeader() {
  const router = useRouter()
  const { currentOrg } = useOrg()
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [notifCount, setNotifCount] = useState(0)
  const [showUpgrade, setShowUpgrade] = useState(false)

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserName(user.user_metadata?.name || '')
        setUserEmail(user.email || '')
      }
    }
    fetchUser()
  }, [])

  const fetchNotifCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifCount(data.count || 0)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchNotifCount()
    const interval = setInterval(fetchNotifCount, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifCount])

  const initials = userName
    ? userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : userEmail ? userEmail[0].toUpperCase() : '?'

  const plan = currentOrg?.plan || 'FREE'

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        padding: '0 1.5rem',
        borderBottom: '1px solid var(--neutral-border-medium)',
        background: 'var(--surface-background)',
        flexShrink: 0,
      }}
    >
      {/* Left: Brand + Plan badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span
          style={{
            fontFamily: 'var(--font-logo)',
            fontWeight: 700,
            fontSize: '1.25rem',
            letterSpacing: '-0.02em',
            color: 'var(--neutral-on-background-strong)',
          }}
        >
          Report Bug
        </span>
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            padding: '0.1875rem 0.5rem',
            borderRadius: 4,
            background: plan === 'FREE' ? 'var(--neutral-alpha-weak)' : 'var(--brand-alpha-weak)',
            color: plan === 'FREE' ? 'var(--neutral-on-background-weak)' : 'var(--brand-on-background-strong)',
          }}
        >
          {PLAN_LABELS[plan] || plan}
        </span>
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {/* Invite members */}
        <button
          onClick={() => router.push('/team')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.4375rem 0.875rem',
            borderRadius: 8,
            border: '1px solid var(--neutral-border-medium)',
            background: 'transparent',
            color: 'var(--neutral-on-background-strong)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--neutral-alpha-weak)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          Convidar membros
        </button>

        {/* Upgrade */}
        {plan === 'FREE' && (
          <button
            onClick={() => setShowUpgrade(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.4375rem 0.875rem',
              borderRadius: 8,
              border: 'none',
              background: 'var(--brand-solid-strong)',
              color: '#fff',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            Upgrade
          </button>
        )}

        {/* Separator */}
        <div style={{ width: 1, height: 24, background: 'var(--neutral-border-medium)', margin: '0 0.375rem', flexShrink: 0 }} />

        {/* Notifications */}
        <HeaderIconButton
          label="Notificações"
          badge={notifCount}
          onClick={() => router.push('/notifications')}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          }
        />

        {/* User avatar */}
        <div
          onClick={() => router.push('/settings')}
          title={userName || userEmail}
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'var(--neutral-on-background-strong)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 700,
            flexShrink: 0,
            cursor: 'pointer',
            marginLeft: '0.25rem',
          }}
        >
          {initials}
        </div>
      </div>

      {showUpgrade && (
        <UpgradeModal
          currentPlan={(plan as 'FREE' | 'PRO' | 'BUSINESS') || 'FREE'}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </header>
  )
}
