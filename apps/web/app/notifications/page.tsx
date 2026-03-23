'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Column,
  Row,
  Heading,
  Text,
  Button,
  Tag,
  Feedback,
} from '@once-ui-system/core'
import AppLayout from '@/components/ui/AppLayout'
import { useOrg } from '@/contexts/OrgContext'
import { SkeletonBar, SkeletonCard } from '@/components/ui/LoadingSkeleton'

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
  MEMBER: 'Membro',
  VIEWER: 'Visualizador',
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  STATUS_CHANGE: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    ),
    color: '#3b82f6',
  },
  PROJECT_CREATED: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        <line x1="12" y1="11" x2="12" y2="17" />
        <line x1="9" y1="14" x2="15" y2="14" />
      </svg>
    ),
    color: '#8b5cf6',
  },
  EMBED_CONNECTED: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    color: '#10b981',
  },
  MEMBER_JOINED: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    ),
    color: '#22c55e',
  },
  MEMBER_LEFT: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    ),
    color: '#ef4444',
  },
  PLAN_ACTIVATED: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    color: '#f59e0b',
  },
  PLAN_EXPIRED: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    color: '#ef4444',
  },
  DUE_DATE_SET: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    color: '#3b82f6',
  },
  DUE_DATE_APPROACHING: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    color: '#f59e0b',
  },
  DUE_DATE_EXPIRED: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    color: '#ef4444',
  },
  DUE_DATE_OVERDUE: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
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
        <Column as="main" fillWidth paddingX="l" paddingY="m" gap="l">
          <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }`}</style>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <SkeletonBar width="10rem" height="1.75rem" />
            <SkeletonBar width="16rem" height="0.875rem" />
          </div>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <SkeletonBar width="2rem" height="2rem" radius="0.5rem" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <SkeletonBar width="10rem" height="1rem" />
                    <SkeletonBar width="14rem" height="0.75rem" />
                  </div>
                </div>
              </div>
            </SkeletonCard>
          ))}
        </Column>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Column as="main" fillWidth paddingX="l" paddingY="m" gap="l">
        <Column gap="xs">
          <Heading variant="heading-strong-l">Notificações</Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Convites e atividade da plataforma
          </Text>
        </Column>

        {message && <Feedback variant={message.type}>{message.text}</Feedback>}

        {notifications.length === 0 ? (
          <Column fillWidth padding="l" gap="m" radius="l" border="neutral-medium" background="surface" horizontal="center" vertical="center" style={{ minHeight: '8rem' }}>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Nenhuma notificação pendente.
            </Text>
          </Column>
        ) : (
          <Column fillWidth gap="m">
            {/* Invites section */}
            {invites.length > 0 && (
              <Column fillWidth gap="s">
                <Text variant="label-default-s" onBackground="neutral-weak" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Convites pendentes
                </Text>
                {invites.map((invite) => (
                  <Column
                    key={invite.id}
                    fillWidth
                    padding="l"
                    gap="m"
                    radius="l"
                    border="neutral-medium"
                    background="surface"
                  >
                    <Row fillWidth horizontal="between" vertical="center">
                      <Column gap="4">
                        <Row gap="s" vertical="center">
                          <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: 'var(--brand-solid-strong)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
                          }}>
                            {(invite.orgName || 'O')[0].toUpperCase()}
                          </div>
                          <Column gap="2">
                            <Text variant="body-default-m" onBackground="neutral-strong" style={{ fontWeight: 500 }}>
                              {invite.orgName}
                            </Text>
                            <Row gap="xs" vertical="center">
                              <Text variant="body-default-s" onBackground="neutral-weak">
                                Convite para participar como
                              </Text>
                              <Tag variant="neutral" size="s" label={ROLE_LABELS[invite.role || ''] || invite.role || ''} />
                            </Row>
                          </Column>
                        </Row>
                      </Column>

                      <Row gap="s">
                        <Button
                          variant="primary"
                          size="s"
                          label={actionLoading === invite.id ? 'Aceitando...' : 'Aceitar'}
                          onClick={() => handleAccept(invite.id)}
                          disabled={!!actionLoading}
                        />
                        <Button
                          variant="tertiary"
                          size="s"
                          label="Recusar"
                          onClick={() => handleReject(invite.id)}
                          disabled={!!actionLoading}
                        />
                      </Row>
                    </Row>
                  </Column>
                ))}
              </Column>
            )}

            {/* Activity section */}
            {activityNotifs.length > 0 && (
              <Column fillWidth gap="s">
                <Text variant="label-default-s" onBackground="neutral-weak" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Atividade
                </Text>
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
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            fontSize: '0.875rem', fontWeight: notif.read ? 400 : 600,
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
                            fontSize: '0.8125rem', color: 'var(--neutral-on-background-weak)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            display: 'block',
                          }}>
                            {notif.message}
                          </span>
                        )}
                      </div>

                      {/* Time */}
                      {notif.createdAt && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', flexShrink: 0 }}>
                          {timeAgo(notif.createdAt)}
                        </span>
                      )}

                      {/* Chevron */}
                      {route && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--neutral-on-background-weak)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      )}
                    </div>
                  )
                })}
              </Column>
            )}
          </Column>
        )}
      </Column>
    </AppLayout>
  )
}
