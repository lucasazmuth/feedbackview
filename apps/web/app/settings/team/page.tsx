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

      // Fetch team members
      const supabase = createClient()
      const { data: teamMembers } = await supabase
        .from('TeamMember')
        .select('id, userId, role, status, user:User(name, email)')
        .eq('organizationId', orgId)
        .neq('status', 'REMOVED')
        .order('role', { ascending: true })

      if (teamMembers) {
        setMembers(
          teamMembers.map((tm: Record<string, unknown>) => {
            const user = tm.user as { name: string | null; email: string } | null
            return {
              id: tm.id as string,
              name: user?.name || 'Sem nome',
              email: user?.email || '',
              role: tm.role as Member['role'],
              status: tm.status as Member['status'],
            }
          })
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
    if (!inviteEmail.trim()) return
    setInviteLoading(true)
    setMessage(null)

    // TODO: implement real invite flow (send email, create PENDING TeamMember)
    setTimeout(() => {
      setInviteLoading(false)
      setInviteEmail('')
      setMessage({ type: 'warning', text: 'Convites por email serão implementados em breve. Por enquanto, adicione membros manualmente.' })
    }, 500)
  }

  if (loading) {
    return (
      <AppLayout>
        <Column as="main" fillWidth maxWidth={40} paddingX="l" paddingY="xl" gap="l" style={{ margin: '0 auto' }}>
          <Text variant="body-default-m" onBackground="neutral-weak">Carregando...</Text>
        </Column>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Column as="main" fillWidth maxWidth={40} paddingX="l" paddingY="xl" gap="l" style={{ margin: '0 auto' }}>
        <Column gap="xs">
          <Heading variant="heading-strong-l">Configurações</Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Gerencie sua equipe
          </Text>
        </Column>

        <Row gap="s">
          <Button variant="tertiary" size="s" label="Perfil" onClick={() => router.push('/settings')} />
          <Button variant="tertiary" size="s" label="Plano & Uso" onClick={() => router.push('/settings/billing')} />
          <Button variant="secondary" size="s" label="Equipe" onClick={() => router.push('/settings/team')} />
        </Row>

        {message && <Feedback variant={message.type}>{message.text}</Feedback>}

        {/* Invite section */}
        <Column fillWidth padding="l" gap="m" radius="l" border="neutral-medium" background="surface">
          <Column gap="4">
            <Heading variant="heading-strong-m">Convidar membro</Heading>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {canInvite
                ? `Convide membros para sua organização (${activeMembers}/${maxMembers === 999999 ? '∞' : maxMembers})`
                : `Limite de ${maxMembers} membro(s) atingido. Faça upgrade para convidar mais.`}
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
                  horizontal="space-between"
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
                    <Text variant="body-default-s" onBackground="neutral-weak">{member.email}</Text>
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
