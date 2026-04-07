'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { AppIcon } from '@/components/ui/AppIcon'
import { ICON_STROKE } from '@/lib/icon-tokens'

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
  fontSize: '1.4rem',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'auto' as any,
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: '1.2rem',
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
  fontSize: '1.4rem',
  outline: 'none',
}

const projectFilterIconBtnStyle: React.CSSProperties = {
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '1.875rem',
  height: '1.875rem',
  padding: 0,
  borderRadius: '0.375rem',
  border: '1px solid var(--neutral-border-medium)',
  background: 'var(--surface-background)',
  color: 'var(--neutral-on-background-weak)',
  cursor: 'pointer',
}

function FilterListIcon({ active }: { active: boolean }) {
  return (
    <AppIcon
      size="sm"
      strokeWidth={ICON_STROKE.emphasis}
      aria-hidden
      style={{ opacity: active ? 1 : 0.88, display: 'block' }}
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </AppIcon>
  )
}

const wizardStackGap = '0.875rem'

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
      <div
        style={{
          padding: '1.5rem 1.25rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.875rem',
          minHeight: '10rem',
        }}
      >
        <Spinner size="md" />
        <span style={{ fontSize: '1.4rem', color: 'var(--neutral-on-background-weak)', textAlign: 'center' }}>
          Carregando automações…
        </span>
      </div>
    )
  }

  const wizardFill = !!(fillWizardHeight && modal)

  return (
    <div
      style={
        wizardFill
          ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%' }
          : undefined
      }
    >
      {!modal ? (
        <>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              padding: '0 1.25rem 1.25rem',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <span
                style={{ lineHeight: 1.6, wordBreak: 'break-word', fontSize: '1.4rem', color: 'var(--neutral-on-background-weak)' }}
              >
                Cada automação envia reports de um projeto Buug para uma lista no ClickUp. O mesmo projeto não pode estar em duas automações ao mesmo tempo.
              </span>
              <div>
                <button type="button" onClick={() => setModal({ type: 'create' })} className="app-btn-primary">
                  Adicionar automação
                </button>
              </div>
            </div>

            {automations.length === 0 ? (
              <div
                style={{
                  background: 'var(--neutral-alpha-weak)',
                  padding: '1rem 1.125rem',
                  borderRadius: 'var(--radius-m, 8px)',
                  border: '1px solid var(--neutral-border-medium)',
                }}
              >
                <span style={{ fontSize: '1.4rem', lineHeight: 1.55, color: 'var(--neutral-on-background-weak)' }}>
                  Nenhuma automação ainda. Adicione uma para escolher workspace, espaço, lista e projeto Buug.
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {automations.map(a => (
                <div key={a.id} style={{ border: '1px solid var(--neutral-border-medium)', borderRadius: '0.75rem', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '1.4rem', color: 'var(--neutral-on-background-strong)' }}>
                        {a.name || 'Automação sem nome'}
                      </span>
                      <span style={{ fontSize: '1.4rem', color: 'var(--neutral-on-background-weak)' }}>
                        {a.listPath || a.clickupListId}
                        {' · '}
                        {a.projects.length === 0
                          ? 'Sem projeto'
                          : a.projects.length === 1
                            ? `Projeto: ${a.projects[0].name}`
                            : `${a.projects.length} projetos (legado): ${a.projects.map(p => p.name).join(', ')}`}
                      </span>
                      {!a.enabled && (
                        <span style={{ fontSize: '1.2rem', color: 'var(--warning-on-background-strong)' }}>Desativada</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button onClick={() => setModal({ type: 'edit', automation: a })} className="app-btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '1.4rem' }}>Editar</button>
                      <button onClick={() => setAutomationPendingDelete(a)} className="app-btn-danger" style={{ padding: '0.375rem 0.75rem', fontSize: '1.4rem' }}>Excluir</button>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            )}

            <div
              style={{
                background: 'var(--neutral-alpha-weak)',
                padding: '1rem 1.125rem',
                borderRadius: 'var(--radius-m, 8px)',
                border: '1px solid var(--neutral-border-medium)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: '1.4rem', color: 'var(--neutral-on-background-strong)' }}>Como funciona</span>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '1.4rem', lineHeight: 1.65, color: 'var(--neutral-on-background-weak)' }}>
                <li>Novo report em um projeto Buug vinculado vira tarefa na lista ClickUp da automação.</li>
                <li>Prioridade e prazo seguem para o ClickUp quando existirem.</li>
                <li>Status sincroniza com webhook configurado no ClickUp.</li>
              </ul>
            </div>
          </div>
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
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clickup-delete-automation-title"
            style={{
              maxWidth: '28rem',
              width: '100%',
              background: 'var(--surface-background)',
              border: '1px solid var(--neutral-border-medium)',
              borderRadius: 'var(--radius-l, 12px)',
              boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h3 id="clickup-delete-automation-title" style={{ margin: 0, fontSize: '1.6rem', fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>
                Excluir automação
              </h3>
              <span style={{ fontSize: '1.4rem', color: 'var(--neutral-on-background-weak)', lineHeight: 1.55 }}>
                Tem certeza que deseja excluir <strong style={{ color: 'var(--neutral-on-background-strong)' }}>{automationPendingDelete.name || 'esta automação'}</strong>? Os projetos Buug vinculados poderão ser associados a outra regra depois. Esta ação não pode ser desfeita.
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setAutomationPendingDelete(null)} disabled={deleteAutomationLoading} className="app-btn-secondary">Cancelar</button>
              <button
                type="button"
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
                className="app-btn-danger"
              >
                {deleteAutomationLoading ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const WIZARD_STEPS = [
  { id: 0, label: 'Lista no ClickUp' },
  { id: 1, label: 'Projeto Buug' },
] as const

function AutomationWizardInline({
  orgId,
  mode,
  defaultTeamId,
  orgScopedProjects,
  teamsPrefetch,
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
    <div
      style={{
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
        padding: '1rem 1.25rem',
        borderTop: '1px solid var(--neutral-border-medium)',
        background: 'var(--surface-background)',
      }}
    >
      <button type="button" onClick={onClose} className="app-btn-secondary">Cancelar</button>
      {step === 0 ? (
        <button
          type="button"
          onClick={goNext}
          className="app-btn-primary"
          disabled={!teamId || !spaceId || !listId}
          title={
            !teamId || !spaceId || !listId
              ? 'Selecione workspace, espaço e lista para continuar'
              : undefined
          }
        >
          Continuar
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => { setErr(null); setStep(0) }} className="app-btn-secondary">Voltar</button>
          <button type="button" onClick={() => void handleSave()} className="app-btn-primary">{saving ? 'Salvando…' : 'Salvar automação'}</button>
        </div>
      )}
    </div>
  )

  return (
    <div
      role="region"
      aria-label={editing ? 'Editar automação' : 'Nova automação'}
      style={panelStyle}
    >
      <div style={scrollBodyStyle}>
        <div
          style={{
            position: 'relative',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: wizardStackGap,
          }}
        >
          <header style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <span
                style={{
                  margin: 0,
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
                    fontSize: '1.4rem',
                    marginRight: '0.5rem',
                  }}
                >
                  {step + 1}/{WIZARD_STEPS.length}
                </span>
                {WIZARD_STEPS[step].label}
                {editing ? (
                  <span style={{ color: 'var(--neutral-on-background-weak)', fontWeight: 500, fontSize: '1.4rem' }}>
                    {' '}
                    · edição
                  </span>
                ) : null}
              </span>
            </div>
          </header>

          {step === 0 ? (
            <span style={{ margin: 0, lineHeight: 1.5, fontSize: '1.4rem', color: 'var(--neutral-on-background-weak)' }}>
              Os três passos são obrigatórios, um de cada vez: primeiro o <strong style={{ color: 'var(--neutral-on-background-strong)' }}>workspace</strong>; em seguida aparece o <strong style={{ color: 'var(--neutral-on-background-strong)' }}>espaço</strong>; depois a <strong style={{ color: 'var(--neutral-on-background-strong)' }}>lista</strong> do ClickUp onde os reports viram tarefas.
            </span>
          ) : (
            <span style={{ margin: 0, lineHeight: 1.5, fontSize: '1.4rem', color: 'var(--neutral-on-background-weak)' }}>
              Um <strong style={{ color: 'var(--neutral-on-background-strong)' }}>projeto Buug</strong> por automação — os reports dele viram tarefas na lista do passo 1. O nome acima é opcional, só para identificar esta regra.
            </span>
          )}

          {err && <Alert>{err}</Alert>}

          {editing && editing.projects.length > 1 && step === 1 && (
            <Alert>
              Esta automação tem {editing.projects.length} projetos vinculados. Ao salvar, apenas o projeto selecionado abaixo permanece; os outros serão desvinculados.
            </Alert>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: wizardStackGap }}>
                <div>
                  <label htmlFor="cu-team" style={fieldLabelStyle}>
                    1. Workspace (time ClickUp){' '}
                    <span style={{ fontWeight: 500, opacity: 0.85 }}>— obrigatório</span>
                  </label>
                  <select
                    id="cu-team"
                    value={teamId}
                    onChange={e => { setTeamId(e.target.value); setSpaceId(''); setListId(''); }}
                    style={selectStyle}
                    aria-busy={teamsLoading}
                    aria-label="Passo 1: workspace ClickUp"
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
                {teamId ? (
                  <div>
                    <label htmlFor="cu-space" style={fieldLabelStyle}>
                      2. Espaço (pasta / área no ClickUp){' '}
                      <span style={{ fontWeight: 500, opacity: 0.85 }}>— obrigatório</span>
                    </label>
                    <select
                      id="cu-space"
                      value={spaceId}
                      onChange={e => { setSpaceId(e.target.value); setListId(''); }}
                      style={selectStyle}
                      aria-busy={spacesLoading}
                      aria-label="Passo 2: espaço ClickUp"
                    >
                      <option value="">
                        {spacesLoading
                          ? 'Carregando espaços…'
                          : spaces.length === 0
                            ? 'Nenhum espaço neste workspace'
                            : 'Escolha o espaço…'}
                      </option>
                      {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                ) : null}
                {teamId && spaceId ? (
                  <div>
                    <label htmlFor="cu-list" style={fieldLabelStyle}>
                      3. Lista (onde as tarefas serão criadas){' '}
                      <span style={{ fontWeight: 500, opacity: 0.85 }}>— obrigatório</span>
                    </label>
                    <select
                      id="cu-list"
                      value={listId}
                      onChange={e => setListId(e.target.value)}
                      style={selectStyle}
                      aria-busy={listsLoading}
                      aria-label="Passo 3: lista ClickUp para novas tarefas"
                    >
                      <option value="">
                        {listsLoading
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
                ) : null}
              </div>
            ) : (
              <div
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
                <div
                  style={{
                    gap: '0.5rem',
                    ...(fillHeight
                      ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }
                      : {}),
                  }}
                >
                  {orgScopedProjects.length === 0 ? (
                    <span>
                      Nenhum projeto nesta organização. Crie projetos com a organização definida.
                    </span>
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
                          <span style={{ padding: '0.75rem' }}>
                            Nenhum projeto corresponde à busca.
                          </span>
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
                                    fontSize: '1.4rem',
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
                </div>
              </div>
            )}

            {!fillHeight ? (
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  paddingTop: '1rem',
                  marginTop: '0.25rem',
                  borderTop: '1px solid var(--neutral-border-medium)',
                }}
              >
                <button type="button" onClick={onClose} className="app-btn-secondary">
                  Cancelar
                </button>
                {step === 0 ? (
                  <button type="button" onClick={goNext} className="app-btn-primary">
                    Continuar
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => { setErr(null); setStep(0) }} className="app-btn-secondary">
                      Voltar
                    </button>
                    <button type="button" onClick={() => void handleSave()} className="app-btn-primary">
                      {saving ? 'Salvando…' : 'Salvar automação'}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {fillHeight ? footer : null}
    </div>
  )
}
