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
    feedbackType?: string
    severity?: string
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

const TYPE_ICONS: Record<string, string> = {
  BUG: '🐛',
  SUGGESTION: '💡',
  QUESTION: '❓',
  PRAISE: '⭐',
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#ca8a04',
  LOW: '#65a30d',
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

  // Mark feedback notifications as read on mount
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

  const handleFeedbackClick = (notif: Notification) => {
    if (notif.metadata?.feedbackId) {
      router.push(`/feedbacks/${notif.metadata.feedbackId}`)
    }
  }

  const invites = notifications.filter((n) => n.type === 'INVITE')
  const feedbackNotifs = notifications.filter((n) => n.type !== 'INVITE')

  if (loading) {
    return (
      <AppLayout>
        <Column as="main" fillWidth maxWidth={40} paddingX="l" paddingY="m" gap="l" style={{ margin: '0 auto' }}>
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
      <Column as="main" fillWidth maxWidth={40} paddingX="l" paddingY="m" gap="l" style={{ margin: '0 auto' }}>
        <Column gap="xs">
          <Heading variant="heading-strong-l">Notificações</Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Convites e avisos da plataforma
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

            {/* Feedback notifications section */}
            {feedbackNotifs.length > 0 && (
              <Column fillWidth gap="s">
                <Text variant="label-default-s" onBackground="neutral-weak" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Reports recebidos
                </Text>
                {feedbackNotifs.map((notif) => {
                  const icon = TYPE_ICONS[notif.metadata?.feedbackType || ''] || '📋'
                  const severityColor = SEVERITY_COLORS[notif.metadata?.severity || '']

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleFeedbackClick(notif)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.875rem 1rem',
                        borderRadius: '0.75rem',
                        border: '1px solid var(--neutral-border-medium)',
                        background: notif.read ? 'var(--surface-background)' : 'var(--neutral-alpha-weak)',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--neutral-alpha-weak)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = notif.read ? 'var(--surface-background)' : 'var(--neutral-alpha-weak)' }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: 'var(--neutral-alpha-weak)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.1rem', flexShrink: 0,
                      }}>
                        {icon}
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
                        <span style={{
                          fontSize: '0.8125rem', color: 'var(--neutral-on-background-weak)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          display: 'block',
                        }}>
                          {notif.message}
                        </span>
                      </div>

                      {/* Right side: severity + time */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0 }}>
                        {severityColor && (
                          <span style={{
                            fontSize: '0.6875rem', fontWeight: 600,
                            color: severityColor, textTransform: 'uppercase',
                          }}>
                            {notif.metadata?.severity}
                          </span>
                        )}
                        {notif.createdAt && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)' }}>
                            {timeAgo(notif.createdAt)}
                          </span>
                        )}
                      </div>

                      {/* Chevron */}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--neutral-on-background-weak)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
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
