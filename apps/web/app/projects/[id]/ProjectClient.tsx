'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
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
  Spinner,
} from '@once-ui-system/core'
import AppLayout from '@/components/ui/AppLayout'

const SessionReplay = dynamic(() => import('@/components/viewer/SessionReplay'), { ssr: false })

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
  organizationId?: string
  widgetPosition?: string
  widgetColor?: string
  widgetStyle?: string
  widgetText?: string
  targetUrl?: string
  createdAt: string
  embedLastSeenAt?: string | null
  embedPaused?: boolean
  ownerName?: string | null
}

interface ActivityLogEntry {
  id: string
  projectId: string
  userId?: string
  userEmail?: string
  action: string
  details?: Record<string, any>
  createdAt: string
}

interface ProjectClientProps {
  project: Project | null
  feedbacks: Feedback[]
  activityLog: ActivityLogEntry[]
  error: string | null
  userEmail: string
  userRole: string
  feedbackAssigneesMap?: Record<string, { userId: string; name: string | null; email: string }[]>
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

function parseUserAgent(ua: string): { os: string; browser: string } {
  let os = 'Desconhecido'
  let browser = 'Desconhecido'
  if (ua.includes('Mac OS X')) { const v = ua.match(/Mac OS X ([\d_.]+)/); os = 'macOS ' + (v ? v[1].replace(/_/g, '.') : '') }
  else if (ua.includes('Windows NT')) { const v = ua.match(/Windows NT ([\d.]+)/); const map: Record<string, string> = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' }; os = 'Windows ' + (v ? (map[v[1]] || v[1]) : '') }
  else if (ua.includes('Android')) { const v = ua.match(/Android ([\d.]+)/); os = 'Android ' + (v ? v[1] : '') }
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('iPhone') || ua.includes('iPad')) { const v = ua.match(/OS ([\d_]+)/); os = 'iOS ' + (v ? v[1].replace(/_/g, '.') : '') }
  if (ua.includes('Edg/')) { const v = ua.match(/Edg\/([\d.]+)/); browser = 'Edge ' + (v ? v[1] : '') }
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) { const v = ua.match(/Chrome\/([\d.]+)/); browser = 'Chrome ' + (v ? v[1] : '') }
  else if (ua.includes('Firefox/')) { const v = ua.match(/Firefox\/([\d.]+)/); browser = 'Firefox ' + (v ? v[1] : '') }
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) { const v = ua.match(/Version\/([\d.]+)/); browser = 'Safari ' + (v ? v[1] : '') }
  return { os, browser }
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
    UNDER_REVIEW: 'brand',
    RESOLVED: 'success',
    CANCELLED: 'danger',
    CLOSED: 'neutral',
  }
  return map[value] || 'neutral'
}

function getTypeLabel(type: string) {
  const map: Record<string, string> = { BUG: 'Bug', SUGGESTION: 'Sugestão', QUESTION: 'Dúvida', PRAISE: 'Elogio' }
  return map[type] || type
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = { OPEN: 'Aberto', IN_PROGRESS: 'Em andamento', UNDER_REVIEW: 'Sob revisão', RESOLVED: 'Concluída', CANCELLED: 'Cancelado' }
  return map[status] || status
}

function getSeverityLabel(sev: string) {
  const map: Record<string, string> = { CRITICAL: 'Crítico', HIGH: 'Alto', MEDIUM: 'Médio', LOW: 'Baixo' }
  return map[sev] || sev
}

function getActionLabel(action: string) {
  const map: Record<string, string> = {
    PROJECT_CREATED: 'Projeto criado',
    PROJECT_UPDATED: 'Projeto editado',
    STATUS_CHANGED: 'Status alterado',
    FEEDBACK_RECEIVED: 'Novo report recebido',
  }
  return map[action] || action
}

function getActionIcon(action: string) {
  switch (action) {
    case 'PROJECT_CREATED':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    case 'PROJECT_UPDATED':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      )
    case 'STATUS_CHANGED':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      )
    case 'FEEDBACK_RECEIVED':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
        </svg>
      )
  }
}

function getActionColor(action: string) {
  switch (action) {
    case 'PROJECT_CREATED': return 'var(--success-solid-strong)'
    case 'PROJECT_UPDATED': return 'var(--brand-solid-strong)'
    case 'STATUS_CHANGED': return 'var(--warning-solid-strong)'
    case 'FEEDBACK_RECEIVED': return 'var(--info-solid-strong)'
    default: return 'var(--neutral-solid-medium)'
  }
}

function renderActivityDetails(entry: ActivityLogEntry) {
  if (!entry.details) return null

  if (entry.action === 'PROJECT_UPDATED' && entry.details.changes) {
    const changes = entry.details.changes as Record<string, { from: unknown; to: unknown }>
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
        {Object.entries(changes).map(([field, { from, to }]) => (
          <span key={field} style={{ fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)' }}>
            {field}: <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{String(from || '—')}</span> → {String(to || '—')}
          </span>
        ))}
      </div>
    )
  }

  if (entry.action === 'STATUS_CHANGED') {
    return (
      <span style={{ fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', marginTop: '0.125rem', display: 'block' }}>
        &quot;{entry.details.feedbackTitle}&quot;: {entry.details.oldStatusLabel} → {entry.details.newStatusLabel}
      </span>
    )
  }

  if (entry.action === 'FEEDBACK_RECEIVED') {
    return (
      <span style={{ fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', marginTop: '0.125rem', display: 'block' }}>
        {entry.details.typeLabel}{entry.details.title ? `: ${entry.details.title}` : ''}
        {entry.details.severity ? ` (${entry.details.severity})` : ''}
      </span>
    )
  }

  return null
}

export default function ProjectClient({
  project,
  feedbacks,
  activityLog,
  error,
  userEmail,
  userRole,
  feedbackAssigneesMap = {},
}: ProjectClientProps) {
  const router = useRouter()
  const canEdit = userRole === 'OWNER' || userRole === 'ADMIN'
  const [localFeedbacks, setLocalFeedbacks] = useState(feedbacks)
  const [localAssigneesMap, setLocalAssigneesMap] = useState(feedbackAssigneesMap)
  const [activeTab, setActiveTab] = useState<'feedbacks' | 'settings' | 'history'>('feedbacks')
  const [copied, setCopied] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [reportSearch, setReportSearch] = useState('')
  const [showReportFilter, setShowReportFilter] = useState(false)
  const [reportViewMode, setReportViewMode] = useState<'card' | 'list'>('card')

  const [clientNow, setClientNow] = useState(0)

  useEffect(() => {
    setClientNow(Date.now())
    const saved = localStorage.getItem('report-view-mode') as 'card' | 'list' | null
    if (saved) setReportViewMode(saved)
  }, [])

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

  // Feedback detail modal state
  interface FeedbackDetail {
    id: string
    type: string
    severity?: string
    status: string
    comment: string
    title?: string
    screenshotUrl?: string
    pageUrl?: string
    userAgent?: string
    createdAt: string
    projectId: string
    consoleLogs?: { level: string; message: string; timestamp?: number }[]
    networkLogs?: { method: string; url: string; status?: number; duration?: number }[]
    metadata?: { rrwebEvents?: any[]; stepsToReproduce?: string; expectedResult?: string; actualResult?: string; source?: string; viewport?: string } | null
  }
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackDetail | null>(null)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackStatusSaving, setFeedbackStatusSaving] = useState(false)
  const [feedbackEditingComment, setFeedbackEditingComment] = useState(false)
  const [feedbackCommentDraft, setFeedbackCommentDraft] = useState('')
  const [feedbackCommentSaving, setFeedbackCommentSaving] = useState(false)
  const [feedbackNetworkOpen, setFeedbackNetworkOpen] = useState(false)
  const [feedbackConsoleOpen, setFeedbackConsoleOpen] = useState(false)
  const [feedbackAssignees, setFeedbackAssignees] = useState<{ userId: string; name: string | null; email: string }[]>([])
  const [feedbackAssignSaving, setFeedbackAssignSaving] = useState(false)
  const [showFeedbackAssignDropdown, setShowFeedbackAssignDropdown] = useState(false)
  const [modalOrgMembers, setModalOrgMembers] = useState<{ id: string; name: string | null; email: string; role: string }[]>([])

  const openFeedbackModal = useCallback(async (feedbackId: string) => {
    setFeedbackModalOpen(true)
    setFeedbackLoading(true)
    setSelectedFeedback(null)
    setFeedbackEditingComment(false)
    setFeedbackNetworkOpen(false)
    setFeedbackConsoleOpen(false)
    setFeedbackAssignees([])
    setShowFeedbackAssignDropdown(false)
    try {
      const res = await fetch(`/api/feedbacks/${feedbackId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedFeedback(data)
      }
      // Fetch assignees
      const assignRes = await fetch(`/api/feedbacks/${feedbackId}/assign`)
      if (assignRes.ok) {
        const { assignees } = await assignRes.json()
        setFeedbackAssignees(assignees || [])
      }
      // Fetch org members (if not loaded yet)
      if (project?.organizationId && modalOrgMembers.length === 0) {
        const membersRes = await fetch(`/api/team/members?orgId=${project.organizationId}`)
        if (membersRes.ok) {
          const { members } = await membersRes.json()
          setModalOrgMembers(members || [])
        }
      }
    } catch { /* ignore */ }
    setFeedbackLoading(false)
  }, [project?.organizationId, modalOrgMembers.length])

  const closeFeedbackModal = useCallback(() => {
    setFeedbackModalOpen(false)
    setSelectedFeedback(null)
  }, [])

  const handleFeedbackAssign = useCallback(async (userId: string) => {
    if (!selectedFeedback) return
    setFeedbackAssignSaving(true)
    try {
      await api.feedbacks.assign(selectedFeedback.id, [userId])
      const member = modalOrgMembers.find(m => m.id === userId)
      if (member) {
        const newAssignee = { userId: member.id, name: member.name, email: member.email }
        setFeedbackAssignees(prev => [...prev, newAssignee])
        // Update the list's assignee map too
        setLocalAssigneesMap(prev => ({
          ...prev,
          [selectedFeedback.id]: [...(prev[selectedFeedback.id] || []), newAssignee],
        }))
      }
      setShowFeedbackAssignDropdown(false)
    } catch { /* ignore */ }
    setFeedbackAssignSaving(false)
  }, [selectedFeedback, modalOrgMembers])

  const handleFeedbackUnassign = useCallback(async (userId: string) => {
    if (!selectedFeedback) return
    setFeedbackAssignSaving(true)
    try {
      await api.feedbacks.unassign(selectedFeedback.id, userId)
      setFeedbackAssignees(prev => prev.filter(a => a.userId !== userId))
      // Update the list's assignee map too
      setLocalAssigneesMap(prev => ({
        ...prev,
        [selectedFeedback.id]: (prev[selectedFeedback.id] || []).filter(a => a.userId !== userId),
      }))
    } catch { /* ignore */ }
    setFeedbackAssignSaving(false)
  }, [selectedFeedback])

  const handleFeedbackStatusChange = useCallback(async (newStatus: string) => {
    if (!selectedFeedback) return
    setFeedbackStatusSaving(true)
    try {
      await api.feedbacks.updateStatus(selectedFeedback.id, newStatus)
      setSelectedFeedback(prev => prev ? { ...prev, status: newStatus } : null)
      setLocalFeedbacks(prev => prev.map(f => f.id === selectedFeedback.id ? { ...f, status: newStatus } : f))
    } catch { /* ignore */ }
    setFeedbackStatusSaving(false)
  }, [selectedFeedback])

  const handleFeedbackCommentSave = useCallback(async () => {
    if (!selectedFeedback) return
    setFeedbackCommentSaving(true)
    try {
      await api.feedbacks.updateComment(selectedFeedback.id, feedbackCommentDraft)
      setSelectedFeedback(prev => prev ? { ...prev, comment: feedbackCommentDraft } : null)
      setFeedbackEditingComment(false)
    } catch { /* ignore */ }
    setFeedbackCommentSaving(false)
  }, [selectedFeedback, feedbackCommentDraft])

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
      // Full reload so the embed script re-fetches config with new appearance
      setTimeout(() => window.location.reload(), 600)
    } catch (err: any) {
      setAppearanceMsg({ type: 'danger', text: err.message || 'Erro ao salvar.' })
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

  // Archive state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Embed pause state
  const [embedPaused, setEmbedPaused] = useState(project?.embedPaused ?? false)
  const [pauseToggling, setPauseToggling] = useState(false)

  async function toggleEmbedPause() {
    if (!project) return
    setPauseToggling(true)
    try {
      await api.projects.update(project.id, { embedPaused: !embedPaused })
      setEmbedPaused(!embedPaused)
      // Full reload so the embed script re-fetches config with new pause state
      setTimeout(() => window.location.reload(), 600)
    } catch {
      setPauseToggling(false)
    }
  }

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

  const filteredFeedbacks = localFeedbacks.filter((f) => {
    if (typeFilter && f.type !== typeFilter) return false
    if (severityFilter && f.severity !== severityFilter) return false
    if (statusFilter && f.status !== statusFilter) return false
    if (assigneeFilter) {
      const assignees = localAssigneesMap[f.id] || []
      if (!assignees.some(a => a.userId === assigneeFilter)) return false
    }
    if (reportSearch.trim()) {
      const q = reportSearch.trim().toLowerCase()
      if (!f.comment.toLowerCase().includes(q) && !(f.pageUrl || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  // Collect all unique assignees for the filter dropdown
  const allAssignees = Object.values(localAssigneesMap).flat()
  const uniqueAssignees = Array.from(new Map(allAssignees.map(a => [a.userId, a])).values())

  const hasActiveReportFilter = typeFilter !== '' || severityFilter !== '' || statusFilter !== '' || assigneeFilter !== ''

  const totalCount = localFeedbacks.length
  const openCount = localFeedbacks.filter((f) => f.status === 'OPEN').length
  const criticalCount = localFeedbacks.filter((f) => f.severity === 'CRITICAL').length
  const resolvedCount = localFeedbacks.filter((f) => f.status === 'RESOLVED').length

  async function handleEditSave() {
    if (!project) return
    if (!editName.trim()) {
      setEditError('Nome é obrigatório.')
      return
    }
    setEditError(null)
    setEditSaving(true)
    try {
      await api.projects.update(project.id, {
        name: editName.trim(),
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

  async function handleArchive() {
    if (!project) return
    setDeleteError(null)
    setDeleting(true)
    try {
      await api.projects.archive(project.id)
      router.push('/dashboard')
    } catch (err: any) {
      setDeleteError(err.message || 'Erro ao arquivar projeto.')
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
      <Column fillWidth paddingX="l" paddingY="m" gap="l">
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

                // For embed mode: check paused state first
                if (embedPaused) {
                  return (
                    <span
                      title="Conexão embed pausada"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        fontSize: '0.6875rem',
                        fontWeight: 500,
                        padding: '0.1875rem 0.5rem',
                        borderRadius: '999px',
                        background: 'var(--warning-alpha-weak)',
                        color: 'var(--warning-on-background-strong)',
                        cursor: 'help',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning-solid-strong)', flexShrink: 0 }} />
                      Pausado
                    </span>
                  )
                }

                // connected = lastSeen recent
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
                if (!clientNow) {
                  return (
                    <span
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
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neutral-solid-medium)', flexShrink: 0 }} />
                      —
                    </span>
                  )
                }
                const minutesAgo = (clientNow - new Date(lastSeen).getTime()) / 1000 / 60
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
              <Text variant="body-default-xs" onBackground="neutral-weak" style={{ display: 'block' }}>Concluídas</Text>
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
            { key: 'history' as const, label: 'Histórico', count: undefined },
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
                        {([['', 'Todos'], ['OPEN', 'Aberto'], ['IN_PROGRESS', 'Em andamento'], ['UNDER_REVIEW', 'Sob revisão'], ['RESOLVED', 'Concluída'], ['CANCELLED', 'Cancelado']] as const).map(([val, label]) => (
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

                      {uniqueAssignees.length > 0 && (
                        <>
                          <Text variant="label-default-s" onBackground="neutral-strong">Responsável</Text>
                          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                            {[{ userId: '', label: 'Todos' }, ...uniqueAssignees.map(a => ({ userId: a.userId, label: a.name || a.email.split('@')[0] || 'Membro' }))].map((opt) => (
                              <button
                                key={opt.userId}
                                onClick={() => setAssigneeFilter(opt.userId)}
                                style={{
                                  padding: '0.375rem 0.625rem',
                                  borderRadius: '0.375rem',
                                  border: '1px solid',
                                  borderColor: assigneeFilter === opt.userId ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)',
                                  background: assigneeFilter === opt.userId ? 'var(--brand-solid-strong)' : 'transparent',
                                  color: assigneeFilter === opt.userId ? '#fff' : 'var(--neutral-on-background-weak)',
                                  fontSize: '0.75rem',
                                  fontWeight: assigneeFilter === opt.userId ? 600 : 400,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                }}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}

                      {hasActiveReportFilter && (
                        <button
                          onClick={() => { setTypeFilter(''); setSeverityFilter(''); setStatusFilter(''); setAssigneeFilter('') }}
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
                    {localFeedbacks.length === 0
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
                    onClick={() => openFeedbackModal(feedback.id)}
                    style={{ transition: 'box-shadow 0.15s ease', cursor: 'pointer' }}
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
                          {/* Assignee avatars */}
                          {(localAssigneesMap[feedback.id] || []).length > 0 && (
                            <div style={{ display: 'flex', marginLeft: 4 }}>
                              {(localAssigneesMap[feedback.id] || []).slice(0, 3).map((a, i) => (
                                <div key={a.userId} title={a.name || a.email} style={{
                                  width: 20, height: 20, borderRadius: '50%', background: '#111', color: '#fff',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 9, fontWeight: 700, marginLeft: i > 0 ? -6 : 0, border: '2px solid #fff', zIndex: 3 - i,
                                }}>
                                  {(a.name || a.email).charAt(0).toUpperCase()}
                                </div>
                              ))}
                              {(localAssigneesMap[feedback.id] || []).length > 3 && (
                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--neutral-alpha-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 600, marginLeft: -6, border: '2px solid #fff' }}>
                                  +{(localAssigneesMap[feedback.id] || []).length - 3}
                                </div>
                              )}
                            </div>
                          )}
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
                    gridTemplateColumns: '6rem 1fr 6rem 5rem 4rem 10rem 2rem',
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
                  <Text variant="label-default-xs" onBackground="neutral-weak">Responsável</Text>
                  <Text variant="label-default-xs" onBackground="neutral-weak">Data</Text>
                  <span />
                </div>
                {filteredFeedbacks.map((feedback, i) => (
                  <div
                    key={feedback.id}
                    onClick={() => openFeedbackModal(feedback.id)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '6rem 1fr 6rem 5rem 4rem 10rem 2rem',
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
                    <div style={{ display: 'flex' }}>
                      {(localAssigneesMap[feedback.id] || []).slice(0, 3).map((a, idx) => (
                        <div key={a.userId} title={a.name || a.email} style={{
                          width: 20, height: 20, borderRadius: '50%', background: '#111', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 700, marginLeft: idx > 0 ? -6 : 0, border: '2px solid #fff', zIndex: 3 - idx,
                        }}>
                          {(a.name || a.email).charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {(localAssigneesMap[feedback.id] || []).length > 3 && (
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--neutral-alpha-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 600, marginLeft: -6, border: '2px solid #fff' }}>
                          +{(localAssigneesMap[feedback.id] || []).length - 3}
                        </div>
                      )}
                    </div>
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
            {!canEdit && (
              <FeedbackAlert variant="info">
                Apenas o proprietário ou administrador da organização pode alterar as configurações do projeto.
              </FeedbackAlert>
            )}
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
                  {!editing && canEdit && (
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
                          setEditDescription(project?.description ?? '')
                          setEditError(null)
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
                      ...(project?.ownerName ? [{ label: 'Criado por', value: project.ownerName }] : []),
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
                                <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', padding: '10px 6px', borderRadius: '8px 0 0 8px', background: widgetColor, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: 10, letterSpacing: '-0.02em' }}>Buug report</span>
                                </div>
                              ) : (
                                <div style={{ width: 44, height: 44, borderRadius: '50%', background: widgetColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 900, fontSize: 13, letterSpacing: '-0.04em', lineHeight: 0.95, textAlign: 'left', textTransform: 'uppercase', whiteSpace: 'pre' }}>{'BU\nUG'}</span>
                                </div>
                              )}
                            </div>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>
                              {s === 'text' ? 'Texto' : 'Ícone'}
                            </span>
                            <p style={{ fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', margin: '0.25rem 0 0' }}>
                              {s === 'text' ? 'Tag lateral com texto' : 'Botão circular com logo'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Widget position */}
                    <div>
                      <Text variant="label-default-s" onBackground="neutral-strong" style={{ marginBottom: '0.5rem', display: 'block' }}>Posição</Text>
                      <div style={{
                        width: '100%',
                        aspectRatio: '16 / 10',
                        maxWidth: 260,
                        borderRadius: '0.75rem',
                        border: '1px solid var(--neutral-border-medium)',
                        background: 'var(--surface-background)',
                        position: 'relative',
                      }}>
                        {/* Screen skeleton */}
                        <div style={{ opacity: 0.25, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ width: '50%', height: 4, borderRadius: 2, background: '#aaa' }} />
                          <div style={{ width: '80%', height: 3, borderRadius: 2, background: '#bbb' }} />
                          <div style={{ width: '65%', height: 3, borderRadius: 2, background: '#bbb' }} />
                        </div>
                        {/* 6 clickable dots */}
                        {([
                          { value: 'top-left', style: { top: 8, left: 8 } },
                          { value: 'top-center', style: { top: 8, left: '50%', transform: 'translateX(-50%)' } },
                          { value: 'top-right', style: { top: 8, right: 8 } },
                          { value: 'bottom-left', style: { bottom: 8, left: 8 } },
                          { value: 'bottom-center', style: { bottom: 8, left: '50%', transform: 'translateX(-50%)' } },
                          { value: 'bottom-right', style: { bottom: 8, right: 8 } },
                        ] as { value: string; style: React.CSSProperties }[]).map((pos) => {
                          const isActive = widgetPosition === pos.value
                          return (
                            <button
                              key={pos.value}
                              onClick={() => setWidgetPosition(pos.value)}
                              title={pos.value.replace('top-', 'Superior ').replace('bottom-', 'Inferior ').replace('left', 'esquerda').replace('right', 'direita').replace('center', 'centro')}
                              style={{
                                position: 'absolute',
                                ...pos.style,
                                width: isActive ? 16 : 10,
                                height: isActive ? 16 : 10,
                                borderRadius: '50%',
                                background: isActive ? widgetColor : 'var(--neutral-alpha-medium)',
                                border: isActive ? '2px solid #fff' : '2px solid transparent',
                                boxShadow: isActive ? `0 0 0 2px ${widgetColor}, 0 2px 8px ${widgetColor}66` : 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                padding: 0,
                              }}
                            />
                          )
                        })}
                      </div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--neutral-on-background-weak)', marginTop: 6, display: 'block' }}>
                        {widgetPosition.replace('top-', 'Superior ').replace('bottom-', 'Inferior ').replace('left', 'esquerda').replace('right', 'direita').replace('center', 'centro')}
                      </span>
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

                      {/* Site preview with iframe or skeleton fallback */}
                      <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
                        {project?.targetUrl ? (
                          <iframe
                            src={project.targetUrl}
                            title="Preview do site"
                            sandbox="allow-scripts allow-same-origin"
                            style={{
                              width: '200%',
                              height: '200%',
                              border: 'none',
                              transform: 'scale(0.5)',
                              transformOrigin: 'top left',
                              pointerEvents: 'none',
                            }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: '#f8fafc', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ width: '60%', height: 12, borderRadius: 4, background: '#e2e8f0' }} />
                            <div style={{ width: '90%', height: 8, borderRadius: 3, background: '#e2e8f0' }} />
                            <div style={{ width: '75%', height: 8, borderRadius: 3, background: '#e2e8f0' }} />
                            <div style={{ width: '40%', height: 8, borderRadius: 3, background: '#e2e8f0' }} />
                            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                              <div style={{ width: '45%', height: 40, borderRadius: 6, background: '#e2e8f0' }} />
                              <div style={{ width: '45%', height: 40, borderRadius: 6, background: '#e2e8f0' }} />
                            </div>
                          </div>
                        )}

                        {/* Widget preview */}
                        <div style={{
                          position: 'absolute',
                          transition: 'all 0.3s ease',
                          ...(widgetStyle === 'icon' ? {
                            ...(widgetPosition.includes('top') ? { top: 10 } : { bottom: 10 }),
                            ...(widgetPosition.includes('left') ? { left: 10 } : widgetPosition.includes('center') ? { left: '50%', transform: 'translateX(-50%)' } : { right: 10 }),
                          } : {
                            // Text style: tag grudada na borda
                            ...(widgetPosition.includes('center') ? {
                              // Centro: horizontal, grudado top/bottom
                              ...(widgetPosition.includes('top') ? { top: 0 } : { bottom: 0 }),
                              left: '50%', transform: 'translateX(-50%)',
                            } : {
                              // Laterais: vertical, grudado left/right
                              ...(widgetPosition.includes('top') ? { top: 10 } : { bottom: 10 }),
                              ...(widgetPosition.includes('left') ? { left: 0 } : { right: 0 }),
                            }),
                          }),
                        }}>
                          {widgetStyle === 'icon' ? (
                            <div style={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              background: widgetColor,
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: `0 4px 12px ${widgetColor}66`,
                            }}>
                              <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 900, fontSize: 10, letterSpacing: '-0.04em', lineHeight: 0.95, textAlign: 'left', textTransform: 'uppercase', whiteSpace: 'pre' }}>{'BU\nUG'}</span>
                            </div>
                          ) : widgetPosition.includes('center') ? (
                            // Text + center: horizontal tab grudada top/bottom
                            <div style={{
                              padding: '4px 12px',
                              background: widgetColor,
                              color: '#fff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              boxShadow: `0 4px 12px ${widgetColor}66`,
                              whiteSpace: 'nowrap',
                              borderRadius: widgetPosition.includes('top') ? '0 0 6px 6px' : '6px 6px 0 0',
                            }}>
                              <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: 9, letterSpacing: '-0.02em' }}>Buug report</span>
                            </div>
                          ) : (
                            // Text + lateral: vertical tag grudada left/right
                            <div style={{
                              writingMode: widgetPosition.includes('left') ? 'vertical-lr' : 'vertical-rl',
                              textOrientation: 'mixed',
                              padding: '10px 5px',
                              background: widgetColor,
                              color: '#fff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: `0 4px 12px ${widgetColor}66`,
                              borderRadius: widgetPosition.includes('left') ? '0 6px 6px 0' : '6px 0 0 6px',
                            }}>
                              <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: 9, letterSpacing: '-0.02em' }}>Buug report</span>
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
                    disabled={!canEdit}
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

            {/* Pause/Resume embed connection */}
            {(project?.mode ?? 'proxy') === 'embed' && (
              <Card fillWidth padding="l" radius="l">
                <Column gap="m" fillWidth>
                  <Heading variant="heading-strong-s" as="h3">Conexão do Widget</Heading>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {embedPaused
                      ? 'O widget está pausado e não aparece no site. Os feedbacks não serão aceitos enquanto pausado.'
                      : 'O widget está ativo e aparece no site cadastrado. Pause para ocultar temporariamente.'}
                  </Text>
                  <Flex>
                    <Button
                      variant={embedPaused ? 'primary' : 'secondary'}
                      size="m"
                      label={pauseToggling ? (embedPaused ? 'Retomando...' : 'Pausando...') : (embedPaused ? 'Retomar conexão' : 'Pausar conexão')}
                      prefixIcon={embedPaused ? 'play' : 'pause'}
                      onClick={toggleEmbedPause}
                      loading={pauseToggling}
                      disabled={!canEdit}
                    />
                  </Flex>
                </Column>
              </Card>
            )}

            {/* Archive project */}
            <Card
              fillWidth
              padding="l"
              radius="l"
              style={{ border: '1px solid var(--warning-border-strong)' }}
            >
              <Column gap="m" fillWidth>
                <Heading variant="heading-strong-s" as="h3">
                  <Text onBackground="warning-strong">Arquivar Projeto</Text>
                </Heading>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Arquivar este projeto irá ocultá-lo da lista de projetos. Os feedbacks e dados serão preservados.
                </Text>

                {!showDeleteConfirm ? (
                  <Flex>
                    <Button
                      variant="secondary"
                      size="m"
                      label="Arquivar projeto"
                      prefixIcon="archive"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={!canEdit}
                    />
                  </Flex>
                ) : (
                  <Card
                    fillWidth
                    padding="m"
                    radius="m"
                    style={{ background: 'var(--warning-alpha-weak)' }}
                  >
                    <Column gap="s" fillWidth>
                      <Text variant="body-default-s" onBackground="warning-strong" style={{ fontWeight: 500 }}>
                        Tem certeza que deseja arquivar o projeto <code style={{ background: 'var(--warning-alpha-medium)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>{project?.name}</code>?
                      </Text>
                      {deleteError && (
                        <FeedbackAlert variant="danger">{deleteError}</FeedbackAlert>
                      )}
                      <Row gap="s">
                        <Button
                          variant="secondary"
                          size="m"
                          label="Confirmar arquivamento"
                          loading={deleting}
                          onClick={handleArchive}
                        />
                        <Button
                          variant="tertiary"
                          size="m"
                          label="Cancelar"
                          onClick={() => {
                            setShowDeleteConfirm(false)
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

        {/* History tab */}
        {activeTab === 'history' && (
          <Column gap="m" fillWidth>
            {activityLog.length === 0 ? (
              <Card fillWidth padding="xl" radius="l">
                <Column horizontal="center" gap="s" fillWidth>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--neutral-on-background-weak)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <Text variant="body-default-m" onBackground="neutral-weak">
                    Nenhuma atividade registrada ainda.
                  </Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Ações como editar o projeto, alterar status de reports e novos reports serão exibidas aqui.
                  </Text>
                </Column>
              </Card>
            ) : (
              <Card fillWidth padding="l" radius="l">
                <Column gap="0" fillWidth>
                  {activityLog.map((entry, i) => {
                    const isLast = i === activityLog.length - 1
                    return (
                      <div
                        key={entry.id}
                        style={{
                          display: 'flex',
                          gap: '0.75rem',
                          alignItems: 'flex-start',
                          paddingBottom: isLast ? 0 : '1rem',
                          marginBottom: isLast ? 0 : '1rem',
                          borderBottom: isLast ? 'none' : '1px solid var(--neutral-border-medium)',
                        }}
                      >
                        {/* Icon */}
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: getActionColor(entry.action),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            color: '#fff',
                          }}
                        >
                          {getActionIcon(entry.action)}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <Text variant="body-default-s" style={{ fontWeight: 600 }}>
                              {getActionLabel(entry.action)}
                            </Text>
                            <Text variant="body-default-xs" onBackground="neutral-weak">
                              {formatDate(entry.createdAt)}
                            </Text>
                          </div>
                          {entry.userEmail && (
                            <Text variant="body-default-xs" onBackground="neutral-weak">
                              por {entry.userEmail}
                            </Text>
                          )}
                          {renderActivityDetails(entry)}
                        </div>
                      </div>
                    )
                  })}
                </Column>
              </Card>
            )}
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

      {/* ── Feedback Detail Modal ─────────────────────────────────────── */}
      {feedbackModalOpen && (
        <div
          onClick={closeFeedbackModal}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingTop: '3vh',
            overflowY: 'auto',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '64rem',
              maxHeight: '94vh',
              overflowY: 'auto',
              background: 'var(--page-background)',
              borderRadius: '1rem',
              border: '1px solid var(--neutral-border-medium)',
              boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
              margin: '0 1rem 2rem',
            }}
          >
            {feedbackLoading ? (
              <Flex fillWidth style={{ minHeight: '20rem' }} horizontal="center" vertical="center">
                <Column horizontal="center" gap="m">
                  <Spinner size="m" />
                  <Text variant="body-default-s" onBackground="neutral-weak">Carregando report...</Text>
                </Column>
              </Flex>
            ) : selectedFeedback ? (
              <>
                {/* Modal header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid var(--neutral-border-medium)',
                    position: 'sticky',
                    top: 0,
                    background: 'var(--surface-background)',
                    zIndex: 1,
                    borderRadius: '1rem 1rem 0 0',
                  }}
                >
                  <Tag variant={getTagVariant(selectedFeedback.type)} size="s" label={getTypeLabel(selectedFeedback.type)} />
                  <Text
                    variant="body-default-s"
                    onBackground="neutral-strong"
                    style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
                  >
                    {selectedFeedback.title || selectedFeedback.comment?.slice(0, 80) || 'Report'}
                  </Text>
                  <IconButton
                    icon="close"
                    variant="tertiary"
                    size="s"
                    tooltip="Fechar"
                    onClick={closeFeedbackModal}
                  />
                </div>

                {/* Modal content */}
                <div style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  {/* Left column */}
                  <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Warning for non-embed reports that have rrweb events */}
                    {selectedFeedback.metadata?.rrwebEvents && selectedFeedback.metadata.rrwebEvents.length > 0 && selectedFeedback.metadata?.source !== 'embed' && (
                      <Card fillWidth padding="m" radius="l" style={{ background: 'var(--warning-alpha-weak)', border: '1px solid var(--warning-border-medium)' }}>
                        <Row gap="s" vertical="center">
                          <Icon name="warning" size="s" onBackground="warning-strong" />
                          <Column gap="4">
                            <Text variant="label-default-s" onBackground="warning-strong">Report via URL compartilhada</Text>
                            <Text variant="body-default-xs" onBackground="warning-medium">O Session Replay não está disponível para reports enviados via URL compartilhada. Utilize o screenshot como referência visual.</Text>
                          </Column>
                        </Row>
                      </Card>
                    )}

                    {/* Session Replay (only for embed source — replay is unreliable in proxy mode) */}
                    {selectedFeedback.metadata?.rrwebEvents && selectedFeedback.metadata.rrwebEvents.length > 0 && selectedFeedback.metadata?.source === 'embed' && (
                      <Card fillWidth radius="l" style={{ overflow: 'hidden', padding: 0 }}>
                        <SessionReplay events={selectedFeedback.metadata.rrwebEvents} />
                      </Card>
                    )}

                    {/* Screenshot */}
                    {selectedFeedback.screenshotUrl && (
                      <Card fillWidth padding="l" radius="l">
                        <Column gap="s">
                          <Heading variant="heading-strong-s">Screenshot</Heading>
                          <img
                            src={selectedFeedback.screenshotUrl}
                            alt="Screenshot"
                            style={{ width: '100%', borderRadius: '0.5rem', border: '1px solid var(--neutral-border-medium)' }}
                          />
                        </Column>
                      </Card>
                    )}

                    {/* Description */}
                    <Card fillWidth padding="l" radius="l">
                      <Column gap="s">
                        <Row fillWidth horizontal="between" vertical="center">
                          <Heading variant="heading-strong-s">Descrição</Heading>
                          {!feedbackEditingComment && (
                            <IconButton
                              icon="edit"
                              variant="tertiary"
                              size="s"
                              tooltip="Editar"
                              onClick={() => { setFeedbackCommentDraft(selectedFeedback.comment); setFeedbackEditingComment(true) }}
                            />
                          )}
                        </Row>
                        {feedbackEditingComment ? (
                          <Column gap="s">
                            <Textarea
                              id="modal-comment-edit"
                              label="Descrição"
                              value={feedbackCommentDraft}
                              lines={4}
                              resize="vertical"
                              onChange={(e) => setFeedbackCommentDraft(e.target.value)}
                              disabled={feedbackCommentSaving}
                            />
                            <Row gap="s" horizontal="end">
                              <Button variant="secondary" size="s" label="Cancelar" onClick={() => setFeedbackEditingComment(false)} disabled={feedbackCommentSaving} />
                              <Button variant="primary" size="s" label="Salvar" onClick={handleFeedbackCommentSave} loading={feedbackCommentSaving} />
                            </Row>
                          </Column>
                        ) : (
                          <Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{selectedFeedback.comment}</Text>
                        )}
                      </Column>
                    </Card>

                    {/* Steps / Expected / Actual */}
                    {(selectedFeedback.metadata?.stepsToReproduce || selectedFeedback.metadata?.expectedResult || selectedFeedback.metadata?.actualResult) && (
                      <Card fillWidth padding="l" radius="l">
                        <Column gap="m">
                          {selectedFeedback.metadata?.stepsToReproduce && (
                            <Column gap="xs">
                              <Heading variant="heading-strong-s">Passos para reproduzir</Heading>
                              <Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{selectedFeedback.metadata.stepsToReproduce}</Text>
                            </Column>
                          )}
                          {selectedFeedback.metadata?.expectedResult && (
                            <Column gap="xs">
                              <Heading variant="heading-strong-s">Resultado esperado</Heading>
                              <Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{selectedFeedback.metadata.expectedResult}</Text>
                            </Column>
                          )}
                          {selectedFeedback.metadata?.actualResult && (
                            <Column gap="xs">
                              <Heading variant="heading-strong-s">Resultado real</Heading>
                              <Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{selectedFeedback.metadata.actualResult}</Text>
                            </Column>
                          )}
                        </Column>
                      </Card>
                    )}

                    {/* Network Logs */}
                    {(selectedFeedback.networkLogs?.length ?? 0) > 0 && (
                      <Card fillWidth padding="0" radius="l" style={{ overflow: 'hidden' }}>
                        <Column fillWidth>
                          <div
                            onClick={() => setFeedbackNetworkOpen(!feedbackNetworkOpen)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', cursor: 'pointer' }}
                          >
                            <Heading variant="heading-strong-s">Network Logs ({selectedFeedback.networkLogs!.length})</Heading>
                            <Icon name="chevronDown" size="xs" style={{ transform: feedbackNetworkOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                          </div>
                          {feedbackNetworkOpen && (
                            <div style={{ maxHeight: '20rem', overflowY: 'auto' }}>
                              {selectedFeedback.networkLogs!.map((log, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderTop: '1px solid var(--neutral-border-medium)' }}>
                                  <Tag variant={log.status && log.status >= 400 ? 'danger' : 'success'} size="s" label={String(log.status ?? '-')} />
                                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>{log.method}</span>
                                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }} title={log.url}>{log.url}</span>
                                  {log.duration != null && <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', flexShrink: 0 }}>{log.duration}ms</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </Column>
                      </Card>
                    )}

                    {/* Console Logs */}
                    {(selectedFeedback.consoleLogs?.length ?? 0) > 0 && (
                      <Card fillWidth padding="0" radius="l" style={{ overflow: 'hidden' }}>
                        <Column fillWidth>
                          <div
                            onClick={() => setFeedbackConsoleOpen(!feedbackConsoleOpen)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', cursor: 'pointer' }}
                          >
                            <Heading variant="heading-strong-s">Console Logs ({selectedFeedback.consoleLogs!.length})</Heading>
                            <Icon name="chevronDown" size="xs" style={{ transform: feedbackConsoleOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                          </div>
                          {feedbackConsoleOpen && (
                            <div style={{ maxHeight: '20rem', overflowY: 'auto' }}>
                              {selectedFeedback.consoleLogs!.map((log, i) => {
                                const level = log.level?.toUpperCase() ?? 'LOG'
                                const variant = level === 'ERROR' ? 'danger' : level === 'WARN' ? 'warning' : 'info'
                                return (
                                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem 1rem', borderTop: '1px solid var(--neutral-border-medium)' }}>
                                    <Tag variant={variant as any} size="s" label={level} style={{ flexShrink: 0 }} />
                                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', wordBreak: 'break-word', flex: 1, minWidth: 0 }}>{log.message}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </Column>
                      </Card>
                    )}
                  </div>

                  {/* Right sidebar */}
                  <div style={{ flex: 1, minWidth: '14rem', maxWidth: '18rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '4.5rem' }}>
                    {/* Status */}
                    <Card fillWidth padding="l" radius="l">
                      <Column gap="m">
                        <Heading variant="heading-strong-s">Status</Heading>
                        <Row gap="xs" wrap>
                          {[
                            { value: 'OPEN', label: 'Aberto' },
                            { value: 'IN_PROGRESS', label: 'Em andamento' },
                            { value: 'UNDER_REVIEW', label: 'Sob revisão' },
                            { value: 'RESOLVED', label: 'Concluída' },
                            { value: 'CANCELLED', label: 'Cancelado' },
                          ].map((opt) => (
                            <Tag
                              key={opt.value}
                              variant={selectedFeedback.status === opt.value ? getTagVariant(opt.value) : 'neutral'}
                              size="s"
                              label={opt.label}
                              onClick={() => handleFeedbackStatusChange(opt.value)}
                              style={{
                                cursor: feedbackStatusSaving ? 'wait' : 'pointer',
                                opacity: selectedFeedback.status === opt.value ? 1 : 0.6,
                                transition: 'opacity 0.15s',
                              }}
                            />
                          ))}
                        </Row>
                        {feedbackStatusSaving && (
                          <Row gap="xs" vertical="center">
                            <Spinner size="s" />
                            <Text variant="body-default-xs" onBackground="neutral-weak">Salvando...</Text>
                          </Row>
                        )}
                      </Column>
                    </Card>

                    {/* Assignees */}
                    <Card fillWidth padding="l" radius="l">
                      <Column gap="m">
                        <Row horizontal="between" vertical="center">
                          <Heading variant="heading-strong-s">Responsáveis</Heading>
                          {feedbackAssignSaving && <Spinner size="s" />}
                        </Row>
                        {feedbackAssignees.length === 0 && (
                          <Text variant="body-default-xs" onBackground="neutral-weak">Nenhum responsável.</Text>
                        )}
                        {feedbackAssignees.length > 0 && (
                          <Column gap="xs">
                            {feedbackAssignees.map((a) => (
                              <Row key={a.userId} horizontal="between" vertical="center" style={{ padding: '4px 0' }}>
                                <Row gap="xs" vertical="center">
                                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--neutral-alpha-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>
                                    {(a.name || a.email).charAt(0).toUpperCase()}
                                  </div>
                                  <Text variant="label-default-s">{a.name || a.email.split('@')[0]}</Text>
                                </Row>
                                {(userRole === 'OWNER' || userRole === 'ADMIN') && (
                                  <button onClick={() => handleFeedbackUnassign(a.userId)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--neutral-on-background-weak)', fontSize: 13, padding: '2px 4px' }} title="Remover">✕</button>
                                )}
                              </Row>
                            ))}
                          </Column>
                        )}
                        {(userRole === 'OWNER' || userRole === 'ADMIN') && (
                          <div style={{ position: 'relative' }}>
                            <Button variant="tertiary" size="s" label="+ Atribuir" onClick={() => setShowFeedbackAssignDropdown(!showFeedbackAssignDropdown)} />
                            {showFeedbackAssignDropdown && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--surface-background)', border: '1px solid var(--neutral-border-medium)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: 180, overflowY: 'auto' }}>
                                {modalOrgMembers.filter(m => !feedbackAssignees.some(a => a.userId === m.id)).map(m => (
                                  <button key={m.id} onClick={() => handleFeedbackAssign(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--neutral-on-background-strong)', textAlign: 'left' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--neutral-alpha-weak)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--neutral-alpha-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>{(m.name || m.email).charAt(0).toUpperCase()}</div>
                                    <span>{m.name || m.email.split('@')[0]}</span>
                                  </button>
                                ))}
                                {modalOrgMembers.filter(m => !feedbackAssignees.some(a => a.userId === m.id)).length === 0 && (
                                  <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--neutral-on-background-weak)' }}>Todos atribuídos.</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </Column>
                    </Card>

                    {/* Details */}
                    <Card fillWidth padding="l" radius="l">
                      <Column gap="m">
                        <Heading variant="heading-strong-s">Detalhes</Heading>

                        {/* Tags */}
                        <Column gap="xs">
                          <Text variant="label-default-s" onBackground="neutral-weak">Tipo e Severidade</Text>
                          <Row gap="xs" wrap>
                            <Tag variant={getTagVariant(selectedFeedback.type)} size="m" label={getTypeLabel(selectedFeedback.type)} />
                            {selectedFeedback.severity && (
                              <Tag variant={getTagVariant(selectedFeedback.severity)} size="m" label={getSeverityLabel(selectedFeedback.severity)} />
                            )}
                          </Row>
                        </Column>

                        {/* Source badge */}
                        {selectedFeedback.metadata?.source && (
                          <Column gap="xs">
                            <Text variant="label-default-s" onBackground="neutral-weak">Origem</Text>
                            <Tag
                              variant={selectedFeedback.metadata.source === 'shared-url' ? 'info' : 'brand'}
                              size="s"
                              label={selectedFeedback.metadata.source === 'shared-url' ? 'URL compartilhada' : 'Script embed'}
                            />
                          </Column>
                        )}

                        {/* Page URL */}
                        {selectedFeedback.pageUrl && (
                          <Column gap="xs">
                            <Text variant="label-default-s" onBackground="neutral-weak">Página</Text>
                            <a
                              href={selectedFeedback.pageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: '0.75rem',
                                wordBreak: 'break-all',
                                color: 'var(--brand-on-background-strong)',
                                textDecoration: 'underline',
                                textUnderlineOffset: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              {selectedFeedback.pageUrl}
                              <Icon name="openLink" size="xs" style={{ flexShrink: 0 }} />
                            </a>
                          </Column>
                        )}

                        {/* Date */}
                        <Column gap="xs">
                          <Text variant="label-default-s" onBackground="neutral-weak">Data</Text>
                          <Row gap="xs" vertical="center">
                            <Icon name="clock" size="xs" />
                            <Text variant="body-default-xs">{formatDate(selectedFeedback.createdAt)}</Text>
                          </Row>
                        </Column>

                        {/* User Agent (parsed) + Viewport */}
                        {selectedFeedback.userAgent && (() => {
                          const { os, browser } = parseUserAgent(selectedFeedback.userAgent)
                          return (
                            <Column gap="xs">
                              <Text variant="label-default-s" onBackground="neutral-weak">Navegador</Text>
                              <Row gap="xs" vertical="center">
                                <Icon name="monitor" size="xs" />
                                <Text variant="body-default-xs">{os} • {browser}</Text>
                              </Row>
                              {selectedFeedback.metadata?.viewport && (
                                <Row gap="xs" vertical="center">
                                  <Icon name="viewport" size="xs" />
                                  <Text variant="body-default-xs">Viewport: {selectedFeedback.metadata.viewport}</Text>
                                </Row>
                              )}
                            </Column>
                          )
                        })()}

                        {/* Captured Events */}
                        {(() => {
                          const consoleLogs = selectedFeedback.consoleLogs || []
                          const errorCount = consoleLogs.filter((l: any) => l.level === 'error').length
                          const warnCount = consoleLogs.filter((l: any) => l.level === 'warn' || l.level === 'warning').length
                          const networkLogs = selectedFeedback.networkLogs || []
                          const failedRequests = networkLogs.filter((l: any) => l.status && l.status >= 400).length
                          return (
                            <Column gap="xs">
                              <Text variant="label-default-s" onBackground="neutral-weak">Eventos Capturados</Text>
                              <Column gap="xs">
                                <Row gap="xs" vertical="center">
                                  <Icon name="monitor" size="xs" />
                                  <Text variant="body-default-xs">{selectedFeedback.metadata?.rrwebEvents?.length ?? 0} eventos de sessão</Text>
                                </Row>
                                <Row gap="xs" vertical="center">
                                  <Icon name="message" size="xs" />
                                  <Text variant="body-default-xs">
                                    {consoleLogs.length} console logs
                                    {errorCount > 0 && <span style={{ color: 'var(--danger-solid-strong)' }}> ({errorCount} {errorCount === 1 ? 'erro' : 'erros'})</span>}
                                    {warnCount > 0 && <span style={{ color: 'var(--warning-solid-strong)' }}> ({warnCount} {warnCount === 1 ? 'aviso' : 'avisos'})</span>}
                                  </Text>
                                </Row>
                                <Row gap="xs" vertical="center">
                                  <Icon name="openLink" size="xs" />
                                  <Text variant="body-default-xs">
                                    {networkLogs.length} requisições de rede
                                    {failedRequests > 0 && <span style={{ color: 'var(--danger-solid-strong)' }}> ({failedRequests} {failedRequests === 1 ? 'falha' : 'falhas'})</span>}
                                  </Text>
                                </Row>
                              </Column>
                            </Column>
                          )
                        })()}
                      </Column>
                    </Card>
                  </div>
                </div>
              </>
            ) : (
              <Flex fillWidth style={{ minHeight: '20rem' }} horizontal="center" vertical="center">
                <FeedbackAlert variant="danger">Não foi possível carregar o report.</FeedbackAlert>
              </Flex>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  )
}
