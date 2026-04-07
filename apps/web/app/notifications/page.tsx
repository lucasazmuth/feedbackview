'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/ui/AppLayout'
import { useOrg } from '@/contexts/OrgContext'
import { SkeletonBar, SkeletonCard } from '@/components/ui/LoadingSkeleton'
import { Alert } from '@/components/ui/Alert'
import { AppIcon } from '@/components/ui/AppIcon'

interface Notification {
  id: string
  type: string
  title: string
  message?: string
  role?: string
  orgName?: string
  orgId?: string
  metadata?: {
    feedbackId?: string
    projectId?: string
    projectName?: string
    orgId?: string
    orgName?: string
    memberEmail?: string
    plan?: string
    previousPlan?: string
    oldStatus?: string
    newStatus?: string
  }
  read?: boolean
  createdAt?: string
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Admin',
  MEMBER: 'Editor',
  VIEWER: 'Visualizador',
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  STATUS_CHANGE: {
    icon: (
      <AppIcon size="md">
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </AppIcon>
    ),
    color: '#3b82f6',
  },
  PROJECT_CREATED: {
    icon: (
      <AppIcon size="md">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        <line x1="12" y1="11" x2="12" y2="17" />
        <line x1="9" y1="14" x2="15" y2="14" />
      </AppIcon>
    ),
    color: '#8b5cf6',
  },
  EMBED_CONNECTED: {
    icon: (
      <AppIcon size="md">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </AppIcon>
    ),
    color: '#10b981',
  },
  MEMBER_JOINED: {
    icon: (
      <AppIcon size="md">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </AppIcon>
    ),
    color: '#22c55e',
  },
  MEMBER_LEFT: {
    icon: (
      <AppIcon size="md">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </AppIcon>
    ),
    color: '#ef4444',
  },
  PLAN_ACTIVATED: {
    icon: (
      <AppIcon size="md">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </AppIcon>
    ),
    color: '#f59e0b',
  },
  PLAN_EXPIRED: {
    icon: (
      <AppIcon size="md">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </AppIcon>
    ),
    color: '#ef4444',
  },
  DUE_DATE_SET: {
    icon: (
      <AppIcon size="md">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </AppIcon>
    ),
    color: '#3b82f6',
  },
  DUE_DATE_APPROACHING: {
    icon: (
      <AppIcon size="md">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </AppIcon>
    ),
    color: '#f59e0b',
  },
  DUE_DATE_EXPIRED: {
    icon: (
      <AppIcon size="md">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </AppIcon>
    ),
    color: '#ef4444',
  },
  DUE_DATE_OVERDUE: {
    icon: (
      <AppIcon size="md">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </AppIcon>
    ),
    color: '#dc2626',
  },
}

function getNotifRoute(notif: Notification): string | null {
  switch (notif.type) {
    case 'STATUS_CHANGE':
      return notif.metadata?.feedbackId ? `/feedbacks/${notif.metadata.feedbackId}` : null
    case 'PROJECT_CREATED':
    case 'EMBED_CONNECTED':
      return notif.metadata?.projectId ? `/projects/${notif.metadata.projectId}` : null
    case 'MEMBER_JOINED':
    case 'MEMBER_LEFT':
      return '/team'
    case 'PLAN_ACTIVATED':
    case 'PLAN_EXPIRED':
      return '/plans'
    case 'DUE_DATE_SET':
    case 'DUE_DATE_APPROACHING':
    case 'DUE_DATE_EXPIRED':
    case 'DUE_DATE_OVERDUE':
      return notif.metadata?.feedbackId ? `/feedbacks/${notif.metadata.feedbackId}` : '/reports'
    default:
      return null
  }
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

export default function NotificationsPage() {
  const router = useRouter()
  const { refreshOrgs, switchOrg } = useOrg()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Mark non-invite notifications as read on mount
  useEffect(() => {
    if (notifications.length === 0) return
    const unreadIds = notifications
      .filter((n) => n.type !== 'INVITE' && !n.read)
      .map((n) => n.id)
    if (unreadIds.length === 0) return

    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: unreadIds }),
    }).then(() => {
      setNotifications((prev) =>
        prev.map((n) => (unreadIds.includes(n.id) ? { ...n, read: true } : n))
      )
    }).catch(() => {})
  }, [notifications.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccept = async (inviteId: string) => {
    setActionLoading(inviteId)
    setMessage(null)
    try {
      const res = await fetch('/api/team/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: 'Convite aceito! Agora você faz parte da organização.' })
        setNotifications((prev) => prev.filter((i) => i.id !== inviteId))
        // Refresh orgs and switch to the new workspace
        await refreshOrgs()
        if (data.organizationId) {
          switchOrg(data.organizationId)
        }
      } else {
        setMessage({ type: 'danger', text: data.error || 'Erro ao aceitar convite.' })
      }
    } catch {
      setMessage({ type: 'danger', text: 'Erro de conexão.' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (inviteId: string) => {
    setActionLoading(inviteId)
    setMessage(null)
    try {
      const res = await fetch('/api/team/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: 'Convite recusado.' })
        setNotifications((prev) => prev.filter((i) => i.id !== inviteId))
      } else {
        setMessage({ type: 'danger', text: data.error || 'Erro ao recusar convite.' })
      }
    } catch {
      setMessage({ type: 'danger', text: 'Erro de conexão.' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleNotifClick = (notif: Notification) => {
    const route = getNotifRoute(notif)
    if (route) router.push(route)
  }

  const invites = notifications.filter((n) => n.type === 'INVITE')
  const activityNotifs = notifications.filter((n) => n.type !== 'INVITE')

  if (loading) {
    return (
      <AppLayout>
        <div className="app-page" style={{ maxWidth: '100%' }}>
          <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }`}</style>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <SkeletonBar width="10rem" height="1.75rem" />
            <SkeletonBar width="16rem" height="0.875rem" />
          </div>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <SkeletonBar width="2rem" height="2rem" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <SkeletonBar width="10rem" height="1rem" />
                    <SkeletonBar width="14rem" height="0.75rem" />
                  </div>
                </div>
              </div>
            </SkeletonCard>
          ))}
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="app-page" style={{ maxWidth: '100%' }}>
        <div>
          <h2 className="app-section-title" style={{ fontSize: '2rem' }}>Notificações</h2>
          <p className="app-section-sub">
            Convites e atividade da plataforma
          </p>
        </div>

        {message && <Alert variant={message.type}>{message.text}</Alert>}

        {notifications.length === 0 ? (
          <div className="app-card" style={{ minHeight: '8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="app-section-sub">
              Nenhuma notificação pendente.
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            {/* Invites section */}
            {invites.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '1.2rem', fontWeight: 700, color: 'var(--neutral-on-background-weak)' }}>
                  Convites pendentes
                </span>
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="app-card"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: 'var(--brand-solid-strong)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.4rem', fontWeight: 700, flexShrink: 0,
                          }}>
                            {(invite.orgName || 'O')[0].toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '1.4rem', color: 'var(--neutral-on-background-strong)' }}>
                              {invite.orgName}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <span style={{ fontSize: '1.4rem', color: 'var(--neutral-on-background-weak)' }}>
                                Convite para participar como
                              </span>
                              <span className="app-badge" style={{ background: 'var(--brand-alpha-weak)', color: 'var(--brand-on-background-strong)' }}>{ROLE_LABELS[invite.role || ''] || invite.role}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <button onClick={() => handleAccept(invite.id)} disabled={!!actionLoading} className="app-btn-primary">{actionLoading === invite.id ? 'Aceitando...' : 'Aceitar'}</button>
                        <button onClick={() => handleReject(invite.id)} disabled={!!actionLoading} className="app-btn-secondary">Recusar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Activity section */}
            {activityNotifs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '1.2rem', fontWeight: 700, color: 'var(--neutral-on-background-weak)' }}>
                  Atividade
                </span>
                {activityNotifs.map((notif) => {
                  const config = TYPE_CONFIG[notif.type]
                  const route = getNotifRoute(notif)

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.875rem 1rem',
                        borderRadius: '0.75rem',
                        border: '1px solid var(--neutral-border-medium)',
                        background: notif.read ? 'var(--surface-background)' : 'var(--neutral-alpha-weak)',
                        cursor: route ? 'pointer' : 'default',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { if (route) e.currentTarget.style.background = 'var(--neutral-alpha-weak)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = notif.read ? 'var(--surface-background)' : 'var(--neutral-alpha-weak)' }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: config ? `${config.color}18` : 'var(--neutral-alpha-weak)',
                        color: config?.color || 'var(--neutral-on-background-weak)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {config?.icon || (
                          <AppIcon size="md">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </AppIcon>
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            fontSize: '1.4rem', fontWeight: notif.read ? 400 : 600,
                            color: 'var(--neutral-on-background-strong)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {notif.title}
                          </span>
                          {!notif.read && (
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: '#3b82f6', flexShrink: 0,
                            }} />
                          )}
                        </div>
                        {notif.message && (
                          <span style={{
                            fontSize: '1.4rem', color: 'var(--neutral-on-background-weak)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            display: 'block',
                          }}>
                            {notif.message}
                          </span>
                        )}
                      </div>

                      {/* Time */}
                      {notif.createdAt && (
                        <span style={{ fontSize: '1.2rem', color: 'var(--neutral-on-background-weak)', flexShrink: 0 }}>
                          {timeAgo(notif.createdAt)}
                        </span>
                      )}

                      {/* Chevron */}
                      {route && (
                        <AppIcon size="md" style={{ color: 'var(--neutral-on-background-weak)' }}>
                          <polyline points="9 18 15 12 9 6" />
                        </AppIcon>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
