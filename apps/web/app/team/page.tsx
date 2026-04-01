'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/contexts/OrgContext'
import { SkeletonBar, SkeletonCard } from '@/components/ui/LoadingSkeleton'
import { Alert } from '@/components/ui/Alert'
import {
  SystemModal,
  SystemModalBody,
  SystemModalCloseButton,
  SystemModalFooter,
  SystemModalHeader,
  systemModalDescStyle,
  systemModalLabelStyle,
  systemModalTitleStyle,
} from '@/components/ui/SystemModal'

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
  MEMBER: 'Editor',
  VIEWER: 'Visualizador',
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  OWNER: { bg: 'var(--brand-alpha-weak)', color: 'var(--brand-on-background-strong)' },
  ADMIN: { bg: 'var(--success-alpha-weak)', color: 'var(--success-on-background-strong)' },
  MEMBER: { bg: 'var(--neutral-alpha-weak)', color: 'var(--neutral-on-background-weak)' },
  VIEWER: { bg: 'var(--warning-alpha-weak)', color: 'var(--warning-on-background-strong)' },
}

function memberInitials(name: string, email: string) {
  const base = (name || email || '?').trim()
  const parts = base.split(/[\s@]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2)
  }
  return base.slice(0, 2).toUpperCase()
}

export default function TeamPage() {
  const { currentOrg } = useOrg()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'danger' | 'warning'; text: string } | null>(null)
  const [removingMember, setRemovingMember] = useState<Member | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [pendingRole, setPendingRole] = useState<string | null>(null)

  const canInvite = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN'
  const canManageRoles = currentUserRole === 'OWNER'

  const closeInviteModal = useCallback(() => {
    if (inviteLoading) return
    setInviteModalOpen(false)
    setInviteEmail('')
    setInviteRole('MEMBER')
  }, [inviteLoading])

  const closeEditModal = useCallback(() => {
    if (updatingRoleId) return
    setEditingMember(null)
    setPendingRole(null)
  }, [updatingRoleId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (removingMember && !removeLoading) setRemovingMember(null)
      else if (inviteModalOpen) closeInviteModal()
      else if (editingMember) closeEditModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [removingMember, removeLoading, inviteModalOpen, editingMember, closeInviteModal, closeEditModal])

  const fetchData = useCallback(async () => {
    if (!currentOrg?.id) return
    try {
      const res = await fetch(`/api/billing/subscription?orgId=${currentOrg.id}`)
      if (!res.ok) return

      const data = await res.json()
      const orgId = data.organization.id

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { data: teamMembers } = await supabase
        .from('TeamMember')
        .select('id, userId, role, status, inviteEmail')
        .eq('organizationId', orgId)
        .neq('status', 'REMOVED')
        .order('role', { ascending: true })

      if (teamMembers) {
        const orgName = data.organization.name || ''

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
        setMessage({ type: 'success', text: 'Convite enviado! O usuário verá na área de notificações.' })
        fetchData()
        setInviteModalOpen(false)
        setInviteEmail('')
        setInviteRole('MEMBER')
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
        if (editingMember?.id === removingMember.id) {
          setEditingMember(null)
          setPendingRole(null)
        }
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

  const handleSaveRole = async (member: Member) => {
    if (!currentOrg || !pendingRole || pendingRole === member.role) return
    setUpdatingRoleId(member.id)
    setMessage(null)

    try {
      const res = await fetch('/api/team/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: member.id, orgId: currentOrg.id, role: pendingRole }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: `Função de ${member.name} atualizada para ${ROLE_LABELS[pendingRole]}.` })
        closeEditModal()
        fetchData()
      } else {
        setMessage({ type: 'danger', text: data.error || 'Erro ao atualizar função.' })
      }
    } catch {
      setMessage({ type: 'danger', text: 'Erro de conexão.' })
    } finally {
      setUpdatingRoleId(null)
    }
  }

  const openEditModal = (member: Member) => {
    setEditingMember(member)
    setPendingRole(member.role)
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="app-page team-page">
          <style>{teamPageStyles}</style>
          <div className="team-page__hero-skel">
            <SkeletonBar width="8rem" height="1.75rem" />
            <SkeletonBar width="22rem" height="0.875rem" />
          </div>
          <SkeletonCard>
            <SkeletonBar width="10rem" height="1.25rem" />
            <SkeletonBar width="16rem" height="0.75rem" />
          </SkeletonCard>
          <div className="team-page__list-toolbar-skel">
            <SkeletonBar width="6rem" height="1.25rem" />
            <SkeletonBar width="2rem" height="1.25rem" />
          </div>
          <div className="team-page__list-table-skel w-full rounded-xl border border-transparent-white overflow-hidden">
            <div className="team-page__skel-head">
              <SkeletonBar width="4rem" height="0.75rem" />
              <SkeletonBar width="4rem" height="0.75rem" />
              <SkeletonBar width="4rem" height="0.75rem" />
              <SkeletonBar width="3rem" height="0.75rem" />
            </div>
            {[1, 2].map((i) => (
              <div key={i} className="team-page__skel-row">
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', minWidth: 0 }}>
                  <SkeletonBar width="2rem" height="2rem" />
                  <div>
                    <SkeletonBar width="8rem" height="0.875rem" />
                    <SkeletonBar width="12rem" height="0.75rem" />
                  </div>
                </div>
                <SkeletonBar width="4rem" height="1.25rem" />
                <SkeletonBar width="3rem" height="0.75rem" />
                <SkeletonBar width="4rem" height="2rem" />
              </div>
            ))}
          </div>
          <div className="team-page__list-cards-skel">
            {[1, 2].map((i) => (
              <SkeletonCard key={i}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <SkeletonBar width="2rem" height="2rem" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <SkeletonBar width="10rem" height="0.875rem" />
                    <SkeletonBar width="14rem" height="0.75rem" />
                  </div>
                </div>
              </SkeletonCard>
            ))}
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="app-page team-page">
        <style>{teamPageStyles}</style>

        <div className="team-page__head">
          <div>
            <h2 className="app-section-title">Equipe</h2>
            <p className="app-section-sub">
              Gerencie os membros da sua organização
              {currentOrg?.name ? (
                <>
                  {' '}
                  (<span style={{ color: 'var(--neutral-on-background-strong)' }}>{currentOrg.name}</span>).
                </>
              ) : (
                '.'
              )}
            </p>
          </div>
          {canInvite && (
            <button type="button" onClick={() => setInviteModalOpen(true)} className="app-btn-primary">
              Convidar membro
            </button>
          )}
        </div>

        {message && <Alert variant={message.type}>{message.text}</Alert>}

        <section className="team-page__members" aria-labelledby="team-members-heading">
          <div className="team-page__list-toolbar">
            <h2 id="team-members-heading" className="app-section-title team-page__list-title">
              Membros
            </h2>
            <span className="team-page__count-pill">{members.length}</span>
          </div>

          {members.length === 0 ? (
            <div className="app-card" style={{ minHeight: '8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="app-section-sub" style={{ margin: 0 }}>
                Nenhum membro encontrado.
              </span>
            </div>
          ) : (
            <>
              {/* Mesmo padrão da lista de projetos no dashboard (grid + borda transparent-white) */}
              <div className="team-page__list-table w-full rounded-xl border border-transparent-white overflow-hidden">
                <div className="team-page__list-table-head">
                  <span className="text-xs font-medium text-gray">Membro</span>
                  <span className="text-xs font-medium text-gray">Função</span>
                  <span className="text-xs font-medium text-gray">Situação</span>
                  <span className="text-xs font-medium text-gray" style={{ textAlign: 'right' as const }}>
                    Ações
                  </span>
                </div>
                {members.map((member, i) => (
                  <div
                    key={member.id}
                    className="team-page__list-table-row"
                    style={{
                      borderBottom: i < members.length - 1 ? '1px solid var(--neutral-border-medium)' : undefined,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--neutral-alpha-weak)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, minHeight: '1.75rem' }}>
                      <div className="team-page__avatar-table" aria-hidden>
                        {memberInitials(member.name, member.email)}
                      </div>
                      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                        <span className="text-sm text-off-white font-medium truncate">{member.name}</span>
                        {member.email ? (
                          <span className="text-xs text-gray truncate">{member.email}</span>
                        ) : null}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.375rem', minHeight: '1.75rem' }}>
                      <span
                        className="app-badge team-page__role-badge"
                        style={{ background: ROLE_COLORS[member.role]?.bg, color: ROLE_COLORS[member.role]?.color }}
                      >
                        {ROLE_LABELS[member.role] || member.role}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', minHeight: '1.75rem' }}>
                      {member.status === 'PENDING' ? (
                        <span
                          className="app-badge"
                          style={{
                            background: 'var(--warning-alpha-weak)',
                            color: 'var(--warning-on-background-strong)',
                          }}
                        >
                          Pendente
                        </span>
                      ) : (
                        <span className="text-xs text-gray">Ativo</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minHeight: '1.75rem' }}>
                      {member.role !== 'OWNER' && canManageRoles ? (
                        <button
                          type="button"
                          onClick={() => openEditModal(member)}
                          className="app-btn-secondary"
                          style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                        >
                          Editar
                        </button>
                      ) : (
                        <span className="text-xs text-gray">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Estreito: mesmo padrão de cartões que notificações (app-card por item) */}
              <div className="team-page__list-cards">
                {members.map((member) => (
                  <div key={member.id} className="app-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <div className="team-page__avatar-table" aria-hidden>
                          {memberInitials(member.name, member.email)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', minWidth: 0 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--neutral-on-background-strong)' }}>
                            {member.name}
                          </span>
                          {member.email ? (
                            <span style={{ fontSize: '0.8125rem', color: 'var(--neutral-on-background-weak)' }}>{member.email}</span>
                          ) : null}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.25rem' }}>
                            <span
                              className="app-badge team-page__role-badge"
                              style={{ background: ROLE_COLORS[member.role]?.bg, color: ROLE_COLORS[member.role]?.color }}
                            >
                              {ROLE_LABELS[member.role] || member.role}
                            </span>
                            {member.status === 'PENDING' ? (
                              <span
                                className="app-badge"
                                style={{
                                  background: 'var(--warning-alpha-weak)',
                                  color: 'var(--warning-on-background-strong)',
                                }}
                              >
                                Pendente
                              </span>
                            ) : (
                              <span className="app-badge" style={{ background: 'var(--neutral-alpha-weak)', color: 'var(--neutral-on-background-weak)' }}>
                                Ativo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {member.role !== 'OWNER' && canManageRoles ? (
                        <button
                          type="button"
                          onClick={() => openEditModal(member)}
                          className="app-btn-secondary"
                          style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem', flexShrink: 0 }}
                        >
                          Editar
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <SystemModal
        open={inviteModalOpen}
        onBackdropClick={closeInviteModal}
        backdropDisabled={inviteLoading}
        aria-labelledby="invite-modal-title"
        panelMaxWidth="min(28rem, 100%)"
      >
        <SystemModalHeader>
          <div style={{ minWidth: 0 }}>
            <h2 id="invite-modal-title" style={systemModalTitleStyle}>
              Convidar membro
            </h2>
            <p style={systemModalDescStyle}>A pessoa precisa já ter uma conta com o e-mail informado.</p>
          </div>
          <SystemModalCloseButton onClick={closeInviteModal} disabled={inviteLoading} />
        </SystemModalHeader>
        <SystemModalBody>
          <div>
            <label htmlFor="invite-email" style={systemModalLabelStyle}>
              E-mail
            </label>
            <input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)}
              placeholder="colega@empresa.com"
              className="app-input"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="invite-role" style={systemModalLabelStyle}>
              Função
            </label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER' | 'VIEWER')}
              className="app-select"
            >
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Editor</option>
              <option value="VIEWER">Visualizador</option>
            </select>
          </div>
        </SystemModalBody>
        <SystemModalFooter>
          <button type="button" onClick={closeInviteModal} disabled={inviteLoading} className="app-btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={handleInvite} disabled={inviteLoading || !inviteEmail.trim()} className="app-btn-primary">
            {inviteLoading ? 'Enviando...' : 'Enviar convite'}
          </button>
        </SystemModalFooter>
      </SystemModal>

      {editingMember && editingMember.role !== 'OWNER' && !removingMember && (
        <SystemModal
          open
          onBackdropClick={closeEditModal}
          backdropDisabled={!!updatingRoleId}
          aria-labelledby="edit-modal-title"
          panelMaxWidth="min(44rem, 100%)"
        >
          <SystemModalHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', minWidth: 0, flex: 1 }}>
                <div className="team-page__avatar--lg" aria-hidden>
                  {memberInitials(editingMember.name, editingMember.email)}
                </div>
              <div style={{ minWidth: 0 }}>
                <h2 id="edit-modal-title" style={systemModalTitleStyle}>
                  Editar membro
                </h2>
                <p style={systemModalDescStyle}>{editingMember.email || editingMember.name}</p>
              </div>
            </div>
            <SystemModalCloseButton onClick={closeEditModal} disabled={!!updatingRoleId} />
          </SystemModalHeader>
          <SystemModalBody>
            <div>
              <label htmlFor="edit-role" style={systemModalLabelStyle}>
                Função
              </label>
              <select
                id="edit-role"
                value={pendingRole || editingMember.role}
                onChange={(e) => setPendingRole(e.target.value)}
                disabled={updatingRoleId === editingMember.id}
                className="app-select"
              >
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Editor</option>
                <option value="VIEWER">Visualizador</option>
              </select>
            </div>
          </SystemModalBody>
          <SystemModalFooter style={{ justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => setRemovingMember(editingMember)}
              disabled={!!updatingRoleId}
              className="app-btn-secondary"
              style={{
                borderColor: 'var(--danger-border-medium)',
                color: 'var(--danger-on-background-strong)',
              }}
            >
              Remover da organização
            </button>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={closeEditModal} disabled={!!updatingRoleId} className="app-btn-secondary">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleSaveRole(editingMember)}
                disabled={updatingRoleId === editingMember.id || !pendingRole || pendingRole === editingMember.role}
                className="app-btn-primary"
              >
                {updatingRoleId === editingMember.id ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </SystemModalFooter>
        </SystemModal>
      )}

      {removingMember && (
        <SystemModal
          open
          onBackdropClick={() => !removeLoading && setRemovingMember(null)}
          backdropDisabled={removeLoading}
          aria-labelledby="remove-modal-title"
          panelMaxWidth="min(28rem, 100%)"
        >
          <SystemModalHeader>
            <div style={{ minWidth: 0 }}>
              <h2 id="remove-modal-title" style={systemModalTitleStyle}>
                Remover membro
              </h2>
              <p style={systemModalDescStyle}>
                Tem certeza que deseja remover{' '}
                <strong style={{ color: 'var(--neutral-on-background-strong)' }}>{removingMember.name}</strong>
                {removingMember.email ? ` (${removingMember.email})` : ''} da organização? Esta ação não pode ser desfeita.
              </p>
            </div>
            <SystemModalCloseButton
              onClick={() => !removeLoading && setRemovingMember(null)}
              disabled={removeLoading}
            />
          </SystemModalHeader>
          <SystemModalFooter>
            <button type="button" onClick={() => setRemovingMember(null)} disabled={removeLoading} className="app-btn-secondary">
              Cancelar
            </button>
            <button type="button" onClick={handleRemove} disabled={removeLoading} className="app-btn-danger">
              {removeLoading ? 'Removendo...' : 'Remover'}
            </button>
          </SystemModalFooter>
        </SystemModal>
      )}
    </AppLayout>
  )
}

const teamPageStyles = `
.team-page {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.team-page__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
}
.team-page__members {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  min-width: 0;
}
.team-page__list-toolbar,
.team-page__list-toolbar-skel {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.team-page__list-title { font-size: 1rem; margin: 0; }
.team-page__count-pill {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: var(--neutral-alpha-medium);
  color: var(--neutral-on-background-weak);
}
/* Tabela = mesmo padrão do dashboard (lista de projetos) */
.team-page__list-table-head,
.team-page__list-table-row,
.team-page__skel-head,
.team-page__skel-row {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(8rem, 10rem) 6rem 5.5rem;
  padding: 0.625rem 1rem;
  gap: 0.5rem;
  align-items: center;
}
.team-page__list-table-head,
.team-page__skel-head {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}
.team-page__list-table-row {
  transition: background 0.15s;
}
.team-page__skel-row {
  border-bottom: 1px solid var(--neutral-border-medium);
}
.team-page__skel-row:last-child { border-bottom: none; }
.team-page__avatar-table {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: var(--brand-solid-strong);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.team-page__avatar--lg {
  width: 3rem;
  height: 3rem;
  font-size: 0.9375rem;
  border-radius: 0.75rem;
  background: var(--brand-solid-strong);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.team-page__role-badge { font-size: 0.6875rem; }
.team-page__list-table { display: none; }
.team-page__list-cards { display: flex; flex-direction: column; gap: 0.75rem; }
.team-page__list-table-skel { display: none; }
.team-page__list-cards-skel { display: flex; flex-direction: column; gap: 0.75rem; }
@media (min-width: 52rem) {
  .team-page__list-table,
  .team-page__list-table-skel { display: block; }
  .team-page__list-cards,
  .team-page__list-cards-skel { display: none; }
}
.team-page__hero-skel { display: flex; flex-direction: column; gap: 0.5rem; }
`
