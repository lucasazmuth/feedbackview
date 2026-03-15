'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  Flex,
  Column,
  Row,
  Grid,
  Heading,
  Text,
  Button,
  IconButton,
  Card,
  Input,
  Textarea,
  Select,
  Tag,
  Icon,
  Feedback as FeedbackAlert,
} from '@once-ui-system/core'
import AppLayout from '@/components/ui/AppLayout'

interface Feedback {
  id: string
  type: string
  severity?: string
  status: string
  comment: string
  screenshotUrl?: string
  createdAt: string
  pageUrl?: string
}

interface Project {
  id: string
  name: string
  url: string
  description?: string
  mode?: string
  widgetPosition?: string
  widgetColor?: string
  createdAt: string
}

interface ProjectClientProps {
  project: Project | null
  feedbacks: Feedback[]
  error: string | null
  userEmail: string
}

const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || 'http://localhost:3002'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getTagVariant(value: string): 'brand' | 'danger' | 'warning' | 'success' | 'neutral' | 'info' {
  const map: Record<string, 'brand' | 'danger' | 'warning' | 'success' | 'neutral' | 'info'> = {
    BUG: 'danger',
    SUGGESTION: 'info',
    QUESTION: 'warning',
    PRAISE: 'success',
    CRITICAL: 'danger',
    HIGH: 'danger',
    MEDIUM: 'warning',
    LOW: 'neutral',
    OPEN: 'warning',
    IN_PROGRESS: 'info',
    RESOLVED: 'success',
    CLOSED: 'neutral',
  }
  return map[value] || 'neutral'
}

function getTypeLabel(type: string) {
  const map: Record<string, string> = { BUG: 'Bug', SUGGESTION: 'Sugestão', QUESTION: 'Dúvida', PRAISE: 'Elogio' }
  return map[type] || type
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = { OPEN: 'Aberto', IN_PROGRESS: 'Em andamento', RESOLVED: 'Resolvido', CLOSED: 'Fechado' }
  return map[status] || status
}

function getSeverityLabel(sev: string) {
  const map: Record<string, string> = { CRITICAL: 'Crítico', HIGH: 'Alto', MEDIUM: 'Médio', LOW: 'Baixo' }
  return map[sev] || sev
}

export default function ProjectClient({
  project,
  feedbacks,
  error,
  userEmail,
}: ProjectClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'feedbacks' | 'settings'>('feedbacks')
  const [copied, setCopied] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(project?.name ?? '')
  const [editUrl, setEditUrl] = useState(project?.url ?? '')
  const [editDescription, setEditDescription] = useState(project?.description ?? '')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editUrlError, setEditUrlError] = useState<string | null>(null)

  // Widget appearance state
  const [widgetPosition, setWidgetPosition] = useState(project?.widgetPosition || 'bottom-right')
  const [widgetColor, setWidgetColor] = useState(project?.widgetColor || '#4f46e5')
  const [appearanceSaving, setAppearanceSaving] = useState(false)
  const [appearanceMsg, setAppearanceMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null)

  async function handleAppearanceSave() {
    if (!project) return
    setAppearanceSaving(true)
    setAppearanceMsg(null)
    try {
      await api.projects.update(project.id, { widgetPosition, widgetColor })
      setAppearanceMsg({ type: 'success', text: 'Aparência atualizada com sucesso!' })
      router.refresh()
    } catch (err: any) {
      setAppearanceMsg({ type: 'danger', text: err.message || 'Erro ao salvar.' })
    } finally {
      setAppearanceSaving(false)
    }
  }

  function handleEditUrlChange(value: string) {
    setEditUrl(value)
    setEditUrlError(null)
  }

  function handleEditUrlBlur() {
    if (!editUrl.trim()) {
      setEditUrlError(null)
      return
    }
    let url = editUrl.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
      setEditUrl(url)
    }
    try {
      const parsed = new URL(url)
      if (!parsed.hostname.includes('.')) {
        setEditUrlError('URL inválida. Exemplo: https://meusite.com.br')
      } else {
        setEditUrlError(null)
      }
    } catch {
      setEditUrlError('URL inválida. Exemplo: https://meusite.com.br')
    }
  }

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [origin, setOrigin] = useState('')
  useEffect(() => {
    setOrigin(`${window.location.protocol}//${window.location.host}`)
  }, [])

  const viewerUrl = origin ? `${origin}/p/${project?.id}` : ''
  const appBase = origin

  const embedSnippet = `<script src="${appBase}/embed.js" data-project="${project?.id}"></script>`

  async function clipboardCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
  }

  async function copyViewerUrl() {
    await clipboardCopy(viewerUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function copyEmbedSnippet() {
    await clipboardCopy(embedSnippet)
    setCopiedEmbed(true)
    setTimeout(() => setCopiedEmbed(false), 2000)
  }

  const filteredFeedbacks = feedbacks.filter((f) => {
    if (typeFilter && f.type !== typeFilter) return false
    if (severityFilter && f.severity !== severityFilter) return false
    if (statusFilter && f.status !== statusFilter) return false
    return true
  })

  const totalCount = feedbacks.length
  const openCount = feedbacks.filter((f) => f.status === 'OPEN').length
  const criticalCount = feedbacks.filter((f) => f.severity === 'CRITICAL').length
  const resolvedCount = feedbacks.filter((f) => f.status === 'RESOLVED').length

  async function handleEditSave() {
    if (!project) return
    if (!editName.trim() || !editUrl.trim()) {
      setEditError('Nome e URL são obrigatórios.')
      return
    }
    // Validate URL
    let url = editUrl.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
      setEditUrl(url)
    }
    try {
      const parsed = new URL(url)
      if (!parsed.hostname.includes('.')) {
        setEditUrlError('URL inválida. Exemplo: https://meusite.com.br')
        return
      }
    } catch {
      setEditUrlError('URL inválida. Exemplo: https://meusite.com.br')
      return
    }
    setEditError(null)
    setEditUrlError(null)
    setEditSaving(true)
    try {
      await api.projects.update(project.id, {
        name: editName.trim(),
        targetUrl: editUrl.trim(),
        description: editDescription.trim() || undefined,
      })
      router.refresh()
      setEditing(false)
    } catch (err: any) {
      setEditError(err.message || 'Erro ao salvar alterações.')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete() {
    if (!project) return
    setDeleteError(null)
    setDeleting(true)
    try {
      await api.projects.delete(project.id)
      router.push('/dashboard')
    } catch (err: any) {
      setDeleteError(err.message || 'Erro ao excluir projeto.')
      setDeleting(false)
    }
  }

  if (!project && error) {
    return (
      <AppLayout>
        <Column fillWidth horizontal="center" vertical="center" style={{ minHeight: '100vh' }}>
          <Column horizontal="center" gap="m">
            <Text variant="body-default-m" onBackground="danger-strong">{error}</Text>
            <Button variant="tertiary" href="/dashboard" label="Voltar ao dashboard" />
          </Column>
        </Column>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <style>{`.filter-select input { padding-top: 8px !important; padding-bottom: 8px !important; }`}</style>
      {/* Header */}
      <Row
        as="header"
        fillWidth
        paddingX="l"
        paddingY="m"
        vertical="center"
        gap="m"
        borderBottom="neutral-medium"
        background="surface"
        style={{ position: 'sticky', top: 0, zIndex: 10 }}
      >
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            color: 'var(--neutral-on-background-weak)',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <Icon name="arrowLeft" size="xs" />
          Projetos
        </Link>
        <Text variant="body-default-s" onBackground="neutral-weak" style={{ flexShrink: 0 }}>/</Text>
        <Text variant="body-default-s" onBackground="neutral-strong" style={{ flexShrink: 0 }}>
          {project?.name}
        </Text>
      </Row>
      <Column fillWidth maxWidth={72} paddingX="l" paddingY="l" gap="l" style={{ margin: '0 auto' }}>
        {/* Project header */}
        <Column gap="xs">
          <Heading variant="heading-strong-xl" as="h1">{project?.name}</Heading>
          <a
            href={project?.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <Row gap="xs" vertical="center">
              <Icon name="openLink" size="xs" />
              <Text variant="body-default-s" onBackground="neutral-weak">{project?.url}</Text>
            </Row>
          </a>
          {project?.description && (
            <Text variant="body-default-s" onBackground="neutral-weak">{project.description}</Text>
          )}
        </Column>

        {/* Viewer URL card */}
        <Card
          fillWidth
          padding="l"
          radius="l"
          style={{ background: 'var(--brand-solid-strong)' }}
        >
          <Column gap="s">
            <Row gap="s" vertical="center">
              <Text
                variant="label-default-s"
                style={{ color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                {(project?.mode ?? 'proxy') === 'proxy' ? 'Link Rápido' : 'Instalação no Site'}
              </Text>
              <span
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  padding: '0.125rem 0.5rem',
                  borderRadius: '1rem',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.85)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                {(project?.mode ?? 'proxy') === 'proxy' ? 'Sem instalação' : 'Recomendado'}
              </span>
            </Row>
            {(project?.mode ?? 'proxy') === 'proxy' ? (
              <>
                <Row gap="s" vertical="center">
                  <Flex
                    fillWidth
                    padding="s"
                    radius="m"
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      fontFamily: 'monospace',
                      fontSize: '0.8125rem',
                      color: 'white',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {viewerUrl}
                  </Flex>
                  <Button
                    variant="secondary"
                    size="s"
                    label={copied ? 'Copiado!' : 'Copiar'}
                    prefixIcon={copied ? 'check' : 'copy'}
                    onClick={copyViewerUrl}
                    style={{ flexShrink: 0 }}
                  />
                </Row>
                <Text
                  variant="body-default-xs"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  Compartilhe esta URL com os QAs para começar a capturar feedbacks.
                </Text>
              </>
            ) : (
              <>
                <Flex fillWidth style={{ position: 'relative' }}>
                  <pre
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.15)',
                      color: '#4ade80',
                      fontSize: '0.75rem',
                      borderRadius: '0.5rem',
                      padding: '0.75rem',
                      overflow: 'auto',
                      fontFamily: 'monospace',
                      margin: 0,
                    }}
                  >
                    {embedSnippet}
                  </pre>
                  <div style={{ position: 'absolute', top: '0.375rem', right: '0.375rem' }}>
                    <Button
                      variant="secondary"
                      size="s"
                      label={copiedEmbed ? 'Copiado!' : 'Copiar'}
                      prefixIcon={copiedEmbed ? 'check' : 'copy'}
                      onClick={copyEmbedSnippet}
                    />
                  </div>
                </Flex>
                <Text
                  variant="body-default-xs"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  Adicione este código ao HTML do seu site para capturar feedbacks.
                </Text>
              </>
            )}
          </Column>
        </Card>

        {/* Metrics */}
        <Grid columns={4} gap="m" fillWidth s={{ columns: 2 }}>
          {[
            { label: 'Total', value: totalCount, dot: 'var(--neutral-solid-medium)' },
            { label: 'Abertos', value: openCount, dot: 'var(--warning-solid-strong)' },
            { label: 'Críticos', value: criticalCount, dot: 'var(--danger-solid-strong)' },
            { label: 'Resolvidos', value: resolvedCount, dot: 'var(--success-solid-strong)' },
          ].map(({ label, value, dot }) => (
            <Card key={label} fillWidth padding="l" radius="l">
              <Column gap="s">
                <Row vertical="center" gap="xs">
                  <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: dot, flexShrink: 0 }} />
                  <Text variant="body-default-xs" onBackground="neutral-weak">{label}</Text>
                </Row>
                <Heading variant="heading-strong-xl" as="h2">{value}</Heading>
              </Column>
            </Card>
          ))}
        </Grid>

        {/* Tabs */}
        <Row gap="l" fillWidth style={{ borderBottom: '2px solid var(--neutral-border-medium)' }}>
          {[
            { key: 'feedbacks' as const, label: 'Caixa de entrada', count: totalCount },
            { key: 'settings' as const, label: 'Configurações', count: undefined },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                paddingBottom: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: activeTab === tab.key ? 'var(--brand-on-background-strong)' : 'var(--neutral-on-background-weak)',
                background: 'none',
                border: 'none',
                borderBottomStyle: 'solid' as const,
                borderBottomWidth: '2px',
                borderBottomColor: activeTab === tab.key ? 'var(--brand-solid-strong)' : 'transparent',
                cursor: 'pointer',
                marginBottom: '-2px',
              }}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  style={{
                    fontSize: '0.6875rem',
                    background: activeTab === tab.key ? 'var(--brand-alpha-weak)' : 'var(--neutral-alpha-weak)',
                    color: activeTab === tab.key ? 'var(--brand-on-background-strong)' : 'var(--neutral-on-background-weak)',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '999px',
                    fontWeight: 500,
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </Row>

        {/* Feedbacks tab */}
        {activeTab === 'feedbacks' && (
          <Column gap="l" fillWidth>
            {/* Filters */}
            <Row gap="s" vertical="center" wrap>
              <Row gap="xs" vertical="center">
                <Icon name="filter" size="xs" />
                <Text variant="body-default-xs" onBackground="neutral-weak" style={{ fontWeight: 500 }}>Filtrar:</Text>
              </Row>
              <Flex className="filter-select" style={{ width: '10rem' }}>
                <Select
                  id="type-filter"
                  label=""
                  options={[
                    { value: '', label: 'Todos os tipos' },
                    { value: 'BUG', label: 'Bug' },
                    { value: 'SUGGESTION', label: 'Sugestão' },
                    { value: 'QUESTION', label: 'Dúvida' },
                    { value: 'PRAISE', label: 'Elogio' },
                  ]}
                  value={typeFilter}
                  onSelect={(value) => setTypeFilter(value)}
                />
              </Flex>
              <Flex className="filter-select" style={{ width: '11rem' }}>
                <Select
                  id="severity-filter"
                  label=""
                  options={[
                    { value: '', label: 'Todas severidades' },
                    { value: 'CRITICAL', label: 'Crítico' },
                    { value: 'HIGH', label: 'Alto' },
                    { value: 'MEDIUM', label: 'Médio' },
                    { value: 'LOW', label: 'Baixo' },
                  ]}
                  value={severityFilter}
                  onSelect={(value) => setSeverityFilter(value)}
                />
              </Flex>
              <Flex className="filter-select" style={{ width: '10rem' }}>
                <Select
                  id="status-filter"
                  label=""
                  options={[
                    { value: '', label: 'Todos os status' },
                    { value: 'OPEN', label: 'Aberto' },
                    { value: 'IN_PROGRESS', label: 'Em andamento' },
                    { value: 'RESOLVED', label: 'Resolvido' },
                    { value: 'CLOSED', label: 'Fechado' },
                  ]}
                  value={statusFilter}
                  onSelect={(value) => setStatusFilter(value)}
                />
              </Flex>
            </Row>

            {filteredFeedbacks.length === 0 ? (
              <Card fillWidth padding="xl" radius="l" style={{ textAlign: 'center' }}>
                <Column horizontal="center" gap="m" paddingY="l">
                  <Flex
                    horizontal="center"
                    vertical="center"
                    radius="full"
                    style={{
                      width: '3rem',
                      height: '3rem',
                      background: 'var(--neutral-alpha-weak)',
                    }}
                  >
                    <Icon name="message" size="m" />
                  </Flex>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {feedbacks.length === 0
                      ? 'Nenhum feedback ainda. Compartilhe a URL do visualizador!'
                      : 'Nenhum feedback com os filtros selecionados.'}
                  </Text>
                </Column>
              </Card>
            ) : (
              <Column gap="s" fillWidth>
                {filteredFeedbacks.map((feedback) => (
                  <Card
                    key={feedback.id}
                    fillWidth
                    padding="m"
                    radius="l"
                    href={`/feedbacks/${feedback.id}`}
                    style={{ transition: 'box-shadow 0.15s ease' }}
                  >
                    <Row gap="m" vertical="center">
                      {feedback.screenshotUrl && (
                        <Flex style={{ flexShrink: 0 }}>
                          <img
                            src={feedback.screenshotUrl}
                            alt="Screenshot"
                            style={{
                              width: '5rem',
                              height: '3.5rem',
                              objectFit: 'cover',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--neutral-border-medium)',
                            }}
                          />
                        </Flex>
                      )}
                      <Column gap="s" fillWidth style={{ minWidth: 0 }}>
                        <Row gap="xs" wrap vertical="center">
                          <Tag variant={getTagVariant(feedback.type)} size="s" label={getTypeLabel(feedback.type)} />
                          {feedback.severity && (
                            <Tag variant={getTagVariant(feedback.severity)} size="s" label={getSeverityLabel(feedback.severity)} />
                          )}
                          <Tag variant={getTagVariant(feedback.status)} size="s" label={getStatusLabel(feedback.status)} />
                        </Row>
                        <Text
                          variant="body-default-s"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {feedback.comment}
                        </Text>
                        <Row gap="s" vertical="center">
                          <Icon name="clock" size="xs" />
                          <Text variant="body-default-xs" onBackground="neutral-weak">
                            {formatDate(feedback.createdAt)}
                          </Text>
                          {feedback.pageUrl && (
                            <>
                              <Text variant="body-default-xs" onBackground="neutral-weak">|</Text>
                              <Text
                                variant="body-default-xs"
                                onBackground="neutral-weak"
                                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '15rem' }}
                              >
                                {feedback.pageUrl}
                              </Text>
                            </>
                          )}
                        </Row>
                      </Column>
                      <Icon name="chevronRight" size="s" />
                    </Row>
                  </Card>
                ))}
              </Column>
            )}
          </Column>
        )}

        {/* Settings tab */}
        {activeTab === 'settings' && (
          <Column gap="l" fillWidth>
            {/* Edit project */}
            <Card fillWidth padding="l" radius="l">
              <Column gap="m" fillWidth>
                <Row horizontal="between" vertical="center" fillWidth>
                  <Heading variant="heading-strong-s" as="h3">Configurações do Projeto</Heading>
                  {!editing && (
                    <Button
                      variant="tertiary"
                      size="s"
                      label="Editar"
                      prefixIcon="edit"
                      onClick={() => setEditing(true)}
                    />
                  )}
                </Row>

                {editing ? (
                  <Column gap="m" fillWidth>
                    <Input
                      id="edit-name"
                      label="Nome"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <Input
                      id="edit-url"
                      label="URL alvo"
                      placeholder="https://meusite.com.br"
                      value={editUrl}
                      onChange={(e) => handleEditUrlChange(e.target.value)}
                      onBlur={handleEditUrlBlur}
                      error={!!editUrlError}
                      errorMessage={editUrlError || undefined}
                    />
                    <Textarea
                      id="edit-description"
                      label="Descrição"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      lines={3}
                      placeholder="Opcional"
                    />
                    {editError && (
                      <FeedbackAlert variant="danger">{editError}</FeedbackAlert>
                    )}
                    <Row gap="s">
                      <Button
                        variant="primary"
                        size="m"
                        label="Salvar"
                        loading={editSaving}
                        onClick={handleEditSave}
                      />
                      <Button
                        variant="tertiary"
                        size="m"
                        label="Cancelar"
                        onClick={() => {
                          setEditing(false)
                          setEditName(project?.name ?? '')
                          setEditUrl(project?.url ?? '')
                          setEditDescription(project?.description ?? '')
                          setEditError(null)
                          setEditUrlError(null)
                        }}
                      />
                    </Row>
                  </Column>
                ) : (
                  <Column gap="0" fillWidth>
                    {[
                      { label: 'ID do projeto', value: project?.id, mono: true },
                      { label: 'Nome', value: project?.name },
                      ...(project?.description ? [{ label: 'Descrição', value: project.description }] : []),
                      { label: 'URL alvo', value: project?.url, link: true },
                      { label: 'Criado em', value: project?.createdAt ? formatDate(project.createdAt) : '-' },
                    ].map((row, i, arr) => (
                      <Row
                        key={row.label}
                        horizontal="between"
                        vertical="center"
                        paddingY="s"
                        paddingX="xs"
                        fillWidth
                        style={i < arr.length - 1 ? { borderBottom: '1px solid var(--neutral-border-medium)' } : {}}
                      >
                        <Text variant="body-default-s" style={{ fontWeight: 500 }}>{row.label}</Text>
                        {row.mono ? (
                          <Text
                            variant="body-default-xs"
                            style={{
                              background: 'var(--neutral-alpha-weak)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontFamily: 'monospace',
                            }}
                          >
                            {row.value}
                          </Text>
                        ) : row.link ? (
                          <a href={String(row.value)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                            <Text
                              variant="body-default-s"
                              onBackground="brand-strong"
                              style={{ maxWidth: '20rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {row.value}
                            </Text>
                          </a>
                        ) : (
                          <Text variant="body-default-s" onBackground="neutral-weak" style={{ textAlign: 'right', maxWidth: '20rem' }}>
                            {row.value}
                          </Text>
                        )}
                      </Row>
                    ))}
                  </Column>
                )}
              </Column>
            </Card>

            {/* Widget appearance */}
            <Card fillWidth padding="l" radius="l">
              <Column gap="m" fillWidth>
                <Row gap="s" vertical="center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                  <Heading variant="heading-strong-s" as="h3">Aparência do Widget</Heading>
                </Row>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Personalize a posição e cor do botão de feedback que aparece no site.
                </Text>

                {appearanceMsg && (
                  <FeedbackAlert variant={appearanceMsg.type}>{appearanceMsg.text}</FeedbackAlert>
                )}

                <Row gap="l" fillWidth wrap>
                  {/* Position selector */}
                  <Column gap="s" style={{ flex: 1, minWidth: '12rem' }}>
                    <Text variant="label-default-s" onBackground="neutral-strong">Posição</Text>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      {([
                        { value: 'top-left', label: 'Superior esq.' },
                        { value: 'top-right', label: 'Superior dir.' },
                        { value: 'bottom-left', label: 'Inferior esq.' },
                        { value: 'bottom-right', label: 'Inferior dir.' },
                      ] as const).map((pos) => (
                        <button
                          key={pos.value}
                          onClick={() => setWidgetPosition(pos.value)}
                          style={{
                            position: 'relative',
                            height: '4.5rem',
                            borderRadius: '0.5rem',
                            border: `2px solid ${widgetPosition === pos.value ? widgetColor : 'var(--neutral-border-medium)'}`,
                            background: widgetPosition === pos.value ? `${widgetColor}08` : 'var(--surface-background)',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            overflow: 'hidden',
                          }}
                        >
                          <div style={{
                            position: 'absolute',
                            ...(pos.value.includes('top') ? { top: 6 } : { bottom: 6 }),
                            ...(pos.value.includes('left') ? { left: 6 } : { right: 6 }),
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: widgetPosition === pos.value ? widgetColor : 'var(--neutral-solid-medium)',
                            transition: 'background 0.15s',
                          }} />
                          <span style={{
                            position: 'absolute',
                            bottom: 4,
                            left: 0,
                            right: 0,
                            textAlign: 'center',
                            fontSize: '0.625rem',
                            color: widgetPosition === pos.value ? widgetColor : 'var(--neutral-on-background-weak)',
                            fontWeight: widgetPosition === pos.value ? 600 : 400,
                          }}>
                            {pos.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </Column>

                  {/* Color picker + Preview */}
                  <Column gap="s" style={{ flex: 1, minWidth: '14rem' }}>
                    <Text variant="label-default-s" onBackground="neutral-strong">Cor do widget</Text>
                    <Row gap="s" vertical="center">
                      <label
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '0.5rem',
                          background: widgetColor,
                          border: '2px solid var(--neutral-border-medium)',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          flexShrink: 0,
                          position: 'relative',
                        }}
                      >
                        <input
                          type="color"
                          value={widgetColor}
                          onChange={(e) => setWidgetColor(e.target.value)}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            opacity: 0,
                            cursor: 'pointer',
                            width: '100%',
                            height: '100%',
                          }}
                        />
                      </label>
                      <input
                        type="text"
                        value={widgetColor}
                        onChange={(e) => {
                          const v = e.target.value
                          if (v.match(/^#[0-9a-fA-F]{0,6}$/)) setWidgetColor(v)
                        }}
                        onBlur={() => {
                          if (!widgetColor.match(/^#[0-9a-fA-F]{6}$/)) setWidgetColor('#4f46e5')
                        }}
                        style={{
                          width: '7rem',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.5rem',
                          border: '1px solid var(--neutral-border-medium)',
                          background: 'var(--surface-background)',
                          color: 'var(--neutral-on-background-strong)',
                          fontSize: '0.8125rem',
                          fontFamily: 'monospace',
                          outline: 'none',
                        }}
                      />
                    </Row>

                    {/* Live preview */}
                    <Text variant="label-default-s" onBackground="neutral-strong" style={{ marginTop: '0.25rem' }}>Preview</Text>
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      height: '10rem',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--neutral-border-medium)',
                      background: '#f9fafb',
                      overflow: 'hidden',
                    }}>
                      {/* Mock page content */}
                      <div style={{ padding: '0.75rem' }}>
                        <div style={{ height: 8, width: '60%', background: '#e5e7eb', borderRadius: 4, marginBottom: 6 }} />
                        <div style={{ height: 6, width: '80%', background: '#e5e7eb', borderRadius: 3, marginBottom: 4 }} />
                        <div style={{ height: 6, width: '45%', background: '#e5e7eb', borderRadius: 3 }} />
                      </div>
                      {/* Widget button preview */}
                      <div style={{
                        position: 'absolute',
                        ...(widgetPosition.includes('top') ? { top: 8 } : { bottom: 8 }),
                        ...(widgetPosition.includes('left') ? { left: 8 } : { right: 8 }),
                        height: 20,
                        paddingLeft: 6,
                        paddingRight: 8,
                        borderRadius: 10,
                        background: widgetColor,
                        boxShadow: `0 2px 8px ${widgetColor}66`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 3,
                        transition: 'all 0.3s ease',
                      }}>
                        <span style={{ color: '#fff', fontSize: 7, fontWeight: 700, whiteSpace: 'nowrap', lineHeight: 1 }}>QBugs Reportar</span>
                      </div>
                    </div>
                  </Column>
                </Row>

                <Row horizontal="end" fillWidth>
                  <Button
                    variant="primary"
                    size="m"
                    label={appearanceSaving ? 'Salvando...' : 'Salvar aparência'}
                    loading={appearanceSaving}
                    onClick={handleAppearanceSave}
                  />
                </Row>
              </Column>
            </Card>

            {/* Shared URL — only for proxy mode */}
            {(project?.mode ?? 'proxy') === 'proxy' && (
              <Card fillWidth padding="l" radius="l">
                <Column gap="m" fillWidth>
                  <Row gap="s" vertical="center">
                    <Icon name="link" size="m" />
                    <Heading variant="heading-strong-s" as="h3">URL Compartilhada</Heading>
                  </Row>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Envie esta URL para os QAs acessarem o visualizador e enviarem feedbacks.
                  </Text>
                  <Row gap="s" vertical="center" fillWidth>
                    <Flex
                      fillWidth
                      padding="s"
                      radius="m"
                      style={{
                        background: 'var(--neutral-alpha-weak)',
                        fontFamily: 'monospace',
                        fontSize: '0.8125rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {viewerUrl}
                    </Flex>
                    <Button
                      variant="secondary"
                      size="s"
                      label={copied ? 'Copiado!' : 'Copiar'}
                      prefixIcon={copied ? 'check' : 'copy'}
                      onClick={copyViewerUrl}
                      style={{ flexShrink: 0 }}
                    />
                  </Row>
                  <Row gap="xs" vertical="center">
                    <Tag variant="neutral" size="s" label="Link Rápido" />
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      Os QAs acessam o site via link compartilhado, sem precisar instalar nada.
                    </Text>
                  </Row>
                </Column>
              </Card>
            )}

            {/* Embed script — only for embed mode */}
            {(project?.mode ?? 'proxy') === 'embed' && (
              <Card fillWidth padding="l" radius="l">
                <Column gap="m" fillWidth>
                <Row gap="s" vertical="center">
                  <Icon name="code" size="m" />
                  <Heading variant="heading-strong-s" as="h3">Instalação no Site</Heading>
                </Row>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Adicione este código ao HTML do seu site para habilitar o widget de feedback diretamente na página.
                </Text>
                <Flex fillWidth style={{ position: 'relative' }}>
                  <pre
                    style={{
                      width: '100%',
                      background: 'var(--neutral-solid-strong)',
                      color: '#4ade80',
                      fontSize: '0.75rem',
                      borderRadius: '0.5rem',
                      padding: '1rem',
                      overflow: 'auto',
                      fontFamily: 'monospace',
                      margin: 0,
                    }}
                  >
                    {embedSnippet}
                  </pre>
                  <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
                    <Button
                      variant="secondary"
                      size="s"
                      label={copiedEmbed ? 'Copiado!' : 'Copiar'}
                      prefixIcon={copiedEmbed ? 'check' : 'copy'}
                      onClick={copyEmbedSnippet}
                    />
                  </div>
                </Flex>
                <Column gap="xs">
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    <strong>Como funciona:</strong> Um botão flutuante de feedback aparece no canto inferior direito da página.
                  </Text>
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    <strong>Vantagens:</strong> Funciona em qualquer site, incluindo aplicações com login e páginas dinâmicas.
                  </Text>
                </Column>
              </Column>
            </Card>
            )}

            {/* Delete project */}
            <Card
              fillWidth
              padding="l"
              radius="l"
              style={{ border: '1px solid var(--danger-border-strong)' }}
            >
              <Column gap="m" fillWidth>
                <Heading variant="heading-strong-s" as="h3">
                  <Text onBackground="danger-strong">Zona de Perigo</Text>
                </Heading>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Excluir este projeto removerá permanentemente todos os feedbacks associados. Esta ação não pode ser desfeita.
                </Text>

                {!showDeleteConfirm ? (
                  <Flex>
                    <Button
                      variant="danger"
                      size="m"
                      label="Excluir projeto"
                      prefixIcon="delete"
                      onClick={() => setShowDeleteConfirm(true)}
                    />
                  </Flex>
                ) : (
                  <Card
                    fillWidth
                    padding="m"
                    radius="m"
                    style={{ background: 'var(--danger-alpha-weak)' }}
                  >
                    <Column gap="s" fillWidth>
                      <Text variant="body-default-s" onBackground="danger-strong" style={{ fontWeight: 500 }}>
                        Digite <code style={{ background: 'var(--danger-alpha-medium)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>{project?.name}</code> para confirmar:
                      </Text>
                      <Input
                        id="delete-confirm"
                        label=""
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={project?.name}
                      />
                      {deleteError && (
                        <FeedbackAlert variant="danger">{deleteError}</FeedbackAlert>
                      )}
                      <Row gap="s">
                        <Button
                          variant="danger"
                          size="m"
                          label="Confirmar exclusão"
                          loading={deleting}
                          onClick={handleDelete}
                          disabled={deleting || deleteConfirmText !== project?.name}
                        />
                        <Button
                          variant="tertiary"
                          size="m"
                          label="Cancelar"
                          onClick={() => {
                            setShowDeleteConfirm(false)
                            setDeleteConfirmText('')
                            setDeleteError(null)
                          }}
                        />
                      </Row>
                    </Column>
                  </Card>
                )}
              </Column>
            </Card>
          </Column>
        )}
      </Column>
    </AppLayout>
  )
}
