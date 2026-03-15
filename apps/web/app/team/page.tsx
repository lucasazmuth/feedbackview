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
  Input,
  Feedback,
} from '@once-ui-system/core'
import AppLayout from '@/components/ui/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/contexts/OrgContext'
import { SkeletonBar, SkeletonCard } from '@/components/ui/LoadingSkeleton'

interface Member {
  id: string
  name: string
  email: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  status: 'ACTIVE' | 'PENDING'
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Admin',
  MEMBER: 'Membro',
  VIEWER: 'Visualizador',
}

const ROLE_VARIANTS: Record<string, 'brand' | 'success' | 'neutral' | 'warning'> = {
  OWNER: 'brand',
  ADMIN: 'success',
  MEMBER: 'neutral',
  VIEWER: 'warning',
}

export default function TeamPage() {
  const router = useRouter()
  const { currentOrg } = useOrg()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [maxMembers, setMaxMembers] = useState(1)
  const [message, setMessage] = useState<{ type: 'success' | 'danger' | 'warning'; text: string } | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/subscription')
      if (!res.ok) return

      const data = await res.json()
      const orgId = data.organization.id
      setMaxMembers(data.organization.maxMembers)

      const supabase = createClient()

      const { data: teamMembers } = await supabase
        .from('TeamMember')
        .select('id, userId, role, status, inviteEmail')
        .eq('organizationId', orgId)
        .neq('status', 'REMOVED')
        .order('role', { ascending: true })

      if (teamMembers) {
        const orgName = data.organization.name || ''

        setMembers(
          teamMembers.map((tm: Record<string, unknown>) => ({
            id: tm.id as string,
            name: (tm.inviteEmail as string) || orgName || 'Membro',
            email: (tm.inviteEmail as string) || '',
            role: tm.role as Member['role'],
            status: tm.status as Member['status'],
          }))
        )
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const activeMembers = members.filter((m) => m.status === 'ACTIVE').length
  const canInvite = activeMembers < maxMembers

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !currentOrg) return
    setInviteLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), orgId: currentOrg.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setInviteEmail('')
        setMessage({ type: 'success', text: 'Convite enviado! O usuário verá na área de notificações.' })
        fetchData()
      } else {
        setMessage({ type: 'danger', text: data.error || 'Erro ao enviar convite.' })
      }
    } catch {
      setMessage({ type: 'danger', text: 'Erro de conexão.' })
    } finally {
      setInviteLoading(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <Column as="main" fillWidth maxWidth={40} paddingX="xl" paddingY="l" gap="l" style={{ margin: '0 auto' }}>
          <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }`}</style>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <SkeletonBar width="6rem" height="1.75rem" />
            <SkeletonBar width="18rem" height="0.875rem" />
          </div>
          <SkeletonCard>
            <SkeletonBar width="10rem" height="1.25rem" />
            <SkeletonBar width="16rem" height="0.75rem" />
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
              <SkeletonBar width="100%" height="2.5rem" />
              <SkeletonBar width="6rem" height="2.5rem" />
            </div>
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonBar width="8rem" height="1.25rem" />
            {[1, 2].map((i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: i < 2 ? '1px solid var(--neutral-border-medium)' : 'none' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <SkeletonBar width="8rem" height="1rem" />
                  <SkeletonBar width="4rem" height="1.25rem" radius="999px" />
                </div>
                <SkeletonBar width="5rem" height="2rem" />
              </div>
            ))}
          </SkeletonCard>
        </Column>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Column as="main" fillWidth maxWidth={40} paddingX="xl" paddingY="l" gap="l" style={{ margin: '0 auto' }}>
        <Column gap="xs">
          <Heading variant="heading-strong-l">Equipe</Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Gerencie os membros da sua organização
          </Text>
        </Column>

        {message && <Feedback variant={message.type}>{message.text}</Feedback>}

        {/* Invite section */}
        <Column fillWidth padding="l" gap="m" radius="l" border="neutral-medium" background="surface">
          <Column gap="4">
            <Heading variant="heading-strong-m">Convidar membro</Heading>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {canInvite
                ? `Convide membros para sua organização (${activeMembers}/${maxMembers === 999999 ? '∞' : maxMembers})`
                : `Limite de ${maxMembers} membro(s) atingido.`}
            </Text>
            {!canInvite && (
              <Button
                variant="tertiary"
                size="s"
                label="Fazer upgrade para mais membros"
                onClick={() => router.push('/plans/upgrade')}
              />
            )}
          </Column>

          <Row gap="s" fillWidth vertical="end">
            <div style={{ flex: 1 }}>
              <Input
                id="invite-email"
                label="Email"
                type="email"
                value={inviteEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)}
                placeholder="colega@empresa.com"
                disabled={!canInvite}
              />
            </div>
            <Button
              variant="primary"
              size="m"
              label={inviteLoading ? 'Enviando...' : 'Convidar'}
              onClick={handleInvite}
              disabled={!canInvite || inviteLoading || !inviteEmail.trim()}
            />
          </Row>
        </Column>

        {/* Members list */}
        <Column fillWidth padding="l" gap="m" radius="l" border="neutral-medium" background="surface">
          <Heading variant="heading-strong-m">Membros ({members.length})</Heading>

          <Column gap="0" fillWidth>
            {members.length === 0 ? (
              <Text variant="body-default-s" onBackground="neutral-weak">Nenhum membro encontrado.</Text>
            ) : (
              members.map((member, index) => (
                <Row
                  key={member.id}
                  fillWidth
                  horizontal="between"
                  vertical="center"
                  style={{
                    padding: '0.75rem 0',
                    borderBottom: index < members.length - 1 ? '1px solid var(--neutral-border-medium)' : 'none',
                  }}
                >
                  <Column gap="4">
                    <Row gap="s" vertical="center">
                      <Text variant="body-default-m" onBackground="neutral-strong" style={{ fontWeight: 500 }}>
                        {member.name}
                      </Text>
                      <Tag
                        variant={ROLE_VARIANTS[member.role]}
                        size="s"
                        label={ROLE_LABELS[member.role]}
                      />
                      {member.status === 'PENDING' && (
                        <Tag variant="warning" size="s" label="Pendente" />
                      )}
                    </Row>
                    {member.email && (
                      <Text variant="body-default-s" onBackground="neutral-weak">{member.email}</Text>
                    )}
                  </Column>

                  {member.role !== 'OWNER' && (
                    <Button
                      variant="danger"
                      size="s"
                      label="Remover"
                      disabled
                    />
                  )}
                </Row>
              ))
            )}
          </Column>
        </Column>
      </Column>
    </AppLayout>
  )
}
