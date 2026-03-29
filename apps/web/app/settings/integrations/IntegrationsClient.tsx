'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { hasActiveIntegrationEntitlement } from '@/lib/integration-entitlement'
import {
  Column,
  Row,
  Heading,
  Text,
  Button,
  Card,
  Tag,
  Icon,
  Feedback as FeedbackAlert,
} from '@once-ui-system/core'
import AppLayout from '@/components/ui/AppLayout'
import { useOrg } from '@/contexts/OrgContext'
import { IntegrationsDocsReference, type DocPageId } from './IntegrationsDocsReference'
import ClickUpSetup from './ClickUpSetup'

interface ApiKeyItem {
  id: string
  name: string
  prefix: string
  permissions: string[]
  lastUsedAt: string | null
  createdAt: string
}

interface WebhookItem {
  id: string
  url: string
  events: string[]
  secret?: string
  active: boolean
  createdAt: string
}

const EVENT_LABELS: Record<string, string> = {
  'feedback.created': 'Novo report',
  'feedback.status_changed': 'Status alterado',
  'feedback.assigned': 'Responsável atribuído',
  'feedback.due_date_set': 'Prazo definido',
  'project.created': 'Projeto criado',
  '*': 'Todos os eventos',
}

const PERMISSION_LABELS: Record<string, string> = {
  'read:feedbacks': 'Ler reports',
  'read:projects': 'Ler projetos',
  'write:feedbacks': 'Editar reports',
  '*': 'Acesso total',
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

const tabButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: '0.65rem 1rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: active ? 'var(--brand-on-background-strong)' : 'var(--neutral-on-background-weak)',
  background: active ? 'var(--brand-alpha-weak)' : 'transparent',
  border: `1px solid ${active ? 'var(--brand-border-medium)' : 'transparent'}`,
  borderRadius: '0.5rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
})

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

const codeBlockStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontFamily: 'ui-monospace, monospace',
  display: 'block',
  padding: '0.75rem',
  borderRadius: '0.5rem',
  background: 'var(--surface-background)',
  border: '1px solid var(--neutral-border-medium)',
  whiteSpace: 'pre-wrap',
  lineHeight: 1.55,
  overflowX: 'auto',
}

type SectionTab = 'connections' | 'api'
type ApiSubTab = 'keys' | 'webhooks' | 'docs'

export default function IntegrationsClient({ userId: _userId }: { userId: string }) {
  const { currentOrg, orgs, switchOrg } = useOrg()
  const orgId = currentOrg?.id
  const searchParams = useSearchParams()
  const router = useRouter()
  const clickUpDeepLinkHandledRef = useRef(false)
  const [clickUpPrefillProjectId, setClickUpPrefillProjectId] = useState<string | null>(null)

  const [apiBaseDisplay, setApiBaseDisplay] = useState('https://buug.io/api/v1')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setApiBaseDisplay(`${window.location.origin}/api/v1`)
    }
  }, [])

  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([])
  const [keysLoading, setKeysLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)

  const [webhooks, setWebhooks] = useState<WebhookItem[]>([])
  const [webhooksLoading, setWebhooksLoading] = useState(true)
  const [newWebhookUrl, setNewWebhookUrl] = useState('')
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['feedback.created'])
  const [creatingWebhook, setCreatingWebhook] = useState(false)
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null)

  const [section, setSection] = useState<SectionTab>('connections')
  const [apiSubTab, setApiSubTab] = useState<ApiSubTab>('keys')
  const [docPage, setDocPage] = useState<DocPageId>('intro')

  const [clickUpModalOpen, setClickUpModalOpen] = useState(false)
  const [clickUpWizardKey, setClickUpWizardKey] = useState(0)
  const [clickUpConnected, setClickUpConnected] = useState(false)
  const integrationsOrgQueryHandledRef = useRef(false)
  /** null = a carregar entitlement (Pro/Business + assinatura ativa) para integrações */
  const [integrationEntitled, setIntegrationEntitled] = useState<boolean | null>(null)

  const fetchKeys = useCallback(async () => {
    if (!orgId) return
    setKeysLoading(true)
    try {
      const res = await fetch(`/api/keys?orgId=${orgId}`)
      if (res.ok) {
        const data = await res.json()
        setApiKeys(data.keys || [])
      }
    } catch {}
    setKeysLoading(false)
  }, [orgId])

  const fetchWebhooks = useCallback(async () => {
    if (!orgId) return
    setWebhooksLoading(true)
    try {
      const res = await fetch(`/api/webhooks/manage?orgId=${orgId}`)
      if (res.ok) {
        const data = await res.json()
        setWebhooks(data.webhooks || [])
      }
    } catch {}
    setWebhooksLoading(false)
  }, [orgId])

  useEffect(() => {
    fetchKeys()
    fetchWebhooks()
  }, [fetchKeys, fetchWebhooks])

  useEffect(() => {
    if (!orgId) {
      setIntegrationEntitled(null)
      return
    }
    let cancelled = false
    setIntegrationEntitled(null)
    void (async () => {
      try {
        const res = await fetch(`/api/billing/subscription?orgId=${encodeURIComponent(orgId)}`)
        if (cancelled) return
        if (!res.ok) {
          setIntegrationEntitled(false)
          return
        }
        const data = await res.json()
        const o = data.organization as {
          plan?: string
          stripeSubscriptionId?: string | null
          planExpiresAt?: string | null
        }
        const allowed = hasActiveIntegrationEntitlement({
          plan: o?.plan,
          stripeSubscriptionId: o?.stripeSubscriptionId,
          planExpiresAt: o?.planExpiresAt,
        })
        if (!cancelled) setIntegrationEntitled(allowed)
      } catch {
        if (!cancelled) setIntegrationEntitled(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orgId])

  const refreshClickUpStatus = useCallback(() => {
    if (!orgId) return
    void fetch(`/api/integrations/clickup?orgId=${orgId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.configured && data?.config?.enabled) setClickUpConnected(true)
        else setClickUpConnected(false)
      })
      .catch(() => {})
  }, [orgId])

  useEffect(() => {
    if (!orgId || section !== 'connections') return
    refreshClickUpStatus()
  }, [orgId, section, refreshClickUpStatus, clickUpModalOpen])

  useEffect(() => {
    if (!clickUpModalOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setClickUpModalOpen(false)
        refreshClickUpStatus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [clickUpModalOpen, refreshClickUpStatus])

  const integrationsQueryKey = searchParams.toString()

  useEffect(() => {
    const focus = searchParams.get('focus')
    if (focus !== 'clickup') {
      clickUpDeepLinkHandledRef.current = false
      return
    }
    if (clickUpDeepLinkHandledRef.current) return

    const pid = searchParams.get('projectId')
    const oid = searchParams.get('orgId')

    if (oid) {
      if (orgs.length === 0) return
      if (!orgs.some(o => o.id === oid)) {
        clickUpDeepLinkHandledRef.current = true
        router.replace('/settings/integrations', { scroll: false })
        return
      }
      if (currentOrg?.id !== oid) {
        switchOrg(oid, { skipRedirect: true })
        return
      }
    } else if (!currentOrg?.id) {
      return
    }

    clickUpDeepLinkHandledRef.current = true
    if (pid) setClickUpPrefillProjectId(pid)
    setClickUpModalOpen(true)
    setSection('connections')
    router.replace('/settings/integrations', { scroll: false })
  }, [integrationsQueryKey, searchParams, orgs, currentOrg?.id, switchOrg, router])

  /** Só `orgId` na URL (ex.: atalho a partir do projeto): troca org e mostra a lista de integrações, sem abrir modal. */
  useEffect(() => {
    if (searchParams.get('focus')) {
      return
    }
    const oid = searchParams.get('orgId')
    if (!oid) {
      integrationsOrgQueryHandledRef.current = false
      return
    }
    if (integrationsOrgQueryHandledRef.current) return

    if (orgs.length === 0) return
    if (!orgs.some(o => o.id === oid)) {
      integrationsOrgQueryHandledRef.current = true
      router.replace('/settings/integrations', { scroll: false })
      return
    }
    if (currentOrg?.id !== oid) {
      switchOrg(oid, { skipRedirect: true })
      return
    }

    integrationsOrgQueryHandledRef.current = true
    router.replace('/settings/integrations', { scroll: false })
  }, [integrationsQueryKey, searchParams, orgs, currentOrg?.id, switchOrg, router])

  const handleCreateKey = async () => {
    if (!orgId || !newKeyName.trim()) return
    setCreatingKey(true)
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          name: newKeyName.trim(),
          permissions: ['read:feedbacks', 'read:projects', 'write:feedbacks'],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setNewKeyValue(data.key)
        setNewKeyName('')
        fetchKeys()
      } else if (res.status === 403) {
        const data = await res.json().catch(() => ({}))
        if (data?.code === 'INTEGRATIONS_REQUIRE_PAID_PLAN') setIntegrationEntitled(false)
      }
    } catch {}
    setCreatingKey(false)
  }

  const handleDeleteKey = async (keyId: string) => {
    if (!orgId) return
    await fetch('/api/keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: keyId, orgId }),
    })
    fetchKeys()
  }

  const handleCreateWebhook = async () => {
    if (!orgId || !newWebhookUrl.trim()) return
    setCreatingWebhook(true)
    try {
      const res = await fetch('/api/webhooks/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, url: newWebhookUrl.trim(), events: newWebhookEvents }),
      })
      if (res.ok) {
        const data = await res.json()
        setNewWebhookSecret(data.webhook?.secret || null)
        setNewWebhookUrl('')
        setNewWebhookEvents(['feedback.created'])
        fetchWebhooks()
      } else if (res.status === 403) {
        const data = await res.json().catch(() => ({}))
        if (data?.code === 'INTEGRATIONS_REQUIRE_PAID_PLAN') setIntegrationEntitled(false)
      }
    } catch {}
    setCreatingWebhook(false)
  }

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!orgId) return
    await fetch('/api/webhooks/manage', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: webhookId, orgId }),
    })
    fetchWebhooks()
  }

  const copyToClipboard = (text: string) => {
    try {
      navigator.clipboard.writeText(text)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setKeyCopied(true)
    setTimeout(() => setKeyCopied(false), 2000)
  }

  const apiSubTabs: { key: ApiSubTab; label: string }[] = [
    { key: 'keys', label: 'Chaves de acesso' },
    { key: 'webhooks', label: 'Avisos automáticos' },
    { key: 'docs', label: 'Documentação' },
  ]

  const curlExample = `curl -H "Authorization: Bearer SUA_CHAVE_AQUI" \\
  "${apiBaseDisplay}/feedbacks?status=OPEN"`

  const integrationAllowed = integrationEntitled === true
  const integrationLocked = orgId && integrationEntitled === false
  const integrationLoading = orgId && integrationEntitled === null

  return (
    <AppLayout>
      <Column
        as="main"
        fillWidth
        paddingX="l"
        paddingY="m"
        gap="l"
        style={{
          maxWidth: section === 'api' && apiSubTab === 'docs' ? 'min(100%, 72rem)' : '56rem',
        }}
      >
        <Column gap="m">
          <Column gap="xs">
            <Heading variant="heading-strong-l" as="h1">
              Integrações
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ maxWidth: '42rem' }}>
              {integrationLocked ? (
                section === 'connections' ? (
                  <>
                    <strong>Conexões</strong>, <strong>API</strong> (chaves, webhooks, ClickUp) e{' '}
                    <strong>exportação filtrada em Reports</strong> (CSV/Excel) fazem parte dos planos{' '}
                    <strong>Pro</strong> e <strong>Business</strong> com assinatura ativa. Você pode revogar credenciais
                    antigas abaixo.
                  </>
                ) : (
                  <>
                    API REST e webhooks exigem plano pago ativo. A aba <strong>Documentação</strong> continua disponível para
                    consulta. Chaves e webhooks existentes podem ser removidos.
                  </>
                )
              ) : section === 'connections' ? (
                <>
                  <strong>Conexões</strong> ligam o Buug a ferramentas como o ClickUp — em poucos passos, sem
                  código. A <strong>API do Buug</strong> é para sistemas próprios, automações e integrações
                  técnicas (chaves, webhooks e documentação).
                </>
              ) : (
                <>
                  Use a API quando outro sistema precisa <strong>ler ou alterar</strong> dados no Buug (REST +
                  chave), ou quando você quer que o Buug <strong>avise uma URL</strong> (webhook) ao ocorrer
                  eventos. Tudo abaixo é opcional e independente do ClickUp.
                </>
              )}
            </Text>
          </Column>

          {integrationLocked && section === 'api' && (
            <Row
              fillWidth
              vertical="center"
              horizontal="between"
              gap="m"
              wrap
              style={{
                padding: '0.625rem 1rem',
                borderRadius: '0.5rem',
                background: 'var(--neutral-alpha-weak)',
                border: '1px solid var(--neutral-border-medium)',
              }}
            >
              <Text variant="body-default-s" onBackground="neutral-strong" style={{ flex: '1 1 12rem' }}>
                API, webhooks e exportação em Reports exigem Pro ou Business ativo — use o upgrade no topo ou abra os planos.
              </Text>
              <Link href="/plans/upgrade" style={{ textDecoration: 'none', flexShrink: 0 }}>
                <Button variant="primary" size="s" label="Ver planos" />
              </Link>
            </Row>
          )}

          <Row gap="xs" wrap style={{ paddingTop: '0.25rem' }}>
            <button
              type="button"
              onClick={() => setSection('connections')}
              style={{
                ...tabButtonStyle(section === 'connections'),
                padding: '0.75rem 1.15rem',
                fontSize: '0.9375rem',
              }}
            >
              Conexões
            </button>
            <button
              type="button"
              onClick={() => setSection('api')}
              style={{
                ...tabButtonStyle(section === 'api'),
                padding: '0.75rem 1.15rem',
                fontSize: '0.9375rem',
              }}
            >
              API do Buug
            </button>
          </Row>

          {section === 'api' && (
            <Row gap="xs" wrap style={{ paddingLeft: '0.15rem' }}>
              {apiSubTabs.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setApiSubTab(tab.key)}
                  style={tabButtonStyle(apiSubTab === tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </Row>
          )}
        </Column>

        {!orgId && (
          <FeedbackAlert variant="warning" title="Selecione uma organização">
            Escolha a organização no menu lateral para usar integrações e API.
          </FeedbackAlert>
        )}

        {section === 'connections' && orgId && (
          <Column gap="l" fillWidth>
            {integrationAllowed && (
              <Text variant="body-default-s" onBackground="neutral-weak" style={{ maxWidth: '36rem' }}>
                Escolha uma ferramenta para conectar. Cada card abre um assistente passo a passo.
              </Text>
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(17.5rem, 1fr))',
                gap: '1rem',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (integrationEntitled === null) return
                  if (!integrationAllowed && !clickUpConnected) {
                    router.push('/plans/upgrade')
                    return
                  }
                  setClickUpWizardKey(k => k + 1)
                  setClickUpModalOpen(true)
                }}
                style={{
                  textAlign: 'left',
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: integrationEntitled === null ? 'wait' : 'pointer',
                  borderRadius: '0.75rem',
                }}
              >
                <Card
                  fillWidth
                  padding="l"
                  radius="l"
                  style={{
                    height: '100%',
                    border:
                      integrationAllowed || clickUpConnected
                        ? '2px solid var(--brand-border-medium)'
                        : '1px solid var(--neutral-border-medium)',
                    background:
                      integrationAllowed || clickUpConnected
                        ? 'linear-gradient(145deg, var(--brand-alpha-weak) 0%, var(--surface-background) 50%)'
                        : 'var(--surface-background)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
                    opacity: !integrationAllowed && !clickUpConnected ? 0.92 : 1,
                  }}
                >
                  <Column gap="m" fillWidth>
                    <Row horizontal="between" vertical="start" fillWidth>
                      <img src="/integrations/clickup.svg" alt="" width={52} height={52} />
                      {clickUpConnected ? (
                        <Tag variant="success" size="s" label="Conectado" />
                      ) : integrationAllowed ? (
                        <Tag variant="neutral" size="s" label="Disponível" />
                      ) : null}
                    </Row>
                    <Column gap="xs">
                      <Text variant="heading-strong-s" as="h2" style={{ margin: 0 }}>
                        ClickUp
                      </Text>
                      <Text variant="body-default-s" onBackground="neutral-weak">
                        Reports viram tarefas no ClickUp com status, prioridade e prazo. Crie automações: projetos Buug → lista (workspace, espaço, lista) — várias regras por organização.
                      </Text>
                    </Column>
                    <Row vertical="center" horizontal="between" fillWidth>
                      <Text
                        variant="label-default-s"
                        style={{
                          color:
                            integrationAllowed || clickUpConnected
                              ? 'var(--brand-on-background-strong)'
                              : 'var(--neutral-on-background-weak)',
                        }}
                      >
                        {!integrationAllowed && !clickUpConnected ? 'Ver planos →' : 'Configurar →'}
                      </Text>
                      <Icon name="chevronRight" size="s" />
                    </Row>
                  </Column>
                </Card>
              </button>

              <Card
                fillWidth
                padding="l"
                radius="l"
                style={{
                  opacity: 0.55,
                  border: '1px dashed var(--neutral-border-medium)',
                  background: 'var(--neutral-alpha-weak)',
                  minHeight: '11rem',
                }}
              >
                <Column gap="m" fillWidth horizontal="center" vertical="center" style={{ minHeight: '9rem' }}>
                  <Icon name="plus" size="l" />
                  <Column gap="xs" horizontal="center">
                    <Text variant="heading-strong-s" as="h3" style={{ margin: 0, textAlign: 'center' }}>
                      Mais conexões
                    </Text>
                    <Text variant="body-default-s" onBackground="neutral-weak" style={{ textAlign: 'center' }}>
                      Em breve: outras ferramentas no mesmo lugar.
                    </Text>
                  </Column>
                </Column>
              </Card>
            </div>

            {clickUpModalOpen && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Integração ClickUp"
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 'clamp(0.75rem, 3vw, 1.25rem)',
                  isolation: 'isolate',
                }}
              >
                {/* Camada escura só atrás do cartão (z-index & stopPropagation no painel evitam cliques “fantasma”) */}
                <div
                  role="presentation"
                  aria-hidden="true"
                  onClick={() => setClickUpModalOpen(false)}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 0,
                    cursor: 'pointer',
                    background: 'rgba(0,0,0,0.45)',
                  }}
                />
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    maxWidth: 'min(36rem, 100%)',
                    width: '100%',
                    maxHeight: 'min(92vh, 720px)',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    background: 'var(--surface-background)',
                    border: '1px solid var(--neutral-border-medium)',
                    borderRadius: 'var(--radius-l, 12px)',
                    boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
                    overflow: 'hidden',
                  }}
                >
                  <Column
                    gap="m"
                    fillWidth
                    padding="l"
                    style={{
                      flex: 1,
                      minHeight: 0,
                      overflow: 'hidden',
                      WebkitOverflowScrolling: 'touch',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        overflow: 'auto',
                        WebkitOverflowScrolling: 'touch',
                      }}
                    >
                      <ClickUpSetup
                        key={clickUpWizardKey}
                        orgId={orgId}
                        integrationEntitled={integrationAllowed}
                        prefillAutomationProjectId={clickUpPrefillProjectId}
                        onPrefillAutomationConsumed={() => setClickUpPrefillProjectId(null)}
                        onConnectionChange={refreshClickUpStatus}
                        onClose={() => {
                          setClickUpModalOpen(false)
                          refreshClickUpStatus()
                        }}
                      />
                    </div>
                  </Column>
                </div>
              </div>
            )}
          </Column>
        )}

        {section === 'connections' && !orgId && (
          <Card fillWidth padding="xl" radius="l" style={{ textAlign: 'center' }}>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Selecione uma organização para configurar conexões como o ClickUp.
            </Text>
          </Card>
        )}

        {section === 'api' && apiSubTab === 'keys' && orgId && (
          <Column gap="l" fillWidth>
            {integrationLoading && (
              <Text variant="body-default-s" onBackground="neutral-weak">
                A verificar o plano da organização…
              </Text>
            )}

            {integrationAllowed && (
              <Card fillWidth padding="l" radius="l" style={{ border: '1px solid var(--neutral-border-medium)' }}>
                <Column gap="m">
                  <Text variant="heading-strong-s" as="h2">
                    Como usar — em 4 passos
                  </Text>
                  <ol style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--neutral-on-background-weak)', fontSize: '0.875rem', lineHeight: 1.7 }}>
                    <li>Escolha um nome que descreva onde a chave será usada.</li>
                    <li>Clique em <strong>Criar chave</strong> e copie o valor na hora — ele não volta a aparecer.</li>
                    <li>No outro sistema, configure o cabeçalho <code style={{ fontSize: '0.8em' }}>Authorization: Bearer …</code> com essa chave.</li>
                    <li>Chame os endereços da API (veja a aba Documentação). Limite: até 100 requisições por minuto por chave.</li>
                  </ol>
                  <FeedbackAlert variant="danger" title="Segurança">
                    Não envie a chave por e-mail, chat público ou prints. Se vazar, revogue e crie outra.
                  </FeedbackAlert>
                </Column>
              </Card>
            )}

            {newKeyValue && integrationAllowed && (
              <Card fillWidth padding="l" radius="l" style={{ background: 'var(--success-alpha-weak)', border: '1px solid var(--success-border-medium)' }}>
                <Column gap="s">
                  <Text variant="label-default-s" onBackground="success-strong">
                    Chave criada com sucesso
                  </Text>
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    Copie agora e guarde em um cofre de senhas ou variável segura do seu sistema. Esta chave não será exibida de novo.
                  </Text>
                  <Row gap="s" vertical="center">
                    <code
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem',
                        background: 'var(--surface-background)',
                        border: '1px solid var(--neutral-border-medium)',
                        fontSize: '0.75rem',
                        fontFamily: 'ui-monospace, monospace',
                        wordBreak: 'break-all',
                      }}
                    >
                      {newKeyValue}
                    </code>
                    <Button
                      size="s"
                      variant={keyCopied ? 'secondary' : 'primary'}
                      label={keyCopied ? 'Copiado!' : 'Copiar'}
                      onClick={() => copyToClipboard(newKeyValue)}
                    />
                  </Row>
                  <Button size="s" variant="tertiary" label="Entendi, fechar" onClick={() => setNewKeyValue(null)} />
                </Column>
              </Card>
            )}

            {integrationAllowed && (
              <Card fillWidth padding="l" radius="l">
                <Column gap="m">
                  <Text variant="heading-strong-s">Criar nova chave</Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    As chaves criadas aqui podem ler projetos e reports e atualizar status/prazos dos reports, de acordo com as permissões padrão desta tela.
                  </Text>
                  <Row gap="s" vertical="end" fillWidth wrap>
                    <div style={{ flex: '1 1 12rem' }}>
                      <label
                        htmlFor="integration-key-name"
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--neutral-on-background-weak)',
                          display: 'block',
                          marginBottom: '0.25rem',
                        }}
                      >
                        Nome para você lembrar
                      </label>
                      <input
                        id="integration-key-name"
                        type="text"
                        placeholder="Ex.: Planilha Google / N8N / Sistema interno"
                        value={newKeyName}
                        onChange={e => setNewKeyName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreateKey()}
                        style={inputStyle}
                      />
                    </div>
                    <Button
                      size="m"
                      variant="primary"
                      label="Criar chave"
                      onClick={handleCreateKey}
                      loading={creatingKey}
                      disabled={!newKeyName.trim()}
                    />
                  </Row>
                </Column>
              </Card>
            )}

            <Column gap="s" fillWidth>
              <Text variant="label-default-s" onBackground="neutral-weak">
                {integrationLocked ? 'Chaves existentes (pode revogar)' : keysLoading ? 'Carregando…' : `${apiKeys.length} ${apiKeys.length === 1 ? 'chave' : 'chaves'} cadastrada(s)`}
              </Text>
              {apiKeys.map(key => (
                <Card key={key.id} fillWidth padding="m" radius="l">
                  <Row fillWidth horizontal="between" vertical="center" gap="m" wrap>
                    <Column gap="xs" style={{ minWidth: 0 }}>
                      <Row gap="s" vertical="center" wrap>
                        <Text variant="body-default-s" style={{ fontWeight: 600 }}>
                          {key.name}
                        </Text>
                        <code
                          style={{
                            fontSize: '0.6875rem',
                            fontFamily: 'ui-monospace, monospace',
                            padding: '0.125rem 0.375rem',
                            borderRadius: '0.25rem',
                            background: 'var(--neutral-alpha-weak)',
                            color: 'var(--neutral-on-background-weak)',
                          }}
                        >
                          {key.prefix}…
                        </code>
                      </Row>
                      <Row gap="m" wrap>
                        <Text variant="body-default-xs" onBackground="neutral-weak">
                          Criada {timeAgo(key.createdAt)}
                        </Text>
                        {key.lastUsedAt && (
                          <Text variant="body-default-xs" onBackground="neutral-weak">
                            Último uso: {timeAgo(key.lastUsedAt)}
                          </Text>
                        )}
                      </Row>
                      <Row gap="xs" wrap>
                        {key.permissions.map(p => (
                          <Tag key={p} variant="neutral" size="s" label={PERMISSION_LABELS[p] || p} />
                        ))}
                      </Row>
                    </Column>
                    <button
                      type="button"
                      onClick={() => handleDeleteKey(key.id)}
                      style={{
                        padding: '0.375rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--danger-border-medium)',
                        background: 'transparent',
                        color: 'var(--danger-on-background-strong)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}
                    >
                      Revogar chave
                    </button>
                  </Row>
                </Card>
              ))}
              {apiKeys.length === 0 && !keysLoading && (
                <Card fillWidth padding="l" radius="l" style={{ textAlign: 'center' }}>
                  <Column gap="s" horizontal="center">
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {integrationAllowed
                        ? 'Nenhuma chave ainda. Crie uma acima para começar a integrar.'
                        : integrationLocked
                          ? 'Nenhuma chave cadastrada.'
                          : 'A carregar…'}
                    </Text>
                    <Button
                      size="s"
                      variant="tertiary"
                      label="Ver documentação da API"
                      onClick={() => {
                        setSection('api')
                        setApiSubTab('docs')
                      }}
                    />
                  </Column>
                </Card>
              )}
            </Column>

            {integrationAllowed && (
              <Card fillWidth padding="l" radius="l" style={{ background: 'var(--neutral-alpha-weak)' }}>
                <Column gap="s">
                  <Text variant="label-default-s">Exemplo rápido (teste no terminal)</Text>
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    Troque <code style={{ fontSize: '0.8em' }}>SUA_CHAVE_AQUI</code> pela chave que você copiou. O endereço abaixo usa o mesmo site que você está acessando agora.
                  </Text>
                  <code style={codeBlockStyle}>{curlExample}</code>
                </Column>
              </Card>
            )}
          </Column>
        )}

        {section === 'api' && apiSubTab === 'webhooks' && orgId && (
          <Column gap="l" fillWidth>
            {integrationLoading && (
              <Text variant="body-default-s" onBackground="neutral-weak">
                A verificar o plano da organização…
              </Text>
            )}

            {integrationAllowed && (
              <Card fillWidth padding="l" radius="l" style={{ border: '1px solid var(--neutral-border-medium)' }}>
                <Column gap="m">
                  <Text variant="heading-strong-s" as="h2">
                    Como funcionam os avisos automáticos
                  </Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Imagine um <strong>sininho</strong>: quando algo muda no Buug, enviamos uma mensagem JSON para a URL
                    que você cadastrou. Seu servidor (ou ferramenta de automação) lê o JSON e decide o que fazer.
                  </Text>
                  <ol style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--neutral-on-background-weak)', fontSize: '0.875rem', lineHeight: 1.7 }}>
                    <li>Obtenha uma URL que aceite requisições <code style={{ fontSize: '0.8em' }}>POST</code> com corpo JSON (muitas plataformas chamam isso de “webhook URL”).</li>
                    <li>Cole a URL aqui e marque os eventos desejados.</li>
                    <li>Após criar, guarde o <strong>segredo</strong> — ele serve para verificar o cabeçalho <code style={{ fontSize: '0.8em' }}>X-Buug-Signature</code>.</li>
                    <li>Responda com código HTTP 2xx para indicar que recebeu bem; outros códigos são tratados como falha na entrega.</li>
                  </ol>
                </Column>
              </Card>
            )}

            {newWebhookSecret && integrationAllowed && (
              <Card fillWidth padding="l" radius="l" style={{ background: 'var(--success-alpha-weak)', border: '1px solid var(--success-border-medium)' }}>
                <Column gap="s">
                  <Text variant="label-default-s" onBackground="success-strong">
                    Webhook criado
                  </Text>
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    Copie o segredo abaixo. Ele não será mostrado de novo. Use-o no seu servidor para confirmar que o aviso veio do Buug (veja a documentação).
                  </Text>
                  <Row gap="s" vertical="center">
                    <code
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem',
                        background: 'var(--surface-background)',
                        border: '1px solid var(--neutral-border-medium)',
                        fontSize: '0.75rem',
                        fontFamily: 'ui-monospace, monospace',
                        wordBreak: 'break-all',
                      }}
                    >
                      {newWebhookSecret}
                    </code>
                    <Button size="s" variant="primary" label="Copiar" onClick={() => copyToClipboard(newWebhookSecret)} />
                  </Row>
                  <Button size="s" variant="tertiary" label="Fechar" onClick={() => setNewWebhookSecret(null)} />
                </Column>
              </Card>
            )}

            {integrationAllowed && (
            <Card fillWidth padding="l" radius="l">
              <Column gap="m">
                <Text variant="heading-strong-s">Cadastrar novo webhook</Text>
                <div>
                  <label
                    htmlFor="webhook-url"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--neutral-on-background-weak)',
                      display: 'block',
                      marginBottom: '0.25rem',
                    }}
                  >
                    URL que receberá os avisos
                  </label>
                  <input
                    id="webhook-url"
                    type="url"
                    placeholder="https://exemplo.com/caminho/do-webhook"
                    value={newWebhookUrl}
                    onChange={e => setNewWebhookUrl(e.target.value)}
                    style={inputStyle}
                  />
                  <Text variant="body-default-xs" onBackground="neutral-weak" style={{ marginTop: '0.35rem' }}>
                    Deve ser um endereço público em HTTPS (recomendado) acessível a partir da internet.
                  </Text>
                </div>
                <div>
                  <Text
                    variant="label-default-s"
                    onBackground="neutral-weak"
                    style={{ display: 'block', marginBottom: '0.375rem' }}
                  >
                    Quando avisar?
                  </Text>
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                    {Object.entries(EVENT_LABELS).map(([value, label]) => {
                      const isActive = newWebhookEvents.includes(value)
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            if (value === '*') {
                              setNewWebhookEvents(['*'])
                            } else {
                              setNewWebhookEvents(prev => {
                                const without = prev.filter(e => e !== '*')
                                return isActive ? without.filter(e => e !== value) : [...without, value]
                              })
                            }
                          }}
                          style={{
                            padding: '0.35rem 0.65rem',
                            borderRadius: '0.375rem',
                            border: isActive ? '1px solid var(--brand-border-strong)' : '1px solid var(--neutral-border-medium)',
                            background: isActive ? 'var(--brand-alpha-weak)' : 'transparent',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'var(--neutral-on-background-strong)',
                          }}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <Button
                  size="m"
                  variant="primary"
                  label="Criar webhook"
                  onClick={handleCreateWebhook}
                  loading={creatingWebhook}
                  disabled={!newWebhookUrl.trim() || newWebhookEvents.length === 0}
                />
              </Column>
            </Card>
            )}

            <Column gap="s" fillWidth>
              <Text variant="label-default-s" onBackground="neutral-weak">
                {integrationLocked ? 'Webhooks existentes (pode remover)' : webhooksLoading ? 'Carregando…' : `${webhooks.length} ${webhooks.length === 1 ? 'webhook' : 'webhooks'} cadastrado(s)`}
              </Text>
              {webhooks.map(wh => (
                <Card key={wh.id} fillWidth padding="m" radius="l">
                  <Row fillWidth horizontal="between" vertical="center" gap="m" wrap>
                    <Column gap="xs" style={{ minWidth: 0 }}>
                      <code
                        style={{
                          fontSize: '0.75rem',
                          fontFamily: 'ui-monospace, monospace',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'var(--neutral-on-background-strong)',
                          display: 'block',
                          maxWidth: '100%',
                        }}
                        title={wh.url}
                      >
                        {wh.url}
                      </code>
                      <Row gap="xs" wrap>
                        {wh.events.map(e => (
                          <Tag key={e} variant="neutral" size="s" label={EVENT_LABELS[e] || e} />
                        ))}
                      </Row>
                      <Text variant="body-default-xs" onBackground="neutral-weak">
                        Criado {timeAgo(wh.createdAt)}
                      </Text>
                    </Column>
                    <button
                      type="button"
                      onClick={() => handleDeleteWebhook(wh.id)}
                      style={{
                        padding: '0.375rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--danger-border-medium)',
                        background: 'transparent',
                        color: 'var(--danger-on-background-strong)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        flexShrink: 0,
                      }}
                    >
                      Remover
                    </button>
                  </Row>
                </Card>
              ))}
              {webhooks.length === 0 && !webhooksLoading && (
                <Text variant="body-default-s" onBackground="neutral-weak" style={{ textAlign: 'center', padding: '1.25rem 0' }}>
                  {integrationAllowed
                    ? 'Nenhum webhook ainda. Quando criar, um exemplo de corpo aparece na documentação.'
                    : 'Nenhum webhook cadastrado.'}
                </Text>
              )}
            </Column>
          </Column>
        )}

        {section === 'api' && apiSubTab === 'docs' && (
          <Column gap="m" fillWidth>
            {integrationLocked && orgId && (
              <Row
                fillWidth
                vertical="center"
                horizontal="between"
                gap="m"
                wrap
                style={{
                  padding: '0.5rem 0.875rem',
                  borderRadius: '0.5rem',
                  background: 'var(--neutral-alpha-weak)',
                  border: '1px solid var(--neutral-border-medium)',
                }}
              >
                <Text variant="body-default-s" onBackground="neutral-strong" style={{ flex: '1 1 10rem' }}>
                  Os exemplos abaixo só funcionam com chave ativa no Pro ou Business.
                </Text>
                <Link href="/plans/upgrade" style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <Button variant="secondary" size="s" label="Planos" />
                </Link>
              </Row>
            )}
            <IntegrationsDocsReference apiBase={apiBaseDisplay} docPage={docPage} setDocPage={setDocPage} />
          </Column>
        )}

        {section === 'api' && (apiSubTab === 'keys' || apiSubTab === 'webhooks') && !orgId && (
          <Card fillWidth padding="xl" radius="l" style={{ textAlign: 'center' }}>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Selecione uma organização para usar esta seção, ou abra a{' '}
              <button
                type="button"
                onClick={() => {
                  setSection('api')
                  setApiSubTab('docs')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--brand-on-background-strong)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Documentação
              </button>{' '}
              para ler o guia.
            </Text>
          </Card>
        )}
      </Column>
    </AppLayout>
  )
}
