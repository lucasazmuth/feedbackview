'use client'

import { useState, useEffect, useCallback } from 'react'
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

export default function IntegrationsClient({ userId }: { userId: string }) {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([])
  const [keysLoading, setKeysLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)

  // Webhooks state
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([])
  const [webhooksLoading, setWebhooksLoading] = useState(true)
  const [newWebhookUrl, setNewWebhookUrl] = useState('')
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['feedback.created'])
  const [creatingWebhook, setCreatingWebhook] = useState(false)
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'keys' | 'webhooks'>('keys')

  // Fetch data
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

  // Create API key
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
      }
    } catch {}
    setCreatingKey(false)
  }

  // Delete API key
  const handleDeleteKey = async (keyId: string) => {
    if (!orgId) return
    await fetch('/api/keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: keyId, orgId }),
    })
    fetchKeys()
  }

  // Create webhook
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
      }
    } catch {}
    setCreatingWebhook(false)
  }

  // Delete webhook
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
      // Fallback for browsers that block clipboard API
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

  return (
    <AppLayout>
      <Column as="main" fillWidth paddingX="l" paddingY="m" gap="l" style={{ maxWidth: '48rem' }}>
        <Column gap="xs">
          <Heading variant="heading-strong-l" as="h1">Integrações</Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Conecte o Buug às suas ferramentas via API e Webhooks
          </Text>
        </Column>

        {/* Tabs */}
        <Row gap="l" style={{ borderBottom: '2px solid var(--neutral-border-medium)', paddingBottom: 0 }}>
          {[
            { key: 'keys' as const, label: 'API Keys' },
            { key: 'webhooks' as const, label: 'Webhooks' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                paddingBottom: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: activeTab === tab.key ? 'var(--brand-on-background-strong)' : 'var(--neutral-on-background-weak)',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab.key ? 'var(--brand-solid-strong)' : 'transparent'}`,
                cursor: 'pointer',
                marginBottom: '-2px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </Row>

        {/* API Keys Tab */}
        {activeTab === 'keys' && (
          <Column gap="l" fillWidth>
            {/* New key created alert */}
            {newKeyValue && (
              <Card fillWidth padding="l" radius="l" style={{ background: 'var(--success-alpha-weak)', border: '1px solid var(--success-border-medium)' }}>
                <Column gap="s">
                  <Text variant="label-default-s" onBackground="success-strong">API Key criada com sucesso</Text>
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    Copie agora — essa chave não será exibida novamente.
                  </Text>
                  <Row gap="s" vertical="center">
                    <code style={{
                      flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                      background: 'var(--surface-background)', border: '1px solid var(--neutral-border-medium)',
                      fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all',
                    }}>
                      {newKeyValue}
                    </code>
                    <Button
                      size="s"
                      variant={keyCopied ? 'secondary' : 'primary'}
                      label={keyCopied ? 'Copiado!' : 'Copiar'}
                      onClick={() => copyToClipboard(newKeyValue)}
                    />
                  </Row>
                  <Button size="s" variant="tertiary" label="Fechar" onClick={() => setNewKeyValue(null)} />
                </Column>
              </Card>
            )}

            {/* Create key form */}
            <Card fillWidth padding="l" radius="l">
              <Column gap="m">
                <Text variant="heading-strong-s">Criar nova API Key</Text>
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  Use a API Key para autenticar requests à API pública do Buug.
                </Text>
                <Row gap="s" vertical="end" fillWidth>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-on-background-weak)', display: 'block', marginBottom: '0.25rem' }}>
                      Nome da chave
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Integração ClickUp"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                      style={{
                        width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                        border: '1px solid var(--neutral-border-medium)', background: 'var(--surface-background)',
                        color: 'var(--neutral-on-background-strong)', fontSize: '0.875rem', outline: 'none',
                      }}
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

            {/* Existing keys */}
            <Column gap="s" fillWidth>
              <Text variant="label-default-s" onBackground="neutral-weak">
                {apiKeys.length} {apiKeys.length === 1 ? 'chave ativa' : 'chaves ativas'}
              </Text>
              {apiKeys.map(key => (
                <Card key={key.id} fillWidth padding="m" radius="l">
                  <Row fillWidth horizontal="between" vertical="center">
                    <Column gap="xs">
                      <Row gap="s" vertical="center">
                        <Text variant="body-default-s" style={{ fontWeight: 600 }}>{key.name}</Text>
                        <code style={{
                          fontSize: '0.6875rem', fontFamily: 'monospace', padding: '0.125rem 0.375rem',
                          borderRadius: '0.25rem', background: 'var(--neutral-alpha-weak)',
                          color: 'var(--neutral-on-background-weak)',
                        }}>
                          {key.prefix}...
                        </code>
                      </Row>
                      <Row gap="m">
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
                      onClick={() => handleDeleteKey(key.id)}
                      style={{
                        padding: '0.375rem 0.75rem', borderRadius: '0.5rem',
                        border: '1px solid var(--danger-border-medium)', background: 'transparent',
                        color: 'var(--danger-on-background-strong)', cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: 500,
                      }}
                    >
                      Revogar
                    </button>
                  </Row>
                </Card>
              ))}
              {apiKeys.length === 0 && !keysLoading && (
                <Text variant="body-default-xs" onBackground="neutral-weak" style={{ textAlign: 'center', padding: '2rem 0' }}>
                  Nenhuma API Key criada ainda.
                </Text>
              )}
            </Column>

            {/* API docs hint */}
            <Card fillWidth padding="l" radius="l" style={{ background: 'var(--neutral-alpha-weak)' }}>
              <Column gap="s">
                <Text variant="label-default-s">Como usar a API</Text>
                <code style={{ fontSize: '0.75rem', fontFamily: 'monospace', display: 'block', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--surface-background)', border: '1px solid var(--neutral-border-medium)', whiteSpace: 'pre-wrap' }}>
{`curl -H "Authorization: Bearer buug_sk_..." \\
  https://buug.io/api/v1/feedbacks?status=OPEN`}
                </code>
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  Endpoints: /api/v1/projects, /api/v1/feedbacks, /api/v1/feedbacks/:id
                </Text>
              </Column>
            </Card>
          </Column>
        )}

        {/* Webhooks Tab */}
        {activeTab === 'webhooks' && (
          <Column gap="l" fillWidth>
            {/* New webhook secret alert */}
            {newWebhookSecret && (
              <Card fillWidth padding="l" radius="l" style={{ background: 'var(--success-alpha-weak)', border: '1px solid var(--success-border-medium)' }}>
                <Column gap="s">
                  <Text variant="label-default-s" onBackground="success-strong">Webhook criado com sucesso</Text>
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    Copie o secret para validar as assinaturas (X-Buug-Signature).
                  </Text>
                  <Row gap="s" vertical="center">
                    <code style={{
                      flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                      background: 'var(--surface-background)', border: '1px solid var(--neutral-border-medium)',
                      fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all',
                    }}>
                      {newWebhookSecret}
                    </code>
                    <Button
                      size="s"
                      variant="primary"
                      label="Copiar"
                      onClick={() => copyToClipboard(newWebhookSecret)}
                    />
                  </Row>
                  <Button size="s" variant="tertiary" label="Fechar" onClick={() => setNewWebhookSecret(null)} />
                </Column>
              </Card>
            )}

            {/* Create webhook form */}
            <Card fillWidth padding="l" radius="l">
              <Column gap="m">
                <Text variant="heading-strong-s">Criar novo Webhook</Text>
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  Receba notificações em tempo real quando eventos acontecem no Buug.
                </Text>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-on-background-weak)', display: 'block', marginBottom: '0.25rem' }}>
                    URL do endpoint
                  </label>
                  <input
                    type="url"
                    placeholder="https://seu-servidor.com/webhook"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    style={{
                      width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                      border: '1px solid var(--neutral-border-medium)', background: 'var(--surface-background)',
                      color: 'var(--neutral-on-background-strong)', fontSize: '0.875rem', outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-on-background-weak)', display: 'block', marginBottom: '0.375rem' }}>
                    Eventos
                  </label>
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                    {Object.entries(EVENT_LABELS).map(([value, label]) => {
                      const isActive = newWebhookEvents.includes(value)
                      return (
                        <button
                          key={value}
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
                            padding: '0.25rem 0.625rem', borderRadius: '0.375rem',
                            border: isActive ? '1px solid var(--brand-border-strong)' : '1px solid var(--neutral-border-medium)',
                            background: isActive ? 'var(--brand-alpha-weak)' : 'transparent',
                            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500,
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

            {/* Existing webhooks */}
            <Column gap="s" fillWidth>
              <Text variant="label-default-s" onBackground="neutral-weak">
                {webhooks.length} {webhooks.length === 1 ? 'webhook ativo' : 'webhooks ativos'}
              </Text>
              {webhooks.map(wh => (
                <Card key={wh.id} fillWidth padding="m" radius="l">
                  <Row fillWidth horizontal="between" vertical="center">
                    <Column gap="xs" style={{ minWidth: 0 }}>
                      <code style={{
                        fontSize: '0.75rem', fontFamily: 'monospace',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        color: 'var(--neutral-on-background-strong)',
                      }}>
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
                      onClick={() => handleDeleteWebhook(wh.id)}
                      style={{
                        padding: '0.375rem 0.75rem', borderRadius: '0.5rem',
                        border: '1px solid var(--danger-border-medium)', background: 'transparent',
                        color: 'var(--danger-on-background-strong)', cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: 500, flexShrink: 0,
                      }}
                    >
                      Remover
                    </button>
                  </Row>
                </Card>
              ))}
              {webhooks.length === 0 && !webhooksLoading && (
                <Text variant="body-default-xs" onBackground="neutral-weak" style={{ textAlign: 'center', padding: '2rem 0' }}>
                  Nenhum webhook criado ainda.
                </Text>
              )}
            </Column>

            {/* Webhook docs hint */}
            <Card fillWidth padding="l" radius="l" style={{ background: 'var(--neutral-alpha-weak)' }}>
              <Column gap="s">
                <Text variant="label-default-s">Payload de exemplo</Text>
                <code style={{ fontSize: '0.6875rem', fontFamily: 'monospace', display: 'block', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--surface-background)', border: '1px solid var(--neutral-border-medium)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
{`POST https://seu-servidor.com/webhook
X-Buug-Event: feedback.created
X-Buug-Signature: sha256=abc123...

{
  "event": "feedback.created",
  "data": {
    "feedbackId": "abc123",
    "type": "BUG",
    "severity": "CRITICAL",
    "comment": "Botão não funciona...",
    "projectName": "Meu Site"
  },
  "timestamp": "2026-03-23T..."
}`}
                </code>
              </Column>
            </Card>
          </Column>
        )}
      </Column>
    </AppLayout>
  )
}
