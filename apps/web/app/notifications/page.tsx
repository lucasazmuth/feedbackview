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

interface Invite {
  id: string
  type: string
  role: string
  orgName: string
  orgId: string
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Admin',
  MEMBER: 'Membro',
  VIEWER: 'Visualizador',
}

export default function NotificationsPage() {
  const router = useRouter()
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setInvites(data.notifications || [])
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
        setInvites((prev) => prev.filter((i) => i.id !== inviteId))
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
        setInvites((prev) => prev.filter((i) => i.id !== inviteId))
      } else {
        setMessage({ type: 'danger', text: data.error || 'Erro ao recusar convite.' })
      }
    } catch {
      setMessage({ type: 'danger', text: 'Erro de conexão.' })
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <Column as="main" fillWidth maxWidth={40} paddingX="l" paddingY="xl" gap="l" style={{ margin: '0 auto' }}>
          <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }`}</style>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <SkeletonBar width="10rem" height="1.75rem" />
            <SkeletonBar width="16rem" height="0.875rem" />
          </div>
          {[1, 2].map((i) => (
            <SkeletonCard key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <SkeletonBar width="2rem" height="2rem" radius="0.5rem" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <SkeletonBar width="10rem" height="1rem" />
                    <SkeletonBar width="14rem" height="0.75rem" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <SkeletonBar width="5rem" height="2rem" />
                  <SkeletonBar width="5rem" height="2rem" />
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
      <Column as="main" fillWidth maxWidth={40} paddingX="l" paddingY="xl" gap="l" style={{ margin: '0 auto' }}>
        <Column gap="xs">
          <Heading variant="heading-strong-l">Notificações</Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Convites e avisos da plataforma
          </Text>
        </Column>

        {message && <Feedback variant={message.type}>{message.text}</Feedback>}

        {invites.length === 0 ? (
          <Column fillWidth padding="l" gap="m" radius="l" border="neutral-medium" background="surface" horizontal="center" vertical="center" style={{ minHeight: '8rem' }}>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Nenhuma notificação pendente.
            </Text>
          </Column>
        ) : (
          <Column fillWidth gap="s">
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
                        {invite.orgName[0].toUpperCase()}
                      </div>
                      <Column gap="2">
                        <Text variant="body-default-m" onBackground="neutral-strong" style={{ fontWeight: 500 }}>
                          {invite.orgName}
                        </Text>
                        <Row gap="xs" vertical="center">
                          <Text variant="body-default-s" onBackground="neutral-weak">
                            Convite para participar como
                          </Text>
                          <Tag variant="neutral" size="s" label={ROLE_LABELS[invite.role] || invite.role} />
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
      </Column>
    </AppLayout>
  )
}
