'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Column,
  Row,
  Heading,
  Text,
  Button,
  Tag,
  Input,
  Feedback,
  Select,
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
  const { currentOrg } = useOrg()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'danger' | 'warning'; text: string } | null>(null)
  const [removingMember, setRemovingMember] = useState<Member | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!currentOrg?.id) return
    try {
      const res = await fetch(`/api/billing/subscription?orgId=${currentOrg.id}`)
      if (!res.ok) return

      const data = await res.json()
      const orgId = data.organization.id

      const supabase = createClient()

      // Get current user to determine their role
      const { data: { user } } = await supabase.auth.getUser()

      const { data: teamMembers } = await supabase
        .from('TeamMember')
        .select('id, userId, role, status, inviteEmail')
        .eq('organizationId', orgId)
        .neq('status', 'REMOVED')
        .order('role', { ascending: true })

      if (teamMembers) {
        const orgName = data.organization.name || ''

        // Find current user's role
        if (user) {
          const myMembership = teamMembers.find((tm: Record<string, unknown>) => tm.userId === user.id)
          if (myMembership) {
            setCurrentUserRole((myMembership as Record<string, unknown>).role as string)
          }
        }

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
  }, [currentOrg?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !currentOrg) return
    setInviteLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), orgId: currentOrg.id, role: inviteRole }),
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

  const handleRemove = async () => {
    if (!removingMember || !currentOrg) return
    setRemoveLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/team/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: removingMember.id, orgId: currentOrg.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: `${removingMember.name} foi removido da organização.` })
        fetchData()
      } else {
        setMessage({ type: 'danger', text: data.error || 'Erro ao remover membro.' })
      }
    } catch {
      setMessage({ type: 'danger', text: 'Erro de conexão.' })
    } finally {
      setRemoveLoading(false)
      setRemovingMember(null)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <Column as="main" fillWidth paddingX="l" paddingY="m" gap="l">
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
      <Column as="main" fillWidth paddingX="l" paddingY="m" gap="l">
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
              Convide membros para sua organização
            </Text>
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
              />
            </div>
            <div style={{ width: '10rem' }}>
              <Select
                id="invite-role"
                label="Função"
                options={[
                  { value: 'ADMIN', label: 'Admin' },
                  { value: 'MEMBER', label: 'Membro' },
                  { value: 'VIEWER', label: 'Visualizador' },
                ]}
                value={inviteRole}
                onSelect={(value: string) => setInviteRole(value as 'ADMIN' | 'MEMBER' | 'VIEWER')}
              />
            </div>
            <Button
              variant="primary"
              size="m"
              label={inviteLoading ? 'Enviando...' : 'Convidar'}
              onClick={handleInvite}
              disabled={inviteLoading || !inviteEmail.trim()}
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

                  {member.role !== 'OWNER' && currentUserRole === 'OWNER' && (
                    <Button
                      variant="danger"
                      size="s"
                      label="Remover"
                      onClick={() => setRemovingMember(member)}
                    />
                  )}
                </Row>
              ))
            )}
          </Column>
        </Column>
      </Column>

      {/* Confirmation modal */}
      {removingMember && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !removeLoading && setRemovingMember(null)}
        >
          <Column
            padding="l"
            gap="m"
            radius="l"
            background="surface"
            border="neutral-medium"
            style={{ maxWidth: '28rem', width: '100%' }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <Column gap="4">
              <Heading variant="heading-strong-m">Remover membro</Heading>
              <Text variant="body-default-s" onBackground="neutral-weak">
                Tem certeza que deseja remover <strong>{removingMember.name}</strong> ({removingMember.email}) da organização? Esta ação não pode ser desfeita.
              </Text>
            </Column>
            <Row gap="s" horizontal="end">
              <Button
                variant="secondary"
                size="m"
                label="Cancelar"
                onClick={() => setRemovingMember(null)}
                disabled={removeLoading}
              />
              <Button
                variant="danger"
                size="m"
                label={removeLoading ? 'Removendo...' : 'Remover'}
                onClick={handleRemove}
                disabled={removeLoading}
              />
            </Row>
          </Column>
        </div>
      )}
    </AppLayout>
  )
}
