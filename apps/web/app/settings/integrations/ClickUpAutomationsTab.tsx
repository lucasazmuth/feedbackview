'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Column, Row, Text, Button, Card, Heading, Feedback as FeedbackAlert } from '@once-ui-system/core'

interface Team {
  id: string
  name: string
}
interface Space {
  id: string
  name: string
}
interface ListItem {
  id: string
  name: string
}

export type AutomationDTO = {
  id: string
  name: string | null
  enabled: boolean
  clickupTeamId: string
  clickupSpaceId: string
  clickupListId: string
  listPath: string | null
  projects: { id: string; name: string }[]
}

export type OrgProjectScoped = { id: string; name: string; organizationId: string | null }

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid var(--neutral-border-medium)',
  background: 'var(--surface-background)',
  color: 'var(--neutral-on-background-strong)',
  fontSize: '0.875rem',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'auto' as any,
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 600,
  color: 'var(--neutral-on-background-weak)',
  display: 'block',
  marginBottom: '0.375rem',
  letterSpacing: '0.02em',
}

/** Input do filtro ao lado do ícone (linha compacta acima da lista). */
const projectFilterInputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: '0.35rem 0.5rem',
  borderRadius: '0.5rem',
  border: '1px solid var(--neutral-border-medium)',
  background: 'var(--surface-background)',
  color: 'var(--neutral-on-background-strong)',
  fontSize: '0.8125rem',
  outline: 'none',
}

const projectFilterIconBtnStyle: React.CSSProperties = {
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '2.25rem',
  height: '2.25rem',
  padding: 0,
  borderRadius: '0.5rem',
  border: '1px solid var(--neutral-border-medium)',
  background: 'var(--surface-background)',
  color: 'var(--neutral-on-background-weak)',
  cursor: 'pointer',
}

function FilterListIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ opacity: active ? 1 : 0.85 }}
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

const wizardStackGap = '0.875rem'
const wizardFooterBar: React.CSSProperties = {
  flexShrink: 0,
  paddingTop: '0.5rem',
  borderTop: '1px solid var(--neutral-border-medium)',
}

/** Campos + barra de ações: gap menor que o restante do assistente (evita “buraco” antes dos botões). */
const wizardFieldsAndActionsGap = '0.5rem'

async function browse(
  orgId: string,
  payload: Record<string, unknown>,
  token?: string,
): Promise<any> {
  const body = token ? { ...payload, token } : { ...payload, useOrgToken: true }
  const res = await fetch(`/api/integrations/clickup/browse?orgId=${encodeURIComponent(orgId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

type ModalMode = { type: 'create'; preselectProjectId?: string } | { type: 'edit'; automation: AutomationDTO }

export default function ClickUpAutomationsTab({
  orgId,
  defaultTeamId,
  orgScopedProjects,
  onChange,
  onWizardOpenChange,
  fillWizardHeight,
  openCreateWithProjectId,
  onOpenCreatePrefillConsumed,
  onCloseEntireModal,
}: {
  orgId: string
  defaultTeamId: string
  orgScopedProjects: OrgProjectScoped[]
  onChange?: () => void
  /** Notifica o painel pai (ex.: modal ClickUp compacto) para ocupar altura inteira e esconder chrome. */
  onWizardOpenChange?: (open: boolean) => void
  fillWizardHeight?: boolean
  /** Deep link: abre o assistente “nova automação” com este projeto Buug já selecionado. */
  openCreateWithProjectId?: string | null
  onOpenCreatePrefillConsumed?: () => void
  /** Fecha o modal da integração (além de sair do assistente). */
  onCloseEntireModal?: () => void
}) {
  const [automations, setAutomations] = useState<AutomationDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalMode | null>(null)
  const openCreatePrefillDoneRef = useRef(false)
  const [automationPendingDelete, setAutomationPendingDelete] = useState<AutomationDTO | null>(null)
  const [deleteAutomationLoading, setDeleteAutomationLoading] = useState(false)

  useEffect(() => {
    if (openCreateWithProjectId) openCreatePrefillDoneRef.current = false
  }, [openCreateWithProjectId])
  /** `null` = ainda a carregar; prefetch para o assistente abrir com opções mais depressa. */
  const [teamsPrefetch, setTeamsPrefetch] = useState<Team[] | null>(null)

  useEffect(() => {
    onWizardOpenChange?.(!!modal)
  }, [modal, onWizardOpenChange])

  useEffect(() => () => onWizardOpenChange?.(false), [onWizardOpenChange])

  useEffect(() => {
    let cancelled = false
    setTeamsPrefetch(null)
    void (async () => {
      const data = await browse(orgId, { action: 'teams' })
      if (!cancelled) setTeamsPrefetch(Array.isArray(data.teams) ? data.teams : [])
    })()
    return () => {
      cancelled = true
    }
  }, [orgId])

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/integrations/clickup/automations?orgId=${encodeURIComponent(orgId)}`)
    if (res.ok) {
      const data = await res.json()
      setAutomations(data.automations || [])
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!openCreateWithProjectId || loading || openCreatePrefillDoneRef.current) return
    const ok = orgScopedProjects.some(p => p.id === openCreateWithProjectId)
    openCreatePrefillDoneRef.current = true
    if (ok) setModal({ type: 'create', preselectProjectId: openCreateWithProjectId })
    onOpenCreatePrefillConsumed?.()
  }, [loading, openCreateWithProjectId, orgScopedProjects, onOpenCreatePrefillConsumed])

  if (loading) {
    return (
      <Text variant="body-default-s" onBackground="neutral-weak">Carregando automações…</Text>
    )
  }

  const wizardFill = !!(fillWizardHeight && modal)

  return (
    <Column
      gap="m"
      fillWidth
      style={
        wizardFill
          ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%' }
          : undefined
      }
    >
      {!modal ? (
        <>
          <Column gap="m" fillWidth>
            <Text
              variant="body-default-s"
              onBackground="neutral-weak"
              style={{ width: '100%', lineHeight: 1.6, wordBreak: 'break-word' }}
            >
              Cada automação envia reports de um projeto Buug para uma lista no ClickUp. O mesmo projeto não pode estar em duas automações ao mesmo tempo.
            </Text>
            <Row fillWidth horizontal="start" style={{ flexShrink: 0 }}>
              <Button size="m" variant="primary" label="Adicionar automação" onClick={() => setModal({ type: 'create' })} />
            </Row>
          </Column>

          {automations.length === 0 ? (
            <Card fillWidth padding="m" radius="l" style={{ background: 'var(--neutral-alpha-weak)' }}>
              <Text variant="body-default-s" onBackground="neutral-weak">
                Nenhuma automação ainda. Adicione uma para escolher workspace, espaço, lista e projeto Buug.
              </Text>
            </Card>
          ) : (
            <Column gap="s" fillWidth>
              {automations.map(a => (
                <Card key={a.id} fillWidth padding="m" radius="l">
                  <Row fillWidth horizontal="between" vertical="start" gap="m" wrap>
                    <Column gap="xs" style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="body-default-s" style={{ fontWeight: 600 }}>
                        {a.name || 'Automação sem nome'}
                      </Text>
                      <Text variant="body-default-xs" onBackground="neutral-weak">
                        {a.listPath || a.clickupListId}
                        {' · '}
                        {a.projects.length === 0
                          ? 'Sem projeto'
                          : a.projects.length === 1
                            ? `Projeto: ${a.projects[0].name}`
                            : `${a.projects.length} projetos (legado): ${a.projects.map(p => p.name).join(', ')}`}
                      </Text>
                      {!a.enabled && (
                        <Text variant="body-default-xs" onBackground="danger-strong">Desativada</Text>
                      )}
                    </Column>
                    <Row gap="s" wrap>
                      <Button size="s" variant="secondary" label="Editar" onClick={() => setModal({ type: 'edit', automation: a })} />
                      <Button
                        size="s"
                        variant="danger"
                        label="Excluir"
                        onClick={() => setAutomationPendingDelete(a)}
                      />
                    </Row>
                  </Row>
                </Card>
              ))}
            </Column>
          )}

          <Card fillWidth padding="m" radius="l" style={{ background: 'var(--neutral-alpha-weak)' }}>
            <Text variant="label-default-s">Como funciona</Text>
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--neutral-on-background-weak)' }}>
              <li>Novo report em um projeto Buug vinculado vira tarefa na lista ClickUp da automação.</li>
              <li>Prioridade e prazo seguem para o ClickUp quando existirem.</li>
              <li>Status sincroniza com webhook configurado no ClickUp.</li>
            </ul>
          </Card>
        </>
      ) : (
        <AutomationWizardInline
          key={
            modal.type === 'edit'
              ? `edit-${modal.automation.id}`
              : `create-${modal.preselectProjectId ?? 'none'}`
          }
          orgId={orgId}
          mode={modal}
          defaultTeamId={defaultTeamId}
          orgScopedProjects={orgScopedProjects}
          teamsPrefetch={teamsPrefetch}
          fillHeight={wizardFill}
          onCloseEntireModal={onCloseEntireModal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            void refresh()
            onChange?.()
          }}
        />
      )}

      {automationPendingDelete && (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 320,
            padding: '1rem',
          }}
          onClick={() => !deleteAutomationLoading && setAutomationPendingDelete(null)}
        >
          <Column
            role="dialog"
            aria-modal="true"
            aria-labelledby="clickup-delete-automation-title"
            padding="l"
            gap="m"
            radius="l"
            background="surface"
            border="neutral-medium"
            style={{ maxWidth: '28rem', width: '100%', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <Column gap="s">
              <Heading variant="heading-strong-m" as="h3" id="clickup-delete-automation-title" style={{ margin: 0 }}>
                Excluir automação
              </Heading>
              <Text variant="body-default-s" onBackground="neutral-weak">
                Tem certeza que deseja excluir <strong>{automationPendingDelete.name || 'esta automação'}</strong>? Os projetos Buug vinculados poderão ser associados a outra regra depois. Esta ação não pode ser desfeita.
              </Text>
            </Column>
            <Row gap="s" horizontal="end" wrap>
              <Button
                variant="secondary"
                size="m"
                label="Cancelar"
                disabled={deleteAutomationLoading}
                onClick={() => setAutomationPendingDelete(null)}
              />
              <Button
                variant="danger"
                size="m"
                label={deleteAutomationLoading ? 'Excluindo…' : 'Excluir'}
                loading={deleteAutomationLoading}
                disabled={deleteAutomationLoading}
                onClick={async () => {
                  const id = automationPendingDelete.id
                  setDeleteAutomationLoading(true)
                  try {
                    const res = await fetch(
                      `/api/integrations/clickup/automations/${id}?orgId=${encodeURIComponent(orgId)}`,
                      { method: 'DELETE' },
                    )
                    if (res.ok) {
                      setAutomationPendingDelete(null)
                      void refresh()
                      onChange?.()
                    }
                  } finally {
                    setDeleteAutomationLoading(false)
                  }
                }}
              />
            </Row>
          </Column>
        </div>
      )}
    </Column>
  )
}

const WIZARD_STEPS = [
  { id: 0, label: 'Lista no ClickUp' },
  { id: 1, label: 'Projeto Buug' },
] as const

function ClickUpWizardCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Fechar janela"
      title="Fechar"
      style={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '2.25rem',
        height: '2.25rem',
        padding: 0,
        border: 'none',
        borderRadius: 'var(--radius-m, 8px)',
        background: 'transparent',
        color: 'var(--neutral-on-background-weak)',
        cursor: 'pointer',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  )
}

function AutomationWizardInline({
  orgId,
  mode,
  defaultTeamId,
  orgScopedProjects,
  teamsPrefetch,
  onCloseEntireModal,
  onClose,
  onSaved,
  fillHeight,
}: {
  orgId: string
  mode: ModalMode
  defaultTeamId: string
  orgScopedProjects: OrgProjectScoped[]
  /** Workspaces já pedidos na aba; `null` se o prefetch ainda não terminou. */
  teamsPrefetch: Team[] | null
  onCloseEntireModal?: () => void
  onClose: () => void
  onSaved: () => void
  fillHeight?: boolean
}) {
  const editing = mode.type === 'edit' ? mode.automation : null

  const [step, setStep] = useState(0)
  const [teams, setTeams] = useState<Team[]>([])
  const [teamId, setTeamId] = useState(editing?.clickupTeamId || defaultTeamId || '')
  const [spaces, setSpaces] = useState<Space[]>([])
  const [spaceId, setSpaceId] = useState(editing?.clickupSpaceId || '')
  const [lists, setLists] = useState<ListItem[]>([])
  const [listId, setListId] = useState(editing?.clickupListId || '')
  const [name, setName] = useState(editing?.name || '')
  const [projectId, setProjectId] = useState(() =>
    mode.type === 'edit' ? mode.automation.projects[0]?.id ?? '' : mode.preselectProjectId ?? '',
  )
  const [projectSearch, setProjectSearch] = useState('')
  const [projectFilterOpen, setProjectFilterOpen] = useState(false)
  const projectFilterInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [teamsLoading, setTeamsLoading] = useState(() => teamsPrefetch === null)
  const [spacesLoading, setSpacesLoading] = useState(false)
  const [listsLoading, setListsLoading] = useState(false)

  const radioGroupName = useMemo(
    () => `buug-project-${editing?.id || 'new'}-${orgId.slice(0, 8)}`,
    [editing?.id, orgId],
  )

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase()
    if (!q) return orgScopedProjects
    return orgScopedProjects.filter(p => p.name.toLowerCase().includes(q))
  }, [orgScopedProjects, projectSearch])

  useEffect(() => {
    setStep(0)
    setErr(null)
  }, [mode])

  useEffect(() => {
    if (!projectFilterOpen) return
    const id = requestAnimationFrame(() => projectFilterInputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [projectFilterOpen])

  useEffect(() => {
    let cancelled = false
    if (teamsPrefetch !== null) {
      setTeams(teamsPrefetch)
      setTeamsLoading(false)
      return () => {
        cancelled = true
      }
    }
    setTeamsLoading(true)
    void (async () => {
      try {
        const data = await browse(orgId, { action: 'teams' })
        if (!cancelled) setTeams(Array.isArray(data.teams) ? data.teams : [])
      } finally {
        if (!cancelled) setTeamsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orgId, teamsPrefetch])

  useEffect(() => {
    let cancelled = false
    if (!teamId) {
      setSpaces([])
      setSpacesLoading(false)
      return () => {
        cancelled = true
      }
    }
    setSpacesLoading(true)
    void (async () => {
      try {
        const data = await browse(orgId, { action: 'spaces', teamId })
        if (!cancelled) setSpaces(Array.isArray(data.spaces) ? data.spaces : [])
      } finally {
        if (!cancelled) setSpacesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orgId, teamId])

  useEffect(() => {
    let cancelled = false
    if (!spaceId) {
      setLists([])
      setListsLoading(false)
      return () => {
        cancelled = true
      }
    }
    setListsLoading(true)
    void (async () => {
      try {
        const data = await browse(orgId, { action: 'lists', spaceId })
        if (!cancelled) setLists(Array.isArray(data.lists) ? data.lists : [])
      } finally {
        if (!cancelled) setListsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orgId, spaceId])

  const validateStep0 = () => {
    if (!teamId || !spaceId || !listId) {
      setErr('Preencha workspace, espaço e lista ClickUp.')
      return false
    }
    setErr(null)
    return true
  }

  const validateStep1 = () => {
    if (!projectId) {
      setErr('Selecione um projeto Buug.')
      return false
    }
    setErr(null)
    return true
  }

  const goNext = () => {
    if (step === 0 && validateStep0()) setStep(1)
  }

  const goBack = () => {
    setErr(null)
    if (step === 0) onClose()
    else setStep(0)
  }

  const handleSave = async () => {
    setErr(null)
    if (!validateStep0() || !validateStep1()) return
    const ids = projectId ? [projectId] : []
    const list = lists.find(l => l.id === listId)
    const space = spaces.find(s => s.id === spaceId)
    const listPath = list && space ? `${space.name} / ${list.name}` : null

    setSaving(true)
    try {
      if (editing) {
        const res = await fetch(
          `/api/integrations/clickup/automations/${editing.id}?orgId=${encodeURIComponent(orgId)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name.trim() || null,
              enabled: true,
              clickupTeamId: teamId,
              clickupSpaceId: spaceId,
              clickupListId: listId,
              listPath,
              projectIds: ids,
            }),
          },
        )
        const data = await res.json()
        if (!res.ok) {
          setErr(data.error || 'Erro ao salvar')
          setSaving(false)
          return
        }
      } else {
        const res = await fetch(`/api/integrations/clickup/automations?orgId=${encodeURIComponent(orgId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim() || null,
            clickupTeamId: teamId,
            clickupSpaceId: spaceId,
            clickupListId: listId,
            listPath,
            projectIds: ids,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setErr(data.error || 'Erro ao criar')
          setSaving(false)
          return
        }
      }
      onSaved()
    } catch {
      setErr('Erro de rede')
    }
    setSaving(false)
  }

  const panelStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: '100%',
    minHeight: fillHeight ? 0 : undefined,
    flex: fillHeight ? 1 : undefined,
    display: fillHeight ? 'flex' : undefined,
    flexDirection: fillHeight ? 'column' : undefined,
    overflow: 'hidden',
    background: 'transparent',
  }

  const scrollBodyStyle: React.CSSProperties = fillHeight
    ? { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as const }
    : {}

  const listScrollStyle: React.CSSProperties = fillHeight
    ? {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem',
        flex: 1,
        minHeight: '10rem',
        overflowY: 'auto',
        border: '1px solid var(--neutral-border-medium)',
        borderRadius: '0.75rem',
        padding: '0.35rem',
        background: 'var(--surface-background)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem',
        maxHeight: 'min(40vh, 14rem)',
        overflowY: 'auto',
        border: '1px solid var(--neutral-border-medium)',
        borderRadius: '0.75rem',
        padding: '0.35rem',
        background: 'var(--surface-background)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
      }

  const footer = (
    <Row
      gap="s"
      wrap
      horizontal="between"
      vertical="center"
      style={wizardFooterBar}
    >
      <Button size="m" variant="secondary" label="Cancelar" onClick={onClose} />
      {step === 0 ? (
        <Button size="m" variant="primary" label="Continuar" onClick={goNext} />
      ) : (
        <Row gap="s" wrap>
          <Button size="m" variant="secondary" label="Voltar" onClick={() => { setErr(null); setStep(0) }} />
          <Button size="m" variant="primary" label={saving ? 'Salvando…' : 'Salvar automação'} onClick={() => void handleSave()} loading={saving} />
        </Row>
      )}
    </Row>
  )

  return (
    <div
      role="region"
      aria-label={editing ? 'Editar automação' : 'Nova automação'}
      style={panelStyle}
    >
      <div style={scrollBodyStyle}>
        <Column
          fillWidth
          style={{
            position: 'relative',
            padding: 0,
            gap: wizardStackGap,
          }}
        >
          <header style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', width: '100%' }}>
            <Button size="s" variant="tertiary" label={step === 0 ? '← Voltar às automações' : '← Voltar'} onClick={goBack} />
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '0.5rem',
                width: '100%',
              }}
            >
              <Text
                variant="body-default-s"
                as="h2"
                style={{
                  margin: 0,
                  flex: 1,
                  minWidth: 0,
                  fontWeight: 600,
                  color: 'var(--neutral-on-background-strong)',
                  lineHeight: 1.35,
                  letterSpacing: '-0.01em',
                }}
                aria-label={`Passo ${step + 1} de ${WIZARD_STEPS.length}: ${WIZARD_STEPS[step].label}`}
              >
                <span
                  style={{
                    color: 'var(--neutral-on-background-weak)',
                    fontWeight: 500,
                    fontSize: '0.8125rem',
                    marginRight: '0.5rem',
                  }}
                >
                  {step + 1}/{WIZARD_STEPS.length}
                </span>
                {WIZARD_STEPS[step].label}
                {editing ? (
                  <span style={{ color: 'var(--neutral-on-background-weak)', fontWeight: 500, fontSize: '0.8125rem' }}>
                    {' '}
                    · edição
                  </span>
                ) : null}
              </Text>
              {onCloseEntireModal ? <ClickUpWizardCloseButton onClick={onCloseEntireModal} /> : null}
            </div>
          </header>

          {step === 0 ? (
            <Text variant="body-default-xs" onBackground="neutral-weak" style={{ margin: 0, lineHeight: 1.5 }}>
              Escolha o <strong>workspace</strong>, depois o <strong>espaço</strong> e por fim a <strong>lista</strong> do ClickUp — os reports viram tarefas nessa lista.
            </Text>
          ) : (
            <Text variant="body-default-xs" onBackground="neutral-weak" style={{ margin: 0, lineHeight: 1.5 }}>
              Um <strong>projeto Buug</strong> por automação — os reports dele viram tarefas na lista do passo 1. O nome acima é opcional, só para identificar esta regra.
            </Text>
          )}

          {err && <FeedbackAlert variant="danger">{err}</FeedbackAlert>}

          {editing && editing.projects.length > 1 && step === 1 && (
            <FeedbackAlert variant="warning">
              Esta automação tem {editing.projects.length} projetos vinculados. Ao salvar, apenas o projeto selecionado abaixo permanece; os outros serão desvinculados.
            </FeedbackAlert>
          )}

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: wizardFieldsAndActionsGap,
              width: '100%',
              minWidth: 0,
              ...(fillHeight && step === 1 ? { flex: 1, minHeight: 0 } : {}),
            }}
          >
            {step === 0 ? (
              <Column fillWidth style={{ gap: wizardStackGap }}>
                <div>
                  <label htmlFor="cu-team" style={fieldLabelStyle}>Workspace (time ClickUp)</label>
                  <select
                    id="cu-team"
                    value={teamId}
                    onChange={e => { setTeamId(e.target.value); setSpaceId(''); setListId(''); }}
                    style={selectStyle}
                    aria-busy={teamsLoading}
                    aria-label="Workspace ClickUp"
                  >
                    <option value="">
                      {teamsLoading
                        ? 'Carregando workspaces…'
                        : teams.length === 0
                          ? 'Nenhum workspace encontrado'
                          : 'Escolha o workspace…'}
                    </option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="cu-space" style={fieldLabelStyle}>Espaço</label>
                  <select
                    id="cu-space"
                    value={spaceId}
                    onChange={e => { setSpaceId(e.target.value); setListId(''); }}
                    style={selectStyle}
                    disabled={!teamId}
                    aria-busy={!!teamId && spacesLoading}
                    aria-label="Espaço ClickUp"
                  >
                    <option value="">
                      {!teamId
                        ? 'Primeiro selecione o workspace'
                        : spacesLoading
                          ? 'Carregando espaços…'
                          : spaces.length === 0
                            ? 'Nenhum espaço neste workspace'
                            : 'Escolha o espaço…'}
                    </option>
                    {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="cu-list" style={fieldLabelStyle}>Lista</label>
                  <select
                    id="cu-list"
                    value={listId}
                    onChange={e => setListId(e.target.value)}
                    style={selectStyle}
                    disabled={!spaceId}
                    aria-busy={!!spaceId && listsLoading}
                    aria-label="Lista ClickUp"
                  >
                    <option value="">
                      {!spaceId
                        ? 'Primeiro selecione o espaço'
                        : listsLoading
                          ? 'Carregando listas…'
                          : lists.length === 0 && !(listId && !lists.some(l => l.id === listId))
                            ? 'Nenhuma lista neste espaço'
                            : 'Escolha a lista…'}
                    </option>
                    {listId && !lists.some(l => l.id === listId) && (
                      <option value={listId}>Lista atual</option>
                    )}
                    {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </Column>
            ) : (
              <Column
                fillWidth
                style={{
                  gap: wizardStackGap,
                  flex: fillHeight ? 1 : undefined,
                  minHeight: fillHeight ? 0 : undefined,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  <label htmlFor="auto-name" style={fieldLabelStyle}>Nome interno (opcional)</label>
                  <input
                    id="auto-name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="ex.: Suporte — lista X"
                    style={{ ...selectStyle, cursor: 'text' }}
                  />
                </div>
                <Column
                  fillWidth
                  style={{
                    gap: '0.5rem',
                    ...(fillHeight
                      ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }
                      : {}),
                  }}
                >
                  {orgScopedProjects.length === 0 ? (
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      Nenhum projeto nesta organização. Crie projetos com a organização definida.
                    </Text>
                  ) : (
                    <>
                      <div style={{ flexShrink: 0, width: '100%', minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            width: '100%',
                            minWidth: 0,
                          }}
                        >
                          <span
                            id="cu-project-section-title"
                            style={{ ...fieldLabelStyle, marginBottom: 0, flexShrink: 0 }}
                          >
                            Projeto Buug
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              flex: projectFilterOpen ? 1 : undefined,
                              minWidth: 0,
                              justifyContent: 'flex-end',
                            }}
                          >
                            {projectFilterOpen ? (
                              <input
                                ref={projectFilterInputRef}
                                id="cu-project-search"
                                type="search"
                                inputMode="search"
                                autoComplete="off"
                                value={projectSearch}
                                onChange={e => setProjectSearch(e.target.value)}
                                placeholder="Filtrar…"
                                aria-label="Filtrar projetos por nome"
                                style={projectFilterInputStyle}
                              />
                            ) : null}
                            <button
                              type="button"
                              style={{
                                ...projectFilterIconBtnStyle,
                                borderColor:
                                  projectFilterOpen || projectSearch
                                    ? 'var(--neutral-border-strong)'
                                    : 'var(--neutral-border-medium)',
                                background:
                                  projectFilterOpen || projectSearch
                                    ? 'var(--neutral-alpha-weak)'
                                    : 'var(--surface-background)',
                                color: 'var(--neutral-on-background-strong)',
                              }}
                              aria-expanded={projectFilterOpen}
                              aria-pressed={projectFilterOpen || !!projectSearch}
                              {...(projectFilterOpen ? { 'aria-controls': 'cu-project-search' as const } : {})}
                              title={projectFilterOpen ? 'Fechar filtro' : 'Filtrar lista'}
                              onClick={() => {
                                setProjectFilterOpen(prev => {
                                  if (prev) setProjectSearch('')
                                  return !prev
                                })
                              }}
                            >
                              <FilterListIcon active={projectFilterOpen || !!projectSearch} />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div
                        role="radiogroup"
                        aria-labelledby="cu-project-section-title"
                        style={listScrollStyle}
                      >
                        {filteredProjects.length === 0 ? (
                          <Text variant="body-default-xs" onBackground="neutral-weak" style={{ padding: '0.75rem' }}>
                            Nenhum projeto corresponde à busca.
                          </Text>
                        ) : (
                          filteredProjects.map(p => {
                            const selected = projectId === p.id
                            return (
                              <label
                                key={p.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.625rem',
                                  padding: '0.625rem 0.7rem',
                                  borderRadius: '0.5rem',
                                  cursor: 'pointer',
                                  border: `1px solid ${selected ? 'var(--neutral-border-strong)' : 'transparent'}`,
                                  background: selected ? 'var(--neutral-alpha-weak)' : 'transparent',
                                  transition: 'background 0.12s ease, border-color 0.12s ease',
                                }}
                              >
                                <input
                                  type="radio"
                                  name={radioGroupName}
                                  value={p.id}
                                  checked={selected}
                                  onChange={() => setProjectId(p.id)}
                                  style={{
                                    flexShrink: 0,
                                    width: '1.05rem',
                                    height: '1.05rem',
                                    cursor: 'pointer',
                                    accentColor: 'var(--neutral-on-background-strong)',
                                  }}
                                />
                                <span
                                  style={{
                                    flex: 1,
                                    minWidth: 0,
                                    fontSize: '0.875rem',
                                    lineHeight: 1.35,
                                    color: 'var(--neutral-on-background-strong)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical' as const,
                                  }}
                                  title={p.name}
                                >
                                  {p.name}
                                </span>
                              </label>
                            )
                          })
                        )}
                      </div>
                    </>
                  )}
                </Column>
              </Column>
            )}

            {!fillHeight ? (
              <Row gap="s" wrap horizontal="between" vertical="center" style={wizardFooterBar}>
                <Button size="m" variant="secondary" label="Cancelar" onClick={onClose} />
                {step === 0 ? (
                  <Button size="m" variant="primary" label="Continuar" onClick={goNext} />
                ) : (
                  <Row gap="s" wrap>
                    <Button size="m" variant="secondary" label="Voltar" onClick={() => { setErr(null); setStep(0) }} />
                    <Button size="m" variant="primary" label={saving ? 'Salvando…' : 'Salvar automação'} onClick={() => void handleSave()} loading={saving} />
                  </Row>
                )}
              </Row>
            ) : null}
          </div>
        </Column>
      </div>
      {fillHeight ? footer : null}
    </div>
  )
}
