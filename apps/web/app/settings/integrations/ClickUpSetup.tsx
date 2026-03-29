'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Column, Row, Heading, Text, Button, Feedback as FeedbackAlert } from '@once-ui-system/core'
import { DEFAULT_STATUS_MAP_BUUG_TO_CLICKUP, DEFAULT_STATUS_MAP_CLICKUP_TO_BUUG } from '@/lib/clickup/types'
import ClickUpAutomationsTab from '@/app/settings/integrations/ClickUpAutomationsTab'

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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
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
      <Column
        padding="l"
        gap="m"
        radius="l"
        background="surface"
        border="neutral-medium"
        style={{ maxWidth: '28rem', width: '100%', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <Column gap="s">
          <Heading variant="heading-strong-m" as="h3" id="clickup-disconnect-title" style={{ margin: 0 }}>
            Desconectar ClickUp
          </Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Tem certeza? O token da API será removido, a integração desativada e as automações desta organização deixarão de enviar reports ao ClickUp. Você poderá conectar de novo depois.
          </Text>
        </Column>
        <Row gap="s" horizontal="end" wrap>
          <Button
            variant="secondary"
            size="m"
            label="Cancelar"
            disabled={disconnecting}
            onClick={() => setShowDisconnectConfirm(false)}
          />
          <Button
            variant="danger"
            size="m"
            label={disconnecting ? 'Desconectando…' : 'Desconectar'}
            loading={disconnecting}
            disabled={disconnecting}
            onClick={() => void performDisconnect()}
          />
        </Row>
      </Column>
    </div>
  ) : null

  if (loading) {
    return (
      <>
        <Column fillWidth gap="m" style={{ position: 'relative' }}>
          {onClose ? (
            <Row fillWidth horizontal="end" style={{ flexShrink: 0 }}>
              <ClickUpModalCloseButton onClose={onClose} />
            </Row>
          ) : null}
          <Column fillWidth padding="xl" horizontal="center" gap="m">
            <Text variant="body-default-s" onBackground="neutral-weak">Carregando configuração do ClickUp…</Text>
          </Column>
        </Column>
        {disconnectModal}
      </>
    )
  }

  if (!integrationEntitled && !configured) {
    return (
      <Column fillWidth gap="m" style={{ position: 'relative' }}>
        {onClose ? (
          <Row fillWidth horizontal="end" style={{ flexShrink: 0 }}>
            <ClickUpModalCloseButton onClose={onClose} />
          </Row>
        ) : null}
        <FeedbackAlert variant="warning" title="Plano Pro ou Business">
          <Text variant="body-default-s" onBackground="neutral-weak">
            A integração ClickUp e as automações exigem plano pago com assinatura ativa.
          </Text>
        </FeedbackAlert>
        <Button variant="primary" size="m" label="Ver planos" onClick={() => router.push('/plans/upgrade')} />
      </Column>
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
          <Column
            fillWidth
            gap="m"
            style={{
              minHeight: 0,
              flex: automationWizardOpen ? 1 : undefined,
              alignSelf: 'stretch',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Column fillWidth gap="m" style={{ marginBottom: '1rem', flexShrink: 0 }}>
              <Row gap="m" vertical="start" fillWidth horizontal="between" style={{ alignItems: 'flex-start' }}>
                <Row gap="m" vertical="start" style={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
                  <img src="/integrations/clickup.svg" alt="" width={44} height={44} style={{ flexShrink: 0, marginTop: 2 }} />
                  <Column gap="xs" fillWidth style={{ minWidth: 0 }}>
                    <Heading variant="heading-strong-s" as="h2" id="clickup-modal-title" style={{ margin: 0, lineHeight: 1.25 }}>
                      ClickUp
                    </Heading>
                    <Text variant="body-default-xs" onBackground="neutral-weak" style={{ lineHeight: 1.5, wordBreak: 'break-word' }}>
                      <span style={{ color: 'var(--warning-on-background-strong, #b45309)' }}>Integrações pausadas</span>
                      {' · '}Sem plano Pro/Business ativo a sincronização e as automações não funcionam. Pode desconectar para remover credenciais.
                    </Text>
                  </Column>
                </Row>
                {onClose ? <ClickUpModalCloseButton onClose={onClose} /> : null}
              </Row>
              <Row gap="s" vertical="center" wrap fillWidth horizontal="start" style={{ flexShrink: 0 }}>
                <Button size="s" variant="primary" label="Ver planos" onClick={() => router.push('/plans/upgrade')} />
                <Button size="s" variant="danger" label="Desconectar" onClick={() => setShowDisconnectConfirm(true)} />
              </Row>
            </Column>
          </Column>
          {disconnectModal}
        </>
      )
    }
    return (
      <>
      <Column
        fillWidth
        gap="0"
        style={{
          minHeight: 0,
          flex: automationWizardOpen ? 1 : undefined,
          alignSelf: 'stretch',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {!automationWizardOpen ? (
          <Column fillWidth gap="m" style={{ marginBottom: '1rem', flexShrink: 0 }}>
            <Row gap="m" vertical="start" fillWidth horizontal="between" style={{ alignItems: 'flex-start' }}>
              <Row gap="m" vertical="start" style={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
                <img src="/integrations/clickup.svg" alt="" width={44} height={44} style={{ flexShrink: 0, marginTop: 2 }} />
                <Column gap="xs" fillWidth style={{ minWidth: 0 }}>
                  <Heading variant="heading-strong-s" as="h2" id="clickup-modal-title" style={{ margin: 0, lineHeight: 1.25 }}>
                    Automações ClickUp
                  </Heading>
                  <Text variant="body-default-xs" onBackground="neutral-weak" style={{ lineHeight: 1.5, wordBreak: 'break-word' }}>
                    <span style={{ color: 'var(--success-on-background-strong)' }}>Conexão ativa</span>
                    {` · ${automationStats.count} automação(ões) · ${automationStats.coveredProjects} projeto(s) com destino`}
                  </Text>
                </Column>
              </Row>
              {onClose ? <ClickUpModalCloseButton onClose={onClose} /> : null}
            </Row>
            <Row gap="s" vertical="center" wrap fillWidth horizontal="start" style={{ flexShrink: 0 }}>
              {integrationEntitled ? (
                <Button size="s" variant="secondary" label="Editar chave API" onClick={openConnectionEditor} />
              ) : null}
              <Button size="s" variant="danger" label="Desconectar" onClick={() => setShowDisconnectConfirm(true)} />
            </Row>
          </Column>
        ) : null}
        <div
          style={{
            flex: automationWizardOpen ? 1 : undefined,
            minHeight: automationWizardOpen ? 0 : undefined,
            maxHeight: automationWizardOpen ? 'none' : 'min(58vh, 520px)',
            overflowY: automationWizardOpen ? 'hidden' : 'auto',
            overflowX: 'hidden',
            paddingRight: '0.25rem',
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
            onCloseEntireModal={onClose}
            onWizardOpenChange={setAutomationWizardOpen}
            onChange={() => {
              void refreshAutomationStats()
              onConnectionChange?.()
            }}
          />
        </div>
      </Column>
      {disconnectModal}
      </>
    )
  }

  return (
    <>
    <Column fillWidth gap="0" style={{ minHeight: 0 }}>
      <Column fillWidth gap="m" style={{ marginBottom: editingActiveConnection ? '0.75rem' : '1rem' }}>
        <Row gap="m" vertical="start" fillWidth horizontal="between" style={{ alignItems: 'flex-start' }}>
          <Row gap="m" vertical="start" style={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
            <img src="/integrations/clickup.svg" alt="" width={44} height={44} style={{ flexShrink: 0, marginTop: 2 }} />
            <Column gap="xs" fillWidth style={{ minWidth: 0 }}>
              <Heading variant="heading-strong-s" as="h2" id="clickup-modal-title" style={{ margin: 0, lineHeight: 1.25 }}>
                {editingActiveConnection
                  ? 'Editar conexão ClickUp'
                  : mainTab === 'connection'
                    ? 'Conectar ao ClickUp'
                    : 'Automações'}
              </Heading>
              <Text variant="body-default-xs" onBackground="neutral-weak" style={{ lineHeight: 1.5, wordBreak: 'break-word' }}>
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
              </Text>
            </Column>
          </Row>
          {onClose ? <ClickUpModalCloseButton onClose={onClose} /> : null}
        </Row>
        {!editingActiveConnection ? (
          <Row gap="s" vertical="center" wrap fillWidth horizontal="start" style={{ flexShrink: 0 }}>
            {configured ? (
              <Button size="s" variant="danger" label="Desconectar" onClick={() => setShowDisconnectConfirm(true)} />
            ) : null}
          </Row>
        ) : null}
      </Column>

      {!integrationEntitled && configured ? (
        <FeedbackAlert variant="warning" title="Integrações pausadas">
          <Text variant="body-default-s" onBackground="neutral-weak">
            Renove o plano Pro ou Business para editar a conexão ou gerir automações. Pode desconectar para remover o token.
          </Text>
        </FeedbackAlert>
      ) : null}

      {!editingActiveConnection ? (
        <Row gap="xs" wrap style={{ marginBottom: '0.75rem' }}>
          <Button
            size="s"
            variant={mainTab === 'connection' ? 'primary' : 'secondary'}
            label="Conexão"
            onClick={() => setMainTab('connection')}
          />
          <Button
            size="s"
            variant={mainTab === 'automations' ? 'primary' : 'secondary'}
            label="Automações"
            onClick={() => setMainTab('automations')}
            disabled={!configured || !enabled}
          />
        </Row>
      ) : null}

      {mainTab === 'automations' && configured && enabled && integrationEntitled && !editingActiveConnection && (
        <ClickUpAutomationsTab
          orgId={orgId}
          defaultTeamId=""
          orgScopedProjects={orgScopedProjects}
          openCreateWithProjectId={prefillAutomationProjectId}
          onOpenCreatePrefillConsumed={onPrefillAutomationConsumed}
          onCloseEntireModal={onClose}
          onWizardOpenChange={setAutomationWizardOpen}
          onChange={() => {
            void refreshAutomationStats()
            onConnectionChange?.()
          }}
        />
      )}

      {mainTab === 'automations' && (!configured || !enabled) && (
        <FeedbackAlert variant="warning" title="Conecte o ClickUp">
          Use a aba Conexão para salvar o token e ativar a integração antes das automações.
        </FeedbackAlert>
      )}

      {mainTab === 'automations' && configured && enabled && !integrationEntitled && !editingActiveConnection && (
        <FeedbackAlert variant="warning" title="Plano necessário">
          <Text variant="body-default-s" onBackground="neutral-weak">
            As automações exigem plano Pro ou Business com assinatura ativa.
          </Text>
          <Row gap="s" style={{ marginTop: '0.75rem' }}>
            <Button size="s" variant="primary" label="Ver planos" onClick={() => router.push('/plans/upgrade')} />
          </Row>
        </FeedbackAlert>
      )}

      {mainTab === 'connection' && (
        <>
          <div
            style={{
              maxHeight: 'min(58vh, 520px)',
              overflowY: 'auto',
              paddingRight: '0.25rem',
            }}
          >
            <Column gap="m" fillWidth>
              <Text variant="body-default-s" onBackground="neutral-weak" style={{ lineHeight: 1.55 }}>
                {editingActiveConnection
                  ? 'O token salvo continua ativo. Para trocar, cole o novo valor, teste e salve. Para sair sem mudanças: use Voltar ou clique fora do modal.'
                  : 'Cole o token da API, teste a conexão e salve. Workspace e lista você define ao criar cada automação.'}
              </Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                ClickUp: <strong>Configurações → Apps → API Token</strong> (geralmente <code style={{ fontSize: '0.8em' }}>pk_</code>…).
              </Text>

              <Column gap="xs" fillWidth>
                <Text variant="label-default-s" style={{ color: 'var(--neutral-on-background-weak)' }}>
                  Token da API
                </Text>
                <input
                  type="password"
                  placeholder={configured ? `****${tokenHint} (já salvo)` : 'pk_...'}
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  style={inputStyle}
                  autoComplete="off"
                />
              </Column>

              {testResult && (
                <Text variant="body-default-xs" onBackground={testResult.valid ? 'success-strong' : 'danger-strong'}>
                  {testResult.valid
                    ? `Conectado como ${testResult.user?.username}`
                    : testResult.error || 'Token inválido'}
                </Text>
              )}
              {saveMsg && <FeedbackAlert variant={saveMsg.type}>{saveMsg.text}</FeedbackAlert>}
            </Column>
          </div>

          <Row
            fillWidth
            vertical="center"
            wrap
            gap="m"
            style={{
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--neutral-border-medium)',
            }}
          >
            {editingActiveConnection ? (
              <div style={{ marginRight: 'auto' }}>
                <Button size="m" variant="tertiary" label="Voltar às automações" onClick={closeConnectionEditor} />
              </div>
            ) : null}
            <Row gap="s" vertical="center" wrap horizontal="end" style={{ marginLeft: editingActiveConnection ? undefined : 'auto' }}>
              <Button
                size="m"
                variant="secondary"
                label={testing ? 'Testando…' : 'Testar conexão'}
                onClick={handleTestToken}
                loading={testing}
                disabled={!token.trim() || !integrationEntitled}
              />
              <Button
                size="m"
                variant="primary"
                label={saving ? 'Salvando…' : (configured ? 'Salvar' : 'Salvar e ativar')}
                onClick={handleSave}
                loading={saving}
                disabled={!canSave || !integrationEntitled}
              />
            </Row>
          </Row>
        </>
      )}
    </Column>
    {disconnectModal}
    </>
  )
}
