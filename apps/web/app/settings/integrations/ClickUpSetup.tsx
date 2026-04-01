'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DEFAULT_STATUS_MAP_BUUG_TO_CLICKUP, DEFAULT_STATUS_MAP_CLICKUP_TO_BUUG } from '@/lib/clickup/types'
import ClickUpAutomationsTab from '@/app/settings/integrations/ClickUpAutomationsTab'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { AppIcon } from '@/components/ui/AppIcon'
import { ICON_STROKE } from '@/lib/icon-tokens'

interface OrgProject {
  id: string
  name: string
  organizationId: string | null
}

export type ClickUpSetupProps = {
  orgId: string
  /** Pro/Business com assinatura ativa; se false, não permite nova config nem automações (mantém desconectar). */
  integrationEntitled?: boolean
  onConnectionChange?: () => void
  /** Fecha o modal/painel (ex.: integrações). */
  onClose?: () => void
  /** Deep link: ao montar, foca aba Automações e deixa o filho abrir “nova automação” com projeto pré-selecionado. */
  prefillAutomationProjectId?: string | null
  onPrefillAutomationConsumed?: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid var(--neutral-border-medium)',
  background: 'var(--surface-background)',
  color: 'var(--neutral-on-background-strong)',
  fontSize: '0.875rem',
  outline: 'none',
}

function ClickUpModalCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
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
        marginTop: 2,
      }}
    >
      <AppIcon size="xl" strokeWidth={ICON_STROKE.emphasis} aria-hidden>
        <path d="M18 6L6 18M6 6l12 12" />
      </AppIcon>
    </button>
  )
}

export default function ClickUpSetup({
  orgId,
  integrationEntitled = true,
  onConnectionChange,
  onClose,
  prefillAutomationProjectId,
  onPrefillAutomationConsumed,
}: ClickUpSetupProps) {
  const router = useRouter()
  const [automationWizardOpen, setAutomationWizardOpen] = useState(false)
  const [mainTab, setMainTab] = useState<'connection' | 'automations'>('connection')
  const [showConnectionEditor, setShowConnectionEditor] = useState(false)
  const hydratedRef = useRef(false)
  const [loading, setLoading] = useState(true)
  const [configured, setConfigured] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [orgProjects, setOrgProjects] = useState<OrgProject[]>([])

  const [token, setToken] = useState('')
  const [tokenHint, setTokenHint] = useState('')
  const [testResult, setTestResult] = useState<{ valid: boolean; user?: { username: string }; error?: string } | null>(null)
  const [testing, setTesting] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [automationStats, setAutomationStats] = useState({ count: 0, coveredProjects: 0 })

  const refreshAutomationStats = useCallback(async () => {
    const res = await fetch(`/api/integrations/clickup/automations?orgId=${encodeURIComponent(orgId)}`)
    if (!res.ok) return
    const data = await res.json()
    const list = data.automations || []
    const ids = new Set<string>()
    for (const a of list) {
      for (const p of a.projects || []) ids.add(p.id)
    }
    setAutomationStats({ count: list.length, coveredProjects: ids.size })
  }, [orgId])

  const refreshProjects = useCallback(async () => {
    const res = await fetch(`/api/integrations/clickup?orgId=${orgId}`)
    if (res.ok) {
      const data = await res.json()
      setOrgProjects(data.projects || [])
    }
  }, [orgId])

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/integrations/clickup?orgId=${orgId}`)
      if (res.ok) {
        const data = await res.json()
        setConfigured(data.configured)
        setOrgProjects(data.projects || [])
        if (data.config) {
          setEnabled(data.config.enabled)
          setTokenHint(data.config.tokenHint || '')
        }
        if (data.configured) await refreshAutomationStats()
        else setAutomationStats({ count: 0, coveredProjects: 0 })
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [orgId, refreshAutomationStats])

  useEffect(() => {
    void fetchConfig()
  }, [fetchConfig])

  useEffect(() => {
    if (!prefillAutomationProjectId || !configured || !enabled) return
    setMainTab('automations')
  }, [prefillAutomationProjectId, configured, enabled])

  useEffect(() => {
    if (loading || hydratedRef.current) return
    hydratedRef.current = true
    if (configured && enabled) {
      setMainTab('automations')
      setShowConnectionEditor(false)
    } else {
      setShowConnectionEditor(true)
      setMainTab('connection')
    }
  }, [loading, configured, enabled])

  const handleTestToken = async () => {
    const t = token.trim()
    if (!t) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/integrations/clickup/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: t, orgId }),
      })
      const data = await res.json()
      setTestResult(data)
    } catch {
      setTestResult({ valid: false, error: 'Erro de rede' })
    }
    setTesting(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      const body: Record<string, unknown> = {
        enabled: true,
        teamId: '',
        listId: null,
        statusMapBuugToClickUp: DEFAULT_STATUS_MAP_BUUG_TO_CLICKUP,
        statusMapClickUpToBuug: DEFAULT_STATUS_MAP_CLICKUP_TO_BUUG,
      }
      if (token.trim()) body.token = token.trim()

      const res = await fetch(`/api/integrations/clickup?orgId=${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setSaveMsg({ type: 'success', text: 'Integração salva e ativada.' })
        setConfigured(true)
        setEnabled(true)
        if (token.trim()) {
          setTokenHint(token.trim().slice(-4))
          setToken('')
        }
        setTestResult(null)
        await refreshProjects()
        await refreshAutomationStats()
        onConnectionChange?.()
        setMainTab('automations')
        setShowConnectionEditor(false)
      } else {
        const data = await res.json()
        setSaveMsg({ type: 'danger', text: data.error || 'Erro ao salvar' })
      }
    } catch {
      setSaveMsg({ type: 'danger', text: 'Erro de rede' })
    }
    setSaving(false)
  }

  const performDisconnect = useCallback(async () => {
    setDisconnecting(true)
    try {
      await fetch(`/api/integrations/clickup?orgId=${orgId}`, { method: 'DELETE' })
      setConfigured(false)
      setEnabled(false)
      setToken('')
      setTokenHint('')
      setTestResult(null)
      setSaveMsg(null)
      setOrgProjects([])
      setMainTab('connection')
      setShowConnectionEditor(true)
      setAutomationStats({ count: 0, coveredProjects: 0 })
      setShowDisconnectConfirm(false)
      onConnectionChange?.()
    } catch { /* ignore */ }
    setDisconnecting(false)
  }, [orgId, onConnectionChange])

  const canSave = useMemo(() => {
    const newTok = !!token.trim()
    const hasExisting = configured && !!tokenHint
    if (hasExisting && !newTok) return true
    return newTok && !!testResult?.valid
  }, [configured, tokenHint, token, testResult?.valid])

  const disconnectModal = showDisconnectConfirm ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clickup-disconnect-title"
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
      onClick={() => !disconnecting && setShowDisconnectConfirm(false)}
    >
      <div
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
          <h3 id="clickup-disconnect-title" style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>
            Desconectar ClickUp
          </h3>
          <span style={{ fontSize: '0.875rem', lineHeight: 1.55, color: 'var(--neutral-on-background-weak)' }}>
            Tem certeza? O token da API será removido, a integração desativada e as automações desta organização deixarão de enviar reports ao ClickUp. Você poderá conectar de novo depois.
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => setShowDisconnectConfirm(false)} disabled={disconnecting} className="app-btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={() => void performDisconnect()} disabled={disconnecting} className="app-btn-danger">
            {disconnecting ? 'Desconectando…' : 'Desconectar'}
          </button>
        </div>
      </div>
    </div>
  ) : null

  if (loading) {
    return (
      <>
        <div
          style={{
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            minHeight: '12rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: onClose ? undefined : 0 }}>
            {onClose ? <ClickUpModalCloseButton onClose={onClose} /> : null}
          </div>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.875rem',
              padding: '1rem 0 2rem',
            }}
          >
            <Spinner size="md" />
            <span style={{ fontSize: '0.875rem', color: 'var(--neutral-on-background-weak)', textAlign: 'center' }}>
              Carregando configuração do ClickUp…
            </span>
          </div>
        </div>
        {disconnectModal}
      </>
    )
  }

  if (!integrationEntitled && !configured) {
    return (
      <div style={{ position: 'relative' }}>
        {onClose ? (
          <div style={{ flexShrink: 0 }}>
            <ClickUpModalCloseButton onClose={onClose} />
          </div>
        ) : null}
        <Alert><strong>Plano Pro ou Business</strong> 
          <span>
            A integração ClickUp e as automações exigem plano pago com assinatura ativa.
          </span>
        </Alert>
        <button onClick={() => router.push('/plans/upgrade')} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'var(--brand-solid-strong)', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Ver planos</button>
      </div>
    )
  }

  const openConnectionEditor = () => {
    setShowConnectionEditor(true)
    setMainTab('connection')
    setToken('')
    setTestResult(null)
  }

  const closeConnectionEditor = () => {
    setShowConnectionEditor(false)
    setMainTab('automations')
  }

  const editingActiveConnection = configured && enabled && showConnectionEditor
  const compactAutomationsOnly = configured && enabled && !showConnectionEditor
  const orgScopedProjects = orgProjects.filter(p => p.organizationId === orgId)

  if (compactAutomationsOnly) {
    if (!integrationEntitled) {
      return (
        <>
          <div
            style={{
              minHeight: 0,
              flex: automationWizardOpen ? 1 : undefined,
              alignSelf: 'stretch',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ marginBottom: '1rem', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flex: 1, minWidth: 0, alignItems: 'center', gap: '0.75rem' }}>
                  <img src="/integrations/clickup.svg" alt="" width={44} height={44} style={{ flexShrink: 0, display: 'block' }} />
                  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem', justifyContent: 'center' }}>
                    <h2 id="clickup-modal-title" style={{ margin: 0, lineHeight: 1.25, fontSize: '1.125rem', fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>
                      ClickUp
                    </h2>
                    <span style={{ lineHeight: 1.5, wordBreak: 'break-word', fontSize: '0.8125rem', color: 'var(--neutral-on-background-weak)' }}>
                      <span style={{ color: 'var(--warning-on-background-strong, #b45309)' }}>Integrações pausadas</span>
                      {' · '}Sem plano Pro/Business ativo a sincronização e as automações não funcionam. Pode desconectar para remover credenciais.
                    </span>
                  </div>
                </div>
                {onClose ? <ClickUpModalCloseButton onClose={onClose} /> : null}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button onClick={() => router.push('/plans/upgrade')} className="app-btn-primary">Ver planos</button>
                <button onClick={() => setShowDisconnectConfirm(true)} className="app-btn-danger">Desconectar</button>
              </div>
            </div>
          </div>
          {disconnectModal}
        </>
      )
    }
    return (
      <>
      <div
        style={{
          minHeight: 0,
          flex: automationWizardOpen ? 1 : undefined,
          alignSelf: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          gap: automationWizardOpen ? 0 : '1rem',
        }}
      >
        {!automationWizardOpen ? (
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem 1.25rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flex: 1, minWidth: 0, alignItems: 'center', gap: '0.75rem' }}>
                <img src="/integrations/clickup.svg" alt="" width={44} height={44} style={{ flexShrink: 0, display: 'block' }} />
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem', justifyContent: 'center' }}>
                  <h2 id="clickup-modal-title" style={{ margin: 0, lineHeight: 1.25, fontSize: '1.125rem', fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>
                    Automações ClickUp
                  </h2>
                  <span style={{ lineHeight: 1.5, wordBreak: 'break-word', fontSize: '0.8125rem', color: 'var(--neutral-on-background-weak)' }}>
                    <span style={{ color: 'var(--success-on-background-strong)' }}>Conexão ativa</span>
                    {` · ${automationStats.count} automação(ões) · ${automationStats.coveredProjects} projeto(s) com destino`}
                  </span>
                </div>
              </div>
              {onClose ? <ClickUpModalCloseButton onClose={onClose} /> : null}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              {integrationEntitled ? (
                <button onClick={openConnectionEditor} className="app-btn-secondary">Editar chave API</button>
              ) : null}
              <button onClick={() => setShowDisconnectConfirm(true)} className="app-btn-danger">Desconectar</button>
            </div>
          </div>
        ) : null}
        <div
          style={{
            flex: automationWizardOpen ? 1 : undefined,
            minHeight: automationWizardOpen ? 0 : undefined,
            maxHeight: automationWizardOpen ? 'none' : 'min(58vh, 520px)',
            overflowY: automationWizardOpen ? 'hidden' : 'auto',
            overflowX: 'hidden',
            paddingRight: automationWizardOpen ? 0 : '0.25rem',
            paddingBottom: automationWizardOpen ? 0 : '0.25rem',
            display: automationWizardOpen ? 'flex' : undefined,
            flexDirection: automationWizardOpen ? 'column' : undefined,
          }}
        >
          <ClickUpAutomationsTab
            orgId={orgId}
            defaultTeamId=""
            orgScopedProjects={orgScopedProjects}
            fillWizardHeight={automationWizardOpen}
            openCreateWithProjectId={prefillAutomationProjectId}
            onOpenCreatePrefillConsumed={onPrefillAutomationConsumed}
            onWizardOpenChange={setAutomationWizardOpen}
            onChange={() => {
              void refreshAutomationStats()
              onConnectionChange?.()
            }}
          />
        </div>
      </div>
      {disconnectModal}
      </>
    )
  }

  return (
    <>
    <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem 1.25rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', flex: 1, minWidth: 0, alignItems: 'center', gap: '0.75rem' }}>
            <img src="/integrations/clickup.svg" alt="" width={44} height={44} style={{ flexShrink: 0, display: 'block' }} />
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem', justifyContent: 'center' }}>
              <h2 id="clickup-modal-title" style={{ margin: 0, lineHeight: 1.25, fontSize: '1.125rem', fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>
                {editingActiveConnection
                  ? 'Editar conexão ClickUp'
                  : mainTab === 'connection'
                    ? 'Conectar ao ClickUp'
                    : 'Automações'}
              </h2>
              <span style={{ lineHeight: 1.5, wordBreak: 'break-word', fontSize: '0.8125rem', color: 'var(--neutral-on-background-weak)' }}>
                {editingActiveConnection ? (
                  <>
                    <span style={{ color: 'var(--success-on-background-strong)' }}>Integração ativa</span>
                    {' · '}Somente token da API. Workspace e lista em cada automação.
                  </>
                ) : mainTab === 'connection' ? (
                  <>
                    Token da API do ClickUp. Depois use a aba <strong>Automações</strong> para definir destino (workspace, lista) por regra.
                    {configured && enabled && (
                      <>
                        {' · '}
                        <span style={{ color: 'var(--success-on-background-strong)' }}>Ativo</span>
                        {` · ${automationStats.count} automação(ões)`}
                      </>
                    )}
                  </>
                ) : (
                  'Gerencie para onde cada projeto Buug envia reports no ClickUp'
                )}
              </span>
            </div>
          </div>
          {onClose ? <ClickUpModalCloseButton onClose={onClose} /> : null}
        </div>
        {!editingActiveConnection ? (
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            {configured ? (
              <button onClick={() => setShowDisconnectConfirm(true)} className="app-btn-danger">Desconectar</button>
            ) : null}
          </div>
        ) : null}
      </div>

      {!integrationEntitled && configured ? (
        <div style={{ padding: '0 1.25rem' }}>
          <Alert><strong>Integrações pausadas</strong> 
            <span>
              Renove o plano Pro ou Business para editar a conexão ou gerir automações. Pode desconectar para remover o token.
            </span>
          </Alert>
        </div>
      ) : null}

      {!editingActiveConnection ? (
        <div style={{ display: 'flex', gap: '0.25rem', padding: '0 1.25rem' }}>
          <button
            onClick={() => setMainTab('connection')}
            className={`app-filter-chip${mainTab === 'connection' ? ' app-filter-chip--active' : ''}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem' }}
          >
            Conexão
          </button>
          <button
            onClick={() => setMainTab('automations')}
            disabled={!configured || !enabled}
            className={`app-filter-chip${mainTab === 'automations' ? ' app-filter-chip--active' : ''}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', opacity: (!configured || !enabled) ? 0.5 : 1 }}
          >
            Automações
          </button>
        </div>
      ) : null}

      {mainTab === 'automations' && configured && enabled && integrationEntitled && !editingActiveConnection && (
        <ClickUpAutomationsTab
          orgId={orgId}
          defaultTeamId=""
          orgScopedProjects={orgScopedProjects}
          openCreateWithProjectId={prefillAutomationProjectId}
          onOpenCreatePrefillConsumed={onPrefillAutomationConsumed}
          onWizardOpenChange={setAutomationWizardOpen}
          onChange={() => {
            void refreshAutomationStats()
            onConnectionChange?.()
          }}
        />
      )}

      {mainTab === 'automations' && (!configured || !enabled) && (
        <div style={{ padding: '0 1.25rem' }}>
          <Alert><strong>Conecte o ClickUp</strong> 
            Use a aba Conexão para salvar o token e ativar a integração antes das automações.
          </Alert>
        </div>
      )}

      {mainTab === 'automations' && configured && enabled && !integrationEntitled && !editingActiveConnection && (
        <div style={{ padding: '0 1.25rem' }}>
          <Alert><strong>Plano necessário</strong> 
            <span>
              As automações exigem plano Pro ou Business com assinatura ativa.
            </span>
            <div style={{ marginTop: '0.75rem' }}>
              <button type="button" onClick={() => router.push('/plans/upgrade')} className="app-btn-primary">Ver planos</button>
            </div>
          </Alert>
        </div>
      )}

      {mainTab === 'connection' && (
        <>
          <div
            style={{
              maxHeight: 'min(58vh, 520px)',
              overflowY: 'auto',
              padding: '0 1.25rem',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <span style={{ lineHeight: 1.55, fontSize: '0.8125rem', color: 'var(--neutral-on-background-weak)' }}>
                {editingActiveConnection
                  ? 'O token salvo continua ativo. Para trocar, cole o novo valor, teste e salve. Para sair sem mudanças: use Voltar ou clique fora do modal.'
                  : 'Cole o token da API, teste a conexão e salve. Workspace e lista você define ao criar cada automação.'}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--neutral-on-background-weak)' }}>
                ClickUp: <strong style={{ color: 'var(--neutral-on-background-strong)' }}>Configurações → Apps → API Token</strong> (geralmente <code style={{ fontSize: '0.8em', background: 'var(--neutral-alpha-weak)', padding: '1px 4px', borderRadius: '3px' }}>pk_</code>…).
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-on-background-weak)' }}>
                  Token da API
                </span>
                <input
                  type="password"
                  placeholder={configured ? `****${tokenHint} (já salvo)` : 'pk_...'}
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  className="app-input"
                  autoComplete="off"
                />
              </div>

              {testResult && (
                <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: testResult.valid ? 'var(--success-on-background-strong)' : 'var(--danger-on-background-strong)' }}>
                  {testResult.valid
                    ? `✓ Conectado como ${testResult.user?.username}`
                    : `✗ ${testResult.error || 'Token inválido'}`}
                </span>
              )}
              {saveMsg && <Alert variant={saveMsg.type}>{saveMsg.text}</Alert>}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
              padding: '1rem 1.25rem',
              borderTop: '1px solid var(--neutral-border-medium)',
            }}
          >
            {editingActiveConnection ? (
              <button onClick={closeConnectionEditor} className="app-btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}>← Voltar às automações</button>
            ) : <span />}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleTestToken} disabled={!token.trim() || !integrationEntitled} className="app-btn-secondary">{testing ? 'Testando…' : 'Testar conexão'}</button>
              <button onClick={handleSave} disabled={!canSave || !integrationEntitled} className="app-btn-primary">{saving ? 'Salvando…' : (configured ? 'Salvar' : 'Salvar e ativar')}</button>
            </div>
          </div>
        </>
      )}
    </div>
    {disconnectModal}
    </>
  )
}
