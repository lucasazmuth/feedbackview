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

type MainTab = 'overview' | 'keys' | 'webhooks' | 'clickup' | 'docs'

export default function IntegrationsClient({ userId: _userId }: { userId: string }) {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id

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

  const [activeTab, setActiveTab] = useState<MainTab>('overview')
  const [docPage, setDocPage] = useState<DocPageId>('intro')

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

  const tabs: { key: MainTab; label: string }[] = [
    { key: 'overview', label: 'Visão geral' },
    { key: 'clickup', label: 'ClickUp' },
    { key: 'keys', label: 'Chaves de acesso' },
    { key: 'webhooks', label: 'Avisos automáticos' },
    { key: 'docs', label: 'Documentação' },
  ]

  const curlExample = `curl -H "Authorization: Bearer SUA_CHAVE_AQUI" \\
  "${apiBaseDisplay}/feedbacks?status=OPEN"`

  return (
    <AppLayout>
      <Column
        as="main"
        fillWidth
        paddingX="l"
        paddingY="m"
        gap="l"
        style={{ maxWidth: activeTab === 'docs' ? 'min(100%, 72rem)' : '56rem' }}
      >
        <Column gap="m">
          <Column gap="xs">
            <Heading variant="heading-strong-l" as="h1">
              Integrações
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ maxWidth: '40rem' }}>
              Conecte o Buug a outras ferramentas (planilhas, CRM, automações ou sistemas próprios). Abaixo
              explicamos tudo em linguagem simples — você não precisa ser programador para entender o que cada
              opção faz.
            </Text>
          </Column>

          <Row gap="xs" wrap style={{ paddingTop: '0.25rem' }}>
            {tabs.map(tab => (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} style={tabButtonStyle(activeTab === tab.key)}>
                {tab.label}
              </button>
            ))}
          </Row>
        </Column>

        {!orgId && (
          <FeedbackAlert variant="warning" title="Selecione uma organização">
            Escolha a organização no menu lateral para gerenciar chaves e webhooks.
          </FeedbackAlert>
        )}

        {activeTab === 'overview' && (
          <Column gap="l" fillWidth>
            <Card fillWidth padding="l" radius="l" style={{ background: 'var(--neutral-alpha-weak)' }}>
              <Column gap="s">
                <Text variant="heading-strong-s" as="h2">
                  Em duas frases: o que você pode fazer aqui?
                </Text>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  <strong>Chave de acesso</strong> é como uma senha que um sistema usa para <em>consultar ou
                  alterar</em> dados no Buug pela internet. <strong>Aviso automático (webhook)</strong> é o
                  contrário: o Buug <em>avisar o seu sistema</em> quando algo importante acontece (por exemplo,
                  um novo report).
                </Text>
              </Column>
            </Card>

            <Row gap="m" fillWidth vertical="stretch" style={{ flexWrap: 'wrap' }}>
              <Card fillWidth padding="l" radius="l" style={{ flex: '1 1 280px', minWidth: 0 }}>
                <Column gap="m">
                  <Row gap="s" vertical="center">
                    <Icon name="code" size="m" />
                    <Text variant="heading-strong-s" as="h3">
                      Chaves de acesso (API)
                    </Text>
                  </Row>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Use quando <strong>outro programa precisa buscar projetos, listar reports ou atualizar
                    status</strong> — por exemplo integração com ferramenta interna, script ou plataforma no-code
                    que aceita cabeçalho HTTP.
                  </Text>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--neutral-on-background-weak)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                    <li>Você cria um nome para lembrar para que serve (ex.: “Automação Zapier”).</li>
                    <li>O Buug mostra a chave <strong>uma única vez</strong> — guarde em local seguro.</li>
                    <li>Quem tiver a chave pode agir no nome da sua organização: trate como senha.</li>
                  </ul>
                  <Button size="m" variant="primary" label="Ir para chaves de acesso" onClick={() => setActiveTab('keys')} />
                </Column>
              </Card>

              <Card fillWidth padding="l" radius="l" style={{ flex: '1 1 280px', minWidth: 0 }}>
                <Column gap="m">
                  <Row gap="s" vertical="center">
                    <Icon name="openLink" size="m" />
                    <Text variant="heading-strong-s" as="h3">
                      Avisos automáticos (webhooks)
                    </Text>
                  </Row>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Use quando <strong>você quer que um endereço na internet receba um aviso</strong> sempre que
                    ocorrer um evento (novo report, mudança de status, etc.). Quem recebe processa o JSON e pode
                    disparar e-mail, Slack, banco de dados, etc.
                  </Text>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--neutral-on-background-weak)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                    <li>Você informa a <strong>URL</strong> que deve receber o POST (gerada pelo seu sistema ou por um serviço de automação).</li>
                    <li>Escolhe <strong>quais eventos</strong> interessam.</li>
                    <li>Na criação, copie o <strong>segredo</strong> para conferir se o aviso veio mesmo do Buug.</li>
                  </ul>
                  <Button size="m" variant="secondary" label="Ir para avisos automáticos" onClick={() => setActiveTab('webhooks')} />
                </Column>
              </Card>
            </Row>

            <Card fillWidth padding="l" radius="l">
              <Row gap="m" vertical="center" horizontal="between" fillWidth wrap>
                <Column gap="xs" style={{ flex: '1 1 200px' }}>
                  <Text variant="heading-strong-s">Precisa do passo a passo técnico?</Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Na aba Documentação há exemplos de requisição, parâmetros, limites e como validar assinaturas.
                  </Text>
                </Column>
                <Button size="m" variant="tertiary" label="Abrir documentação" onClick={() => setActiveTab('docs')} />
              </Row>
            </Card>
          </Column>
        )}

        {activeTab === 'clickup' && orgId && (
          <ClickUpSetup orgId={orgId} />
        )}

        {activeTab === 'clickup' && !orgId && (
          <Card fillWidth padding="xl" radius="l" style={{ textAlign: 'center' }}>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Selecione uma organização para configurar o ClickUp.
            </Text>
          </Card>
        )}

        {activeTab === 'keys' && orgId && (
          <Column gap="l" fillWidth>
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

            {newKeyValue && (
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

            <Column gap="s" fillWidth>
              <Text variant="label-default-s" onBackground="neutral-weak">
                {keysLoading ? 'Carregando…' : `${apiKeys.length} ${apiKeys.length === 1 ? 'chave' : 'chaves'} cadastrada(s)`}
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
                <Card fillWidth padding="xl" radius="l" style={{ textAlign: 'center' }}>
                  <Column gap="s" horizontal="center">
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      Nenhuma chave ainda. Crie uma acima para começar a integrar.
                    </Text>
                    <Button size="s" variant="tertiary" label="Ver documentação da API" onClick={() => setActiveTab('docs')} />
                  </Column>
                </Card>
              )}
            </Column>

            <Card fillWidth padding="l" radius="l" style={{ background: 'var(--neutral-alpha-weak)' }}>
              <Column gap="s">
                <Text variant="label-default-s">Exemplo rápido (teste no terminal)</Text>
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  Troque <code style={{ fontSize: '0.8em' }}>SUA_CHAVE_AQUI</code> pela chave que você copiou. O endereço abaixo usa o mesmo site que você está acessando agora.
                </Text>
                <code style={codeBlockStyle}>{curlExample}</code>
              </Column>
            </Card>
          </Column>
        )}

        {activeTab === 'webhooks' && orgId && (
          <Column gap="l" fillWidth>
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

            {newWebhookSecret && (
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

            <Column gap="s" fillWidth>
              <Text variant="label-default-s" onBackground="neutral-weak">
                {webhooksLoading ? 'Carregando…' : `${webhooks.length} ${webhooks.length === 1 ? 'webhook' : 'webhooks'} cadastrado(s)`}
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
                <Text variant="body-default-s" onBackground="neutral-weak" style={{ textAlign: 'center', padding: '2rem 0' }}>
                  Nenhum webhook ainda. Quando criar, um exemplo de corpo aparece na documentação.
                </Text>
              )}
            </Column>
          </Column>
        )}

        {activeTab === 'docs' && (
          <IntegrationsDocsReference apiBase={apiBaseDisplay} docPage={docPage} setDocPage={setDocPage} />
        )}

        {(activeTab === 'keys' || activeTab === 'webhooks') && !orgId && (
          <Card fillWidth padding="xl" radius="l" style={{ textAlign: 'center' }}>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Selecione uma organização para usar esta seção, ou abra a <button type="button" onClick={() => setActiveTab('docs')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--brand-on-background-strong)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>Documentação</button> para ler o guia.
            </Text>
          </Card>
        )}
      </Column>
    </AppLayout>
  )
}
