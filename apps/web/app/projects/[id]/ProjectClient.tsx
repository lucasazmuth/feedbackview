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
  widgetStyle?: string
  widgetText?: string
  targetUrl?: string
  createdAt: string
  embedLastSeenAt?: string | null
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
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [reportSearch, setReportSearch] = useState('')
  const [showReportFilter, setShowReportFilter] = useState(false)
  const [reportViewMode, setReportViewMode] = useState<'card' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('report-view-mode') as 'card' | 'list') || 'card'
    }
    return 'card'
  })

  function handleSetReportViewMode(mode: 'card' | 'list') {
    setReportViewMode(mode)
    localStorage.setItem('report-view-mode', mode)
  }

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(project?.name ?? '')
  const [editUrl, setEditUrl] = useState(project?.url ?? '')
  const [editDescription, setEditDescription] = useState(project?.description ?? '')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editUrlError, setEditUrlError] = useState<string | null>(null)

  // Connection check state
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'not-connected'>('idle')
  const [localEmbedLastSeen, setLocalEmbedLastSeen] = useState(project?.embedLastSeenAt ?? null)

  async function checkConnection() {
    if (!project) return
    setConnectionStatus('checking')
    try {
      const res = await fetch(`/api/projects/${project.id}/status`)
      if (res.ok) {
        const data = await res.json()
        if (data.embedLastSeenAt) {
          setLocalEmbedLastSeen(data.embedLastSeenAt)
          setConnectionStatus('connected')
        } else {
          setConnectionStatus('not-connected')
        }
      } else {
        setConnectionStatus('not-connected')
      }
    } catch {
      setConnectionStatus('not-connected')
    }
    setTimeout(() => setConnectionStatus('idle'), 4000)
  }

  // Widget appearance state
  const [widgetPosition, setWidgetPosition] = useState(project?.widgetPosition || 'bottom-right')
  const [widgetColor, setWidgetColor] = useState(project?.widgetColor || '#4f46e5')
  const [widgetStyle, setWidgetStyle] = useState(project?.widgetStyle || 'text')
  const [widgetText, setWidgetText] = useState(project?.widgetText || 'Reportar Bug')
  const [appearanceSaving, setAppearanceSaving] = useState(false)
  const [appearanceMsg, setAppearanceMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null)

  async function handleAppearanceSave() {
    if (!project) return
    setAppearanceSaving(true)
    setAppearanceMsg(null)
    try {
      await api.projects.update(project.id, { widgetPosition, widgetColor, widgetStyle, widgetText })
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
  const displayUrl = project?.mode === 'embed' && project?.targetUrl ? project.targetUrl : viewerUrl
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
    await clipboardCopy(displayUrl)
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
    if (reportSearch.trim()) {
      const q = reportSearch.trim().toLowerCase()
      if (!f.comment.toLowerCase().includes(q) && !(f.pageUrl || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const hasActiveReportFilter = typeFilter !== '' || severityFilter !== '' || statusFilter !== ''

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
      <Column fillWidth maxWidth={72} paddingX="l" paddingY="m" gap="l" style={{ margin: '0 auto' }}>
        {/* Compact project header with inline stats */}
        <Row fillWidth horizontal="between" vertical="center">
          <Column gap="xs">
            <Row gap="s" vertical="center">
              <Heading variant="heading-strong-l" as="h1">{project?.name}</Heading>
              {(() => {
                const mode = project?.mode ?? 'proxy'
                const lastSeen = localEmbedLastSeen

                // For proxy mode: connected = has feedbacks
                if (mode === 'proxy') {
                  const hasReports = totalCount > 0
                  return (
                    <span
                      title={hasReports ? 'Reports sendo recebidos via link compartilhado.' : 'Nenhum report recebido ainda. Compartilhe o link na aba Configurações.'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        fontSize: '0.6875rem',
                        fontWeight: 500,
                        padding: '0.1875rem 0.5rem',
                        borderRadius: '999px',
                        background: hasReports ? 'var(--success-alpha-weak)' : 'var(--neutral-alpha-weak)',
                        color: hasReports ? 'var(--success-on-background-strong)' : 'var(--neutral-on-background-weak)',
                        cursor: 'help',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: hasReports ? 'var(--success-solid-strong)' : 'var(--neutral-solid-medium)', flexShrink: 0 }} />
                      {hasReports ? 'Ativo' : 'Aguardando reports'}
                    </span>
                  )
                }

                // For embed mode: connected = lastSeen recent
                if (!lastSeen) {
                  return (
                    <span
                      title="Widget não detectado. Configure na aba Configurações."
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        fontSize: '0.6875rem',
                        fontWeight: 500,
                        padding: '0.1875rem 0.5rem',
                        borderRadius: '999px',
                        background: 'var(--neutral-alpha-weak)',
                        color: 'var(--neutral-on-background-weak)',
                        cursor: 'help',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neutral-solid-medium)', flexShrink: 0 }} />
                      Não conectado
                    </span>
                  )
                }
                const minutesAgo = (Date.now() - new Date(lastSeen).getTime()) / 1000 / 60
                const isOnline = minutesAgo < 10
                const isRecent = minutesAgo < 60
                return (
                  <span
                    title={`Último sinal: ${formatDate(lastSeen)}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontSize: '0.6875rem',
                      fontWeight: 500,
                      padding: '0.1875rem 0.5rem',
                      borderRadius: '999px',
                      background: isOnline ? 'var(--success-alpha-weak)' : isRecent ? 'var(--warning-alpha-weak)' : 'var(--neutral-alpha-weak)',
                      color: isOnline ? 'var(--success-on-background-strong)' : isRecent ? 'var(--warning-on-background-strong)' : 'var(--neutral-on-background-weak)',
                      cursor: 'help',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: isOnline ? 'var(--success-solid-strong)' : isRecent ? 'var(--warning-solid-strong)' : 'var(--neutral-solid-medium)', flexShrink: 0 }} />
                    {isOnline ? 'Conectado' : isRecent ? 'Visto recentemente' : 'Inativo'}
                  </span>
                )
              })()}
            </Row>
            {displayUrl && (
              <Row gap="s" vertical="center">
                <Text
                  variant="body-default-xs"
                  onBackground="neutral-weak"
                  style={{
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '24rem',
                  }}
                >
                  {displayUrl}
                </Text>
                <button
                  onClick={copyViewerUrl}
                  title="Copiar link"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                    color: copied ? 'var(--success-solid-strong)' : 'var(--neutral-on-background-weak)',
                    transition: 'color 0.15s',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {copied ? (
                      <polyline points="20 6 9 17 4 12" />
                    ) : (
                      <>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </>
                    )}
                  </svg>
                </button>
              </Row>
            )}
          </Column>
          <Row gap="m">
            <div style={{ textAlign: 'center' }}>
              <Text variant="heading-strong-m" onBackground="neutral-strong">{totalCount}</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak" style={{ display: 'block' }}>Total</Text>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Text variant="heading-strong-m" onBackground="warning-strong">{openCount}</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak" style={{ display: 'block' }}>Abertos</Text>
            </div>
            {criticalCount > 0 && (
              <div style={{ textAlign: 'center' }}>
                <Text variant="heading-strong-m" onBackground="danger-strong">{criticalCount}</Text>
                <Text variant="body-default-xs" onBackground="neutral-weak" style={{ display: 'block' }}>Críticos</Text>
              </div>
            )}
            <div style={{ textAlign: 'center' }}>
              <Text variant="heading-strong-m" onBackground="success-strong">{resolvedCount}</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak" style={{ display: 'block' }}>Resolvidos</Text>
            </div>
          </Row>
        </Row>

        {/* Setup banner — prominent call-to-action above tabs */}
        {(() => {
          const mode = project?.mode ?? 'proxy'
          const isEmbed = mode === 'embed'
          const hasEmbed = !!localEmbedLastSeen
          const hasReports = totalCount > 0

          const steps = isEmbed
            ? [
                { key: 'create', label: 'Criar projeto', done: true },
                { key: 'install', label: 'Adicionar script ao site', done: hasEmbed },
                { key: 'connect', label: 'Widget conectado', done: hasEmbed },
                { key: 'report', label: 'Primeiro report recebido', done: hasReports },
              ]
            : [
                { key: 'create', label: 'Criar projeto', done: true },
                { key: 'share', label: 'Compartilhar link', done: hasReports },
                { key: 'report', label: 'Primeiro report recebido', done: hasReports },
              ]

          const completedCount = steps.filter((s) => s.done).length
          const allDone = completedCount === steps.length
          if (allDone) return null

          const currentStep = steps.find((s, i) => !s.done && (i === 0 || steps[i - 1].done))

          // Determine CTA
          let ctaLabel = ''
          let ctaAction: (() => void) | null = null
          if (currentStep?.key === 'install') {
            ctaLabel = 'Ver instruções'
            ctaAction = () => setActiveTab('settings')
          } else if (currentStep?.key === 'share') {
            ctaLabel = 'Copiar link'
            ctaAction = () => { copyViewerUrl() }
          } else if (currentStep?.key === 'connect') {
            ctaLabel = 'Verificar conexão'
            ctaAction = () => setActiveTab('settings')
          }

          return (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.875rem 1.25rem',
                borderRadius: '0.75rem',
                background: 'var(--brand-alpha-weak)',
                border: '1px solid var(--brand-border-medium)',
              }}
            >
              {/* Progress ring */}
              <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
                <svg width="40" height="40" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="var(--neutral-alpha-weak)" strokeWidth="3" />
                  <circle
                    cx="20" cy="20" r="16" fill="none"
                    stroke="var(--brand-solid-strong)" strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(completedCount / steps.length) * 100.5} 100.5`}
                    transform="rotate(-90 20 20)"
                  />
                </svg>
                <span style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6875rem', fontWeight: 700,
                  color: 'var(--brand-on-background-strong)',
                }}>
                  {completedCount}/{steps.length}
                </span>
              </div>
              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.875rem', fontWeight: 600,
                  color: 'var(--neutral-on-background-strong)',
                  marginBottom: 2,
                }}>
                  {currentStep?.label || 'Configure seu projeto'}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--neutral-on-background-weak)',
                }}>
                  {isEmbed && currentStep?.key === 'install'
                    ? 'Adicione o script embed ao HTML do seu site para ativar o widget.'
                    : isEmbed && currentStep?.key === 'connect'
                    ? 'Aguardando o widget se conectar ao seu site...'
                    : !isEmbed && currentStep?.key === 'share'
                    ? 'Compartilhe a URL com sua equipe para começarem a enviar reports.'
                    : currentStep?.key === 'report'
                    ? 'Envie o primeiro report de teste para validar a configuração.'
                    : 'Complete as etapas para começar a receber reports.'}
                </div>
              </div>
              {/* CTA */}
              {ctaAction && (
                <button
                  onClick={ctaAction}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: 'var(--brand-solid-strong)',
                    color: '#fff',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {ctaLabel}
                </button>
              )}
            </div>
          )
        })()}

        {/* Tabs */}
        <Row gap="l" fillWidth style={{ borderBottom: '2px solid var(--neutral-border-medium)' }}>
          {[
            { key: 'feedbacks' as const, label: 'Reports', count: totalCount },
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
            {/* Toolbar: search + filter + view toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--neutral-on-background-weak)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar report..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--neutral-border-medium)',
                    background: 'var(--surface-background)',
                    color: 'var(--neutral-on-background-strong)',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    height: 40,
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand-solid-strong)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--neutral-border-medium)' }}
                />
              </div>

              {/* Filter */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowReportFilter(!showReportFilter)}
                  title="Filtrar reports"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '0.5rem',
                    border: '1px solid var(--neutral-border-medium)',
                    background: hasActiveReportFilter ? 'var(--brand-solid-strong)' : 'var(--surface-background)',
                    color: hasActiveReportFilter ? '#fff' : 'var(--neutral-on-background-weak)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (!hasActiveReportFilter) e.currentTarget.style.background = 'var(--neutral-alpha-weak)'
                  }}
                  onMouseLeave={(e) => {
                    if (!hasActiveReportFilter) e.currentTarget.style.background = 'var(--surface-background)'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="7" y1="12" x2="17" y2="12" />
                    <line x1="10" y1="18" x2="14" y2="18" />
                  </svg>
                </button>
                {showReportFilter && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 199 }}
                      onClick={() => setShowReportFilter(false)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 0.5rem)',
                        right: 0,
                        zIndex: 200,
                        background: 'var(--surface-background)',
                        border: '1px solid var(--neutral-border-medium)',
                        borderRadius: '0.75rem',
                        padding: '1rem',
                        width: '18rem',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                      }}
                    >
                      <Text variant="label-default-s" onBackground="neutral-strong">Tipo</Text>
                      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                        {([['', 'Todos'], ['BUG', 'Bug'], ['SUGGESTION', 'Sugestão'], ['QUESTION', 'Dúvida'], ['PRAISE', 'Elogio']] as const).map(([val, label]) => (
                          <button
                            key={val}
                            onClick={() => setTypeFilter(val)}
                            style={{
                              padding: '0.375rem 0.625rem',
                              borderRadius: '0.375rem',
                              border: '1px solid',
                              borderColor: typeFilter === val ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)',
                              background: typeFilter === val ? 'var(--brand-solid-strong)' : 'transparent',
                              color: typeFilter === val ? '#fff' : 'var(--neutral-on-background-weak)',
                              fontSize: '0.75rem',
                              fontWeight: typeFilter === val ? 600 : 400,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <Text variant="label-default-s" onBackground="neutral-strong">Severidade</Text>
                      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                        {([['', 'Todas'], ['CRITICAL', 'Crítico'], ['HIGH', 'Alto'], ['MEDIUM', 'Médio'], ['LOW', 'Baixo']] as const).map(([val, label]) => (
                          <button
                            key={val}
                            onClick={() => setSeverityFilter(val)}
                            style={{
                              padding: '0.375rem 0.625rem',
                              borderRadius: '0.375rem',
                              border: '1px solid',
                              borderColor: severityFilter === val ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)',
                              background: severityFilter === val ? 'var(--brand-solid-strong)' : 'transparent',
                              color: severityFilter === val ? '#fff' : 'var(--neutral-on-background-weak)',
                              fontSize: '0.75rem',
                              fontWeight: severityFilter === val ? 600 : 400,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <Text variant="label-default-s" onBackground="neutral-strong">Status</Text>
                      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                        {([['', 'Todos'], ['OPEN', 'Aberto'], ['IN_PROGRESS', 'Em andamento'], ['RESOLVED', 'Resolvido'], ['CLOSED', 'Fechado']] as const).map(([val, label]) => (
                          <button
                            key={val}
                            onClick={() => setStatusFilter(val)}
                            style={{
                              padding: '0.375rem 0.625rem',
                              borderRadius: '0.375rem',
                              border: '1px solid',
                              borderColor: statusFilter === val ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)',
                              background: statusFilter === val ? 'var(--brand-solid-strong)' : 'transparent',
                              color: statusFilter === val ? '#fff' : 'var(--neutral-on-background-weak)',
                              fontSize: '0.75rem',
                              fontWeight: statusFilter === val ? 600 : 400,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {hasActiveReportFilter && (
                        <button
                          onClick={() => { setTypeFilter(''); setSeverityFilter(''); setStatusFilter('') }}
                          style={{
                            padding: '0.375rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--brand-on-background-strong)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          Limpar filtros
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* View mode toggle */}
              <div style={{ display: 'flex', borderRadius: '0.5rem', border: '1px solid var(--neutral-border-medium)', overflow: 'hidden', flexShrink: 0 }}>
                <button
                  onClick={() => handleSetReportViewMode('card')}
                  title="Visualização em cards"
                  style={{
                    width: 40,
                    height: 38,
                    border: 'none',
                    background: reportViewMode === 'card' ? 'var(--neutral-alpha-weak)' : 'var(--surface-background)',
                    color: reportViewMode === 'card' ? 'var(--neutral-on-background-strong)' : 'var(--neutral-on-background-weak)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                  </svg>
                </button>
                <div style={{ width: 1, background: 'var(--neutral-border-medium)' }} />
                <button
                  onClick={() => handleSetReportViewMode('list')}
                  title="Visualização em lista"
                  style={{
                    width: 40,
                    height: 38,
                    border: 'none',
                    background: reportViewMode === 'list' ? 'var(--neutral-alpha-weak)' : 'var(--surface-background)',
                    color: reportViewMode === 'list' ? 'var(--neutral-on-background-strong)' : 'var(--neutral-on-background-weak)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {filteredFeedbacks.length === 0 ? (
              <Card fillWidth padding="xl" radius="l" style={{ textAlign: 'center' }}>
                <Column fillWidth horizontal="center" gap="m" paddingY="l">
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
                      ? 'Nenhum report ainda. Compartilhe a URL do visualizador!'
                      : 'Nenhum report com os filtros selecionados.'}
                  </Text>
                </Column>
              </Card>
            ) : reportViewMode === 'card' ? (
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
            ) : (
              <Column fillWidth radius="l" border="neutral-medium" style={{ overflow: 'hidden' }}>
                {/* List header */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '6rem 1fr 6rem 5rem 10rem 2rem',
                    padding: '0.625rem 1rem',
                    borderBottom: '1px solid var(--neutral-border-medium)',
                    background: 'var(--neutral-alpha-weak)',
                    gap: '0.75rem',
                    alignItems: 'center',
                  }}
                >
                  <Text variant="label-default-xs" onBackground="neutral-weak">Tipo</Text>
                  <Text variant="label-default-xs" onBackground="neutral-weak">Comentário</Text>
                  <Text variant="label-default-xs" onBackground="neutral-weak">Severidade</Text>
                  <Text variant="label-default-xs" onBackground="neutral-weak">Status</Text>
                  <Text variant="label-default-xs" onBackground="neutral-weak">Data</Text>
                  <span />
                </div>
                {filteredFeedbacks.map((feedback, i) => (
                  <div
                    key={feedback.id}
                    onClick={() => router.push(`/feedbacks/${feedback.id}`)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '6rem 1fr 6rem 5rem 10rem 2rem',
                      padding: '0.75rem 1rem',
                      borderBottom: i < filteredFeedbacks.length - 1 ? '1px solid var(--neutral-border-medium)' : undefined,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      gap: '0.75rem',
                      alignItems: 'center',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--neutral-alpha-weak)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <Tag variant={getTagVariant(feedback.type)} size="s" label={getTypeLabel(feedback.type)} />
                    <Text
                      variant="body-default-s"
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {feedback.comment}
                    </Text>
                    {feedback.severity ? (
                      <Tag variant={getTagVariant(feedback.severity)} size="s" label={getSeverityLabel(feedback.severity)} />
                    ) : (
                      <span />
                    )}
                    <Tag variant={getTagVariant(feedback.status)} size="s" label={getStatusLabel(feedback.status)} />
                    <Text variant="body-default-xs" onBackground="neutral-weak" style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(feedback.createdAt)}
                    </Text>
                    <Icon name="chevronRight" size="xs" />
                  </div>
                ))}
              </Column>
            )}
          </Column>
        )}

        {/* Settings tab */}
        {activeTab === 'settings' && (
          <Column gap="l" fillWidth>
            {/* Setup Guide */}
            {(() => {
              const mode = project?.mode ?? 'proxy'
              const isEmbed = mode === 'embed'
              const hasEmbed = !!localEmbedLastSeen
              const hasReports = totalCount > 0

              const steps = isEmbed
                ? [
                    { label: 'Criar projeto', done: true },
                    { label: 'Adicionar script ao site', done: hasEmbed },
                    { label: 'Widget conectado', done: hasEmbed },
                    { label: 'Primeiro report recebido', done: hasReports },
                  ]
                : [
                    { label: 'Criar projeto', done: true },
                    { label: 'Compartilhar link com a equipe', done: hasReports },
                    { label: 'Primeiro report recebido', done: hasReports },
                  ]

              const completedCount = steps.filter((s) => s.done).length
              const allDone = completedCount === steps.length

              if (allDone) return null

              return (
                <Card fillWidth padding="l" radius="l">
                  <Column gap="m" fillWidth>
                    <Row horizontal="between" vertical="center" fillWidth>
                      <Column gap="xs">
                        <Text variant="label-default-s" onBackground="neutral-strong">
                          Configuração do projeto
                        </Text>
                        <Text variant="body-default-xs" onBackground="neutral-weak">
                          {completedCount} de {steps.length} etapas concluídas
                        </Text>
                      </Column>
                      <div
                        style={{
                          width: 80,
                          height: 6,
                          borderRadius: 3,
                          background: 'var(--neutral-alpha-weak)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${(completedCount / steps.length) * 100}%`,
                            height: '100%',
                            borderRadius: 3,
                            background: 'var(--success-solid-strong)',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </Row>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {steps.map((step, i) => {
                        const isLast = i === steps.length - 1
                        const isCurrent = !step.done && (i === 0 || steps[i - 1].done)
                        return (
                          <div key={step.label} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                            {/* Timeline dot + line */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
                              <div
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: step.done
                                    ? 'var(--success-solid-strong)'
                                    : isCurrent
                                    ? 'var(--brand-solid-strong)'
                                    : 'var(--neutral-alpha-weak)',
                                  flexShrink: 0,
                                }}
                              >
                                {step.done ? (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                ) : (
                                  <span
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      background: isCurrent ? '#fff' : 'var(--neutral-solid-medium)',
                                    }}
                                  />
                                )}
                              </div>
                              {!isLast && (
                                <div
                                  style={{
                                    width: 2,
                                    height: 24,
                                    background: step.done ? 'var(--success-solid-strong)' : 'var(--neutral-border-medium)',
                                  }}
                                />
                              )}
                            </div>
                            {/* Step content */}
                            <div style={{ paddingTop: 1, paddingBottom: isLast ? 0 : 24 }}>
                              <Text
                                variant="body-default-s"
                                onBackground={step.done ? 'neutral-strong' : isCurrent ? 'brand-strong' : 'neutral-weak'}
                                style={{ fontWeight: isCurrent ? 600 : 400 }}
                              >
                                {step.label}
                              </Text>
                              {isCurrent && isEmbed && step.label === 'Adicionar script ao site' && (
                                <div style={{ marginTop: 8 }}>
                                  <pre
                                    style={{
                                      width: '100%',
                                      background: 'var(--neutral-solid-strong)',
                                      color: '#4ade80',
                                      fontSize: '0.6875rem',
                                      borderRadius: '0.375rem',
                                      padding: '0.5rem 0.75rem',
                                      overflow: 'auto',
                                      fontFamily: 'monospace',
                                      margin: 0,
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-all',
                                    }}
                                  >
                                    {embedSnippet}
                                  </pre>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); copyEmbedSnippet() }}
                                    style={{
                                      marginTop: 6,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      padding: '0.25rem 0.625rem',
                                      borderRadius: '0.375rem',
                                      border: '1px solid var(--neutral-border-medium)',
                                      background: 'var(--surface-background)',
                                      color: copiedEmbed ? 'var(--success-on-background-strong)' : 'var(--neutral-on-background-strong)',
                                      fontSize: '0.6875rem',
                                      fontWeight: 500,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      {copiedEmbed ? (
                                        <polyline points="20 6 9 17 4 12" />
                                      ) : (
                                        <>
                                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                        </>
                                      )}
                                    </svg>
                                    {copiedEmbed ? 'Copiado!' : 'Copiar'}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); checkConnection() }}
                                    disabled={connectionStatus === 'checking'}
                                    style={{
                                      marginTop: 6,
                                      marginLeft: 6,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      padding: '0.25rem 0.625rem',
                                      borderRadius: '0.375rem',
                                      border: '1px solid var(--neutral-border-medium)',
                                      background: connectionStatus === 'connected'
                                        ? 'var(--success-alpha-weak)'
                                        : connectionStatus === 'not-connected'
                                        ? 'var(--danger-alpha-weak)'
                                        : 'var(--surface-background)',
                                      color: connectionStatus === 'connected'
                                        ? 'var(--success-on-background-strong)'
                                        : connectionStatus === 'not-connected'
                                        ? 'var(--danger-on-background-strong)'
                                        : 'var(--neutral-on-background-strong)',
                                      fontSize: '0.6875rem',
                                      fontWeight: 500,
                                      cursor: connectionStatus === 'checking' ? 'wait' : 'pointer',
                                      transition: 'all 0.15s',
                                    }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      {connectionStatus === 'connected' ? (
                                        <polyline points="20 6 9 17 4 12" />
                                      ) : connectionStatus === 'not-connected' ? (
                                        <>
                                          <line x1="18" y1="6" x2="6" y2="18" />
                                          <line x1="6" y1="6" x2="18" y2="18" />
                                        </>
                                      ) : (
                                        <>
                                          <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                                          <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                                          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                                          <line x1="12" y1="20" x2="12.01" y2="20" />
                                        </>
                                      )}
                                    </svg>
                                    {connectionStatus === 'checking'
                                      ? 'Verificando...'
                                      : connectionStatus === 'connected'
                                      ? 'Conectado!'
                                      : connectionStatus === 'not-connected'
                                      ? 'Não detectado'
                                      : 'Verificar conexão'}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setShowHelpModal(true) }}
                                    style={{
                                      marginTop: 6,
                                      marginLeft: 6,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      padding: '0.25rem 0.625rem',
                                      borderRadius: '0.375rem',
                                      border: '1px solid var(--neutral-border-medium)',
                                      background: 'var(--surface-background)',
                                      color: 'var(--neutral-on-background-strong)',
                                      fontSize: '0.6875rem',
                                      fontWeight: 500,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <circle cx="12" cy="12" r="10" />
                                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                      <line x1="12" y1="17" x2="12.01" y2="17" />
                                    </svg>
                                    Ajuda
                                  </button>
                                </div>
                              )}
                              {isCurrent && !isEmbed && step.label === 'Compartilhar link com a equipe' && (
                                <div style={{ marginTop: 8 }}>
                                  <div
                                    style={{
                                      width: '100%',
                                      background: 'var(--neutral-alpha-weak)',
                                      fontSize: '0.6875rem',
                                      borderRadius: '0.375rem',
                                      padding: '0.5rem 0.75rem',
                                      fontFamily: 'monospace',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {viewerUrl}
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); copyViewerUrl() }}
                                    style={{
                                      marginTop: 6,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      padding: '0.25rem 0.625rem',
                                      borderRadius: '0.375rem',
                                      border: '1px solid var(--neutral-border-medium)',
                                      background: 'var(--surface-background)',
                                      color: copied ? 'var(--success-on-background-strong)' : 'var(--neutral-on-background-strong)',
                                      fontSize: '0.6875rem',
                                      fontWeight: 500,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      {copied ? (
                                        <polyline points="20 6 9 17 4 12" />
                                      ) : (
                                        <>
                                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                        </>
                                      )}
                                    </svg>
                                    {copied ? 'Copiado!' : 'Copiar'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Column>
                </Card>
              )
            })()}

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
                  Personalize como o botão de feedback aparecerá no seu site.
                </Text>

                {appearanceMsg && (
                  <FeedbackAlert variant={appearanceMsg.type}>{appearanceMsg.text}</FeedbackAlert>
                )}

                <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                  {/* Controls */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Widget style */}
                    <div>
                      <Text variant="label-default-s" onBackground="neutral-strong" style={{ marginBottom: '0.5rem', display: 'block' }}>Estilo do botão</Text>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {(['text', 'icon'] as const).map((s) => (
                          <div
                            key={s}
                            onClick={() => setWidgetStyle(s)}
                            style={{
                              flex: 1,
                              padding: '1rem',
                              borderRadius: '0.75rem',
                              border: `2px solid ${widgetStyle === s ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)'}`,
                              background: widgetStyle === s ? 'var(--brand-alpha-weak)' : 'var(--surface-background)',
                              cursor: 'pointer',
                              textAlign: 'center',
                              transition: 'all 0.15s',
                            }}
                          >
                            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                              {s === 'text' ? (
                                <div style={{ height: 32, paddingLeft: 12, paddingRight: 14, borderRadius: 16, background: widgetColor, color: '#fff', display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 600, gap: 4 }}>
                                  {widgetText}
                                </div>
                              ) : (
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: widgetColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <ellipse cx="12" cy="15" rx="5" ry="6" />
                                    <circle cx="12" cy="7" r="3" />
                                    <path d="M5 9L2 7M19 9l3-2M5 15H2M19 15h3M5 19l-2 2M19 19l2 2" strokeLinecap="round" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>
                              {s === 'text' ? 'Texto' : 'Ícone'}
                            </span>
                            <p style={{ fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', margin: '0.25rem 0 0' }}>
                              {s === 'text' ? 'Botão com texto personalizado' : 'Botão circular com ícone'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Widget text (only for text style) */}
                    {widgetStyle === 'text' && (
                      <div>
                        <Text variant="label-default-s" onBackground="neutral-strong" style={{ marginBottom: '0.5rem', display: 'block' }}>Texto do botão</Text>
                        <input
                          type="text"
                          value={widgetText}
                          onChange={(e) => setWidgetText(e.target.value.slice(0, 30))}
                          placeholder="Reportar Bug"
                          style={{
                            width: '100%',
                            padding: '0.625rem 0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--neutral-border-medium)',
                            background: 'var(--surface-background)',
                            color: 'var(--neutral-on-background-strong)',
                            fontSize: '0.875rem',
                            outline: 'none',
                          }}
                        />
                        <span style={{ fontSize: '0.6875rem', color: 'var(--neutral-on-background-weak)', marginTop: '0.25rem', display: 'block' }}>{widgetText.length}/30</span>
                      </div>
                    )}

                    {/* Widget position */}
                    <div>
                      <Text variant="label-default-s" onBackground="neutral-strong" style={{ marginBottom: '0.5rem', display: 'block' }}>Posição</Text>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        {[
                          { value: 'top-left', label: 'Superior esquerda' },
                          { value: 'top-right', label: 'Superior direita' },
                          { value: 'bottom-left', label: 'Inferior esquerda' },
                          { value: 'bottom-right', label: 'Inferior direita' },
                        ].map((pos) => (
                          <button
                            key={pos.value}
                            onClick={() => setWidgetPosition(pos.value)}
                            style={{
                              padding: '0.625rem',
                              borderRadius: '0.5rem',
                              border: `2px solid ${widgetPosition === pos.value ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)'}`,
                              background: widgetPosition === pos.value ? 'var(--brand-alpha-weak)' : 'transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              transition: 'all 0.15s',
                            }}
                          >
                            <div style={{
                              width: 24,
                              height: 18,
                              borderRadius: 3,
                              border: '1px solid var(--neutral-border-medium)',
                              position: 'relative',
                              flexShrink: 0,
                            }}>
                              <div style={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                background: widgetPosition === pos.value ? 'var(--brand-solid-strong)' : 'var(--neutral-on-background-weak)',
                                position: 'absolute',
                                ...(pos.value.includes('top') ? { top: 2 } : { bottom: 2 }),
                                ...(pos.value.includes('left') ? { left: 2 } : { right: 2 }),
                              }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--neutral-on-background-strong)', fontWeight: widgetPosition === pos.value ? 600 : 400 }}>
                              {pos.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Widget color */}
                    <div>
                      <Text variant="label-default-s" onBackground="neutral-strong" style={{ marginBottom: '0.5rem', display: 'block' }}>Cor</Text>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {['#4f46e5', '#dc2626', '#16a34a', '#d97706', '#0ea5e9', '#8b5cf6', '#ec4899', '#1e293b'].map((c) => (
                          <button
                            key={c}
                            onClick={() => setWidgetColor(c)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: c,
                              border: widgetColor === c ? '3px solid var(--neutral-on-background-strong)' : '2px solid transparent',
                              cursor: 'pointer',
                              outline: widgetColor === c ? '2px solid var(--surface-background)' : 'none',
                              outlineOffset: -4,
                              transition: 'all 0.15s',
                            }}
                          />
                        ))}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginLeft: '0.25rem' }}>
                          <input
                            type="color"
                            value={widgetColor}
                            onChange={(e) => setWidgetColor(e.target.value)}
                            style={{ width: 32, height: 32, border: 'none', borderRadius: '50%', cursor: 'pointer', padding: 0 }}
                          />
                          <input
                            type="text"
                            value={widgetColor}
                            onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setWidgetColor(e.target.value) }}
                            style={{
                              width: '5.5rem',
                              padding: '0.375rem 0.5rem',
                              borderRadius: '0.375rem',
                              border: '1px solid var(--neutral-border-medium)',
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                              color: 'var(--neutral-on-background-strong)',
                              background: 'var(--surface-background)',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live preview */}
                  <div style={{ width: 280, flexShrink: 0 }}>
                    <Text variant="label-default-s" onBackground="neutral-strong" style={{ marginBottom: '0.5rem', display: 'block' }}>Preview</Text>
                    <div style={{
                      borderRadius: '0.75rem',
                      border: '1px solid var(--neutral-border-medium)',
                      overflow: 'hidden',
                      background: 'var(--surface-background)',
                    }}>
                      {/* Mock browser bar */}
                      <div style={{
                        padding: '0.5rem 0.75rem',
                        background: 'var(--neutral-alpha-weak)',
                        borderBottom: '1px solid var(--neutral-border-medium)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e' }} />
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840' }} />
                        </div>
                        <div style={{
                          flex: 1,
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          background: 'var(--surface-background)',
                          fontSize: '0.625rem',
                          color: 'var(--neutral-on-background-weak)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {project?.targetUrl || 'https://meusite.com.br'}
                        </div>
                      </div>

                      {/* Mock page content */}
                      <div style={{ position: 'relative', height: 200, background: '#f8fafc', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ width: '60%', height: 12, borderRadius: 4, background: '#e2e8f0' }} />
                          <div style={{ width: '90%', height: 8, borderRadius: 3, background: '#e2e8f0' }} />
                          <div style={{ width: '75%', height: 8, borderRadius: 3, background: '#e2e8f0' }} />
                          <div style={{ width: '40%', height: 8, borderRadius: 3, background: '#e2e8f0' }} />
                          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                            <div style={{ width: '45%', height: 40, borderRadius: 6, background: '#e2e8f0' }} />
                            <div style={{ width: '45%', height: 40, borderRadius: 6, background: '#e2e8f0' }} />
                          </div>
                        </div>

                        {/* Widget preview */}
                        <div style={{
                          position: 'absolute',
                          ...(widgetPosition.includes('top') ? { top: 10 } : { bottom: 10 }),
                          ...(widgetPosition.includes('left') ? { left: 10 } : { right: 10 }),
                          transition: 'all 0.3s ease',
                        }}>
                          {widgetStyle === 'icon' ? (
                            <div style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: widgetColor,
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: `0 4px 12px ${widgetColor}66`,
                            }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <ellipse cx="12" cy="15" rx="5" ry="6" />
                                <circle cx="12" cy="7" r="3" />
                                <path d="M5 9L2 7M19 9l3-2M5 15H2M19 15h3M5 19l-2 2M19 19l2 2" strokeLinecap="round" />
                              </svg>
                            </div>
                          ) : (
                            <div style={{
                              height: 28,
                              paddingLeft: 10,
                              paddingRight: 12,
                              borderRadius: 14,
                              background: widgetColor,
                              color: '#fff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontSize: 10,
                              fontWeight: 600,
                              fontFamily: 'system-ui, -apple-system, sans-serif',
                              boxShadow: `0 4px 12px ${widgetColor}66`,
                              whiteSpace: 'nowrap',
                            }}>
                              {widgetText || 'Reportar Bug'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

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
                <Flex fillWidth direction="column" gap="s">
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
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {embedSnippet}
                  </pre>
                  <Flex fillWidth horizontal="end">
                    <Button
                      variant="secondary"
                      size="s"
                      label={copiedEmbed ? 'Copiado!' : 'Copiar'}
                      prefixIcon={copiedEmbed ? 'check' : 'copy'}
                      onClick={copyEmbedSnippet}
                    />
                  </Flex>
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

      {/* Help modal — how to install the script */}
      {showHelpModal && (
        <div
          onClick={() => setShowHelpModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface-background)',
              borderRadius: '1rem',
              width: '100%',
              maxWidth: 560,
              maxHeight: '85vh',
              overflow: 'auto',
              padding: '2rem',
              position: 'relative',
              boxShadow: '0 24px 48px rgba(0,0,0,0.16)',
            }}
          >
            {/* Close */}
            <button
              onClick={() => setShowHelpModal(false)}
              style={{
                position: 'absolute', top: 16, right: 16,
                width: 32, height: 32, borderRadius: 8,
                border: 'none', background: 'transparent',
                color: 'var(--neutral-on-background-weak)',
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--neutral-on-background-strong)', margin: '0 0 0.5rem' }}>
              Como instalar o widget
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--neutral-on-background-weak)', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              Siga os passos abaixo para adicionar o widget de feedback ao seu site.
            </p>

            {/* Steps */}
            {[
              {
                step: 1,
                title: 'Copie o script',
                description: 'Clique no botão "Copiar" para copiar o código do script para a área de transferência.',
                code: embedSnippet,
              },
              {
                step: 2,
                title: 'Abra o HTML do seu site',
                description: 'Abra o arquivo HTML principal do seu site (geralmente index.html) ou o template do seu framework.',
                tips: [
                  'Next.js: app/layout.tsx ou pages/_document.tsx',
                  'React (CRA): public/index.html',
                  'Vue: public/index.html',
                  'HTML puro: index.html',
                  'WordPress: header.php do tema',
                ],
              },
              {
                step: 3,
                title: 'Cole antes do </body>',
                description: 'Cole o script logo antes da tag de fechamento </body> do seu HTML.',
                code: `  <!-- Widget de Feedback -->\n  ${embedSnippet}\n</body>`,
              },
              {
                step: 4,
                title: 'Salve e publique',
                description: 'Salve o arquivo e faça o deploy. O widget aparecerá automaticamente no canto inferior direito do seu site.',
              },
              {
                step: 5,
                title: 'Verifique a conexão',
                description: 'Volte aqui e clique em "Verificar conexão" para confirmar que o widget está funcionando.',
              },
            ].map((item) => (
              <div key={item.step} style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'var(--brand-solid-strong)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {item.step}
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>
                    {item.title}
                  </span>
                </div>
                <div style={{ marginLeft: 36 }}>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--neutral-on-background-weak)', margin: '0 0 0.5rem', lineHeight: 1.5 }}>
                    {item.description}
                  </p>
                  {item.code && (
                    <pre style={{
                      background: 'var(--neutral-solid-strong)',
                      color: '#4ade80',
                      fontSize: '0.6875rem',
                      borderRadius: '0.5rem',
                      padding: '0.75rem',
                      overflow: 'auto',
                      fontFamily: 'monospace',
                      margin: '0 0 0.5rem',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}>
                      {item.code}
                    </pre>
                  )}
                  {item.tips && (
                    <div style={{
                      background: 'var(--brand-alpha-weak)',
                      borderRadius: '0.5rem',
                      padding: '0.625rem 0.75rem',
                      fontSize: '0.75rem',
                      color: 'var(--neutral-on-background-strong)',
                      lineHeight: 1.6,
                    }}>
                      <span style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Onde colar em cada framework:</span>
                      {item.tips.map((tip) => (
                        <div key={tip} style={{ display: 'flex', gap: '0.375rem', alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--brand-on-background-strong)', flexShrink: 0 }}>•</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.6875rem' }}>{tip}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div style={{
              marginTop: '0.5rem',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              background: 'var(--success-alpha-weak)',
              border: '1px solid var(--success-border-medium)',
              fontSize: '0.8125rem',
              color: 'var(--success-on-background-strong)',
              lineHeight: 1.5,
            }}>
              <strong>Dica:</strong> O widget funciona em qualquer site, incluindo aplicações com login, SPAs e páginas dinâmicas. Não é necessário nenhuma configuração adicional.
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
