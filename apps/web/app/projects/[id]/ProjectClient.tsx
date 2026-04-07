'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import AppLayout from '@/components/ui/AppLayout'
import { useOrg } from '@/contexts/OrgContext'
import ProjectFeedbacksTab from './ProjectFeedbacksTab'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { AppIcon } from '@/components/ui/AppIcon'
import { ICON_STROKE } from '@/lib/icon-tokens'

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
  teamMembers?: { id: string; name: string | null; email: string }[]
  currentUserId?: string
}

const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || 'https://feedbackview-proxy.onrender.com'

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
  const sm = (
    <AppIcon size="sm" strokeWidth={ICON_STROKE.emphasis}>
      {action === 'PROJECT_CREATED' && <path d="M12 5v14M5 12h14" />}
      {action === 'PROJECT_UPDATED' && (
        <>
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </>
      )}
      {action === 'STATUS_CHANGED' && (
        <>
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </>
      )}
      {action === 'FEEDBACK_RECEIVED' && <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />}
      {!['PROJECT_CREATED', 'PROJECT_UPDATED', 'STATUS_CHANGED', 'FEEDBACK_RECEIVED'].includes(action) && <circle cx="12" cy="12" r="10" />}
    </AppIcon>
  )
  return sm
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
        {Object.entries(changes).map(([field, { from, to }]) => (
          <span key={field} style={{ fontSize: '1.2rem', color: 'var(--neutral-on-background-weak)' }}>
            {field}: <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{String(from || '—')}</span> → {String(to || '—')}
          </span>
        ))}
      </div>
    )
  }

  if (entry.action === 'STATUS_CHANGED') {
    return (
      <span style={{ fontSize: '1.2rem', color: 'var(--neutral-on-background-weak)', marginTop: '0.125rem', display: 'block' }}>
        &quot;{entry.details.feedbackTitle}&quot;: {entry.details.oldStatusLabel} → {entry.details.newStatusLabel}
      </span>
    )
  }

  if (entry.action === 'FEEDBACK_RECEIVED') {
    return (
      <span style={{ fontSize: '1.2rem', color: 'var(--neutral-on-background-weak)', marginTop: '0.125rem', display: 'block' }}>
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
  teamMembers = [],
  currentUserId,
}: ProjectClientProps) {
  const router = useRouter()
  const { currentOrg } = useOrg()
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
  const [widgetPosition, setWidgetPosition] = useState(project?.widgetPosition || 'middle-right')
  const [widgetColor, setWidgetColor] = useState(project?.widgetColor || '#dc2626')
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
  const prodUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const appBase = (prodUrl || origin).replace('http://', 'https://')

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
        <div className="app-page">
          <div>
            <span>{error}</span>
            <a href="/dashboard">Voltar ao dashboard</a>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="app-page">
      <style>{`.filter-select input { padding-top: 8px !important; padding-bottom: 8px !important; }`}</style>
      {/* Header with breadcrumb + status + stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Breadcrumb + name + status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minWidth: 0, flex: 1 }}>
            <Link
              href="/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '1.2rem',
                color: 'var(--neutral-on-background-weak)',
                textDecoration: 'none',
              }}
            >
              <AppIcon size="sm" strokeWidth={ICON_STROKE.emphasis}><path d="m15 18-6-6 6-6"/></AppIcon>
              Projetos
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h1 className="app-section-title" style={{ fontSize: '1.4rem', margin: 0 }}>{project?.name}</h1>
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
                        gap: '0.6rem',
                        fontSize: '1.2rem',
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
                        gap: '0.6rem',
                        fontSize: '1.2rem',
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
                        gap: '0.6rem',
                        fontSize: '1.2rem',
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
                        gap: '0.6rem',
                        fontSize: '1.2rem',
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
                      gap: '0.6rem',
                      fontSize: '1.2rem',
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
            </div>
            {displayUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '1.4rem',
                    color: 'var(--neutral-on-background-weak)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '24rem',
                  }}
                >
                  {displayUrl}
                </span>
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
                  <AppIcon size="sm" strokeWidth={ICON_STROKE.emphasis}>
                    {copied ? (
                      <polyline points="20 6 9 17 4 12" />
                    ) : (
                      <>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </>
                    )}
                  </AppIcon>
                </button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', padding: '0.8rem 1.2rem', borderRadius: '0.5rem', background: 'var(--neutral-alpha-weak)' }}>
              <span style={{ display: 'block', fontSize: '1.6rem', fontWeight: 700, color: 'var(--neutral-on-background-strong)', lineHeight: 1 }}>{totalCount}</span>
              <span style={{ display: 'block', fontSize: '1.2rem', color: 'var(--neutral-on-background-weak)', marginTop: '0.25rem' }}>Total</span>
            </div>
            <div style={{ textAlign: 'center', padding: '0.8rem 1.2rem', borderRadius: '0.5rem', background: 'var(--neutral-alpha-weak)' }}>
              <span style={{ display: 'block', fontSize: '1.6rem', fontWeight: 700, color: 'var(--warning-on-background-strong)', lineHeight: 1 }}>{openCount}</span>
              <span style={{ display: 'block', fontSize: '1.2rem', color: 'var(--neutral-on-background-weak)', marginTop: '0.25rem' }}>Abertos</span>
            </div>
            {criticalCount > 0 && (
              <div style={{ textAlign: 'center', padding: '0.8rem 1.2rem', borderRadius: '0.5rem', background: 'var(--danger-alpha-weak)' }}>
                <span style={{ display: 'block', fontSize: '1.6rem', fontWeight: 700, color: 'var(--danger-on-background-strong)', lineHeight: 1 }}>{criticalCount}</span>
                <span style={{ display: 'block', fontSize: '1.2rem', color: 'var(--neutral-on-background-weak)', marginTop: '0.25rem' }}>Críticos</span>
              </div>
            )}
            <div style={{ textAlign: 'center', padding: '0.8rem 1.2rem', borderRadius: '0.5rem', background: 'var(--neutral-alpha-weak)' }}>
              <span style={{ display: 'block', fontSize: '1.6rem', fontWeight: 700, color: 'var(--success-on-background-strong)', lineHeight: 1 }}>{resolvedCount}</span>
              <span style={{ display: 'block', fontSize: '1.2rem', color: 'var(--neutral-on-background-weak)', marginTop: '0.25rem' }}>Concluídas</span>
            </div>
          </div>
        </div>

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
                  fontSize: '1.2rem', fontWeight: 700,
                  color: 'var(--brand-on-background-strong)',
                }}>
                  {completedCount}/{steps.length}
                </span>
              </div>
              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '1.4rem', fontWeight: 600,
                  color: 'var(--neutral-on-background-strong)',
                  marginBottom: 2,
                }}>
                  {currentStep?.label || 'Configure seu projeto'}
                </div>
                <div style={{
                  fontSize: '1.2rem',
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
                    fontSize: '1.4rem',
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
        <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '2px solid var(--neutral-border-medium)' }}>
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
                gap: '0.6rem',
                padding: '0.5rem 0 0.75rem',
                fontSize: '1.4rem',
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
                    fontSize: '1.2rem',
                    background: activeTab === tab.key ? 'var(--brand-alpha-weak)' : 'var(--neutral-alpha-weak)',
                    color: activeTab === tab.key ? 'var(--brand-on-background-strong)' : 'var(--neutral-on-background-weak)',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '999px',
                    fontWeight: 500,
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Feedbacks tab — uses shared ClickUp-style components */}
        {activeTab === 'feedbacks' && project && (
          <ProjectFeedbacksTab
            feedbacks={localFeedbacks.map(f => ({ ...f, projectId: project.id, Project: { id: project.id, name: project.name } }))}
            feedbackAssigneesMap={localAssigneesMap}
            teamMembers={teamMembers}
            currentUserId={currentUserId}
            projectName={project.name}
            organizationId={project.organizationId ?? null}
            currentPlanForUpgrade={
              currentOrg != null && currentOrg.id === project.organizationId
                ? currentOrg.plan
                : 'FREE'
            }
          />
        )}

        {/* OLD feedbacks tab removed — replaced by ProjectFeedbacksTab above */}
        {false && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <AppIcon
                  size="md"
                  strokeWidth={ICON_STROKE.emphasis}
                  style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--neutral-on-background-weak)' }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </AppIcon>
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
                    fontSize: '1.4rem',
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
                  <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}>
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="7" y1="12" x2="17" y2="12" />
                    <line x1="10" y1="18" x2="14" y2="18" />
                  </AppIcon>
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
                      <span>Tipo</span>
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
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
                              fontSize: '1.2rem',
                              fontWeight: typeFilter === val ? 600 : 400,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <span>Severidade</span>
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
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
                              fontSize: '1.2rem',
                              fontWeight: severityFilter === val ? 600 : 400,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <span>Status</span>
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
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
                              fontSize: '1.2rem',
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
                          <span>Responsável</span>
                          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
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
                                  fontSize: '1.2rem',
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
                            fontSize: '1.2rem',
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
                  <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}>
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                  </AppIcon>
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
                  <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}>
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </AppIcon>
                </button>
              </div>
            </div>

            {filteredFeedbacks.length === 0 ? (
              <div style={{ textAlign: 'center' }}>
                <div>
                  <div
                    style={{
                      width: '3rem',
                      height: '3rem',
                      background: 'var(--neutral-alpha-weak)',
                    }}
                  >
                    <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></AppIcon>
                  </div>
                  <span>
                    {localFeedbacks.length === 0
                      ? 'Nenhum report ainda. Compartilhe a URL do visualizador!'
                      : 'Nenhum report com os filtros selecionados.'}
                  </span>
                </div>
              </div>
            ) : reportViewMode === 'card' ? (
              <div>
                {filteredFeedbacks.map((feedback) => (
                  <div
                    key={feedback.id}
                    onClick={() => openFeedbackModal(feedback.id)}
                    style={{ transition: 'box-shadow 0.15s ease', cursor: 'pointer' }}
                  >
                    <div>
                      {feedback.screenshotUrl && (
                        <div style={{ flexShrink: 0 }}>
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
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div>
                          <span style={{ display: "inline-flex", alignItems: "center", padding: "0.125rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "var(--neutral-alpha-weak)", color: "var(--neutral-on-background-weak)" }}></span>
                          {feedback.severity && (
                            <span style={{ display: "inline-flex", alignItems: "center", padding: "0.125rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "var(--neutral-alpha-weak)", color: "var(--neutral-on-background-weak)" }}></span>
                          )}
                          <span style={{ display: "inline-flex", alignItems: "center", padding: "0.125rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "var(--neutral-alpha-weak)", color: "var(--neutral-on-background-weak)" }}></span>
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
                        </div>
                        <span
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {feedback.comment}
                        </span>
                        <div>
                          <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                          <span>
                            {formatDate(feedback.createdAt)}
                          </span>
                          {feedback.pageUrl && (
                            <>
                              <span>|</span>
                              <span
                                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '15rem' }}
                              >
                                {feedback.pageUrl}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ overflow: 'hidden' }}>
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
                  <span>Tipo</span>
                  <span>Comentário</span>
                  <span>Severidade</span>
                  <span>Status</span>
                  <span>Responsável</span>
                  <span>Data</span>
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
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "0.125rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "var(--neutral-alpha-weak)", color: "var(--neutral-on-background-weak)" }}></span>
                    <span
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {feedback.comment}
                    </span>
                    {feedback.severity ? (
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "0.125rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "var(--neutral-alpha-weak)", color: "var(--neutral-on-background-weak)" }}></span>
                    ) : (
                      <span />
                    )}
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "0.125rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "var(--neutral-alpha-weak)", color: "var(--neutral-on-background-weak)" }}></span>
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
                    <span style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(feedback.createdAt)}
                    </span>
                    <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings tab (keep this) */}
        {activeTab === 'settings' && (
          <div className="project-settings-tab">
            {!canEdit && (
              <Alert>
                Apenas o proprietário ou administrador da organização pode alterar as configurações do projeto.
              </Alert>
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
                <div className="project-settings-surface">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <h3 className="project-settings-heading">
                        Primeiros passos
                      </h3>
                      <p className="project-settings-lede" style={{ marginTop: 0 }}>
                        {completedCount} de {steps.length} etapas
                      </p>
                    </div>
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
                    </div>
                    <div className="project-settings-setup-divider" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
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
                                  <AppIcon size="xs" strokeWidth={3} style={{ color: '#fff' }}>
                                    <polyline points="20 6 9 17 4 12" />
                                  </AppIcon>
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
                              <span
                                style={{ fontWeight: isCurrent ? 600 : 400, color: step.done ? 'var(--neutral-on-background-strong)' : isCurrent ? 'var(--brand-on-background-strong)' : 'var(--neutral-on-background-weak)' }}
                              >
                                {step.label}
                              </span>
                              {isCurrent && isEmbed && step.label === 'Adicionar script ao site' && (
                                <div style={{ marginTop: 8 }}>
                                  <pre
                                    style={{
                                      width: '100%',
                                      background: 'var(--neutral-solid-strong)',
                                      color: '#4ade80',
                                      fontSize: '1.2rem',
                                      borderRadius: '0.375rem',
                                      padding: '0.8rem 1.2rem',
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
                                      gap: '0.5rem',
                                      padding: '0.25rem 0.625rem',
                                      borderRadius: '0.375rem',
                                      border: '1px solid var(--neutral-border-medium)',
                                      background: 'var(--surface-background)',
                                      color: copiedEmbed ? 'var(--success-on-background-strong)' : 'var(--neutral-on-background-strong)',
                                      fontSize: '1.2rem',
                                      fontWeight: 500,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <AppIcon size="xs" strokeWidth={ICON_STROKE.emphasis}>
                                      {copiedEmbed ? (
                                        <polyline points="20 6 9 17 4 12" />
                                      ) : (
                                        <>
                                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                        </>
                                      )}
                                    </AppIcon>
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
                                      gap: '0.5rem',
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
                                      fontSize: '1.2rem',
                                      fontWeight: 500,
                                      cursor: connectionStatus === 'checking' ? 'wait' : 'pointer',
                                      transition: 'all 0.15s',
                                    }}
                                  >
                                    <AppIcon size="xs" strokeWidth={ICON_STROKE.emphasis}>
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
                                    </AppIcon>
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
                                      gap: '0.5rem',
                                      padding: '0.25rem 0.625rem',
                                      borderRadius: '0.375rem',
                                      border: '1px solid var(--neutral-border-medium)',
                                      background: 'var(--surface-background)',
                                      color: 'var(--neutral-on-background-strong)',
                                      fontSize: '1.2rem',
                                      fontWeight: 500,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <AppIcon size="xs" strokeWidth={ICON_STROKE.emphasis}>
                                      <circle cx="12" cy="12" r="10" />
                                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                      <line x1="12" y1="17" x2="12.01" y2="17" />
                                    </AppIcon>
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
                                      fontSize: '1.2rem',
                                      borderRadius: '0.375rem',
                                      padding: '0.8rem 1.2rem',
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
                                      gap: '0.5rem',
                                      padding: '0.25rem 0.625rem',
                                      borderRadius: '0.375rem',
                                      border: '1px solid var(--neutral-border-medium)',
                                      background: 'var(--surface-background)',
                                      color: copied ? 'var(--success-on-background-strong)' : 'var(--neutral-on-background-strong)',
                                      fontSize: '1.2rem',
                                      fontWeight: 500,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <AppIcon size="xs" strokeWidth={ICON_STROKE.emphasis}>
                                      {copied ? (
                                        <polyline points="20 6 9 17 4 12" />
                                      ) : (
                                        <>
                                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                        </>
                                      )}
                                    </AppIcon>
                                    {copied ? 'Copiado!' : 'Copiar'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
              )
            })()}

            {/* Edit project */}
            <div className="project-settings-surface">
              <div className="project-settings-card-header">
                <div className="project-settings-card-header__main">
                  <div className="project-settings-card-header__text">
                    <h3 className="project-settings-heading">Projeto</h3>
                    <p className="project-settings-lede" style={{ marginTop: 0 }}>
                      Nome e descrição podem ser editados. A URL de monitoramento é fixa.
                    </p>
                  </div>
                </div>
                {!editing && canEdit && (
                  <button type="button" onClick={() => setEditing(true)} className="app-btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '1.4rem', flexShrink: 0 }}>
                    Editar
                  </button>
                )}
              </div>

                {editing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label htmlFor="edit-name" className="project-settings-field-label">
                        Nome
                      </label>
                      <input
                        id="edit-name"
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="app-input"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-description" className="project-settings-field-label">
                        Descrição
                      </label>
                      <textarea
                        id="edit-description"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Opcional"
                        className="app-input"
                        style={{ minHeight: '4.5rem', resize: 'vertical' }}
                      />
                    </div>
                    <div>
                      <span className="project-settings-field-label">URL alvo</span>
                      <div className="project-settings-readonly">{project?.url ?? '—'}</div>
                      <span className="project-settings-hint">Fixa após criar o projeto.</span>
                    </div>
                    {editError && <Alert>{editError}</Alert>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <button type="button" onClick={handleEditSave} disabled={editSaving} className="app-btn-primary">
                        {editSaving ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(false)
                          setEditName(project?.name ?? '')
                          setEditDescription(project?.description ?? '')
                          setEditError(null)
                        }}
                        disabled={editSaving}
                        className="app-btn-secondary"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="project-settings-meta">
                    {[
                      { label: 'ID', value: project?.id, mono: true },
                      { label: 'Nome', value: project?.name },
                      ...(project?.description ? [{ label: 'Descrição', value: project.description }] : []),
                      { label: 'URL', value: project?.url, link: true },
                      ...(project?.ownerName ? [{ label: 'Criado por', value: project.ownerName }] : []),
                      { label: 'Data', value: project?.createdAt ? formatDate(project.createdAt) : '-' },
                    ].map((row) => (
                      <div key={row.label} className="project-settings-meta__row">
                        <div className="project-settings-meta__label">{row.label}</div>
                        {row.mono ? (
                          <div className="project-settings-meta__value project-settings-meta__value--mono">{row.value}</div>
                        ) : row.link ? (
                          <div className="project-settings-meta__value">
                            <a href={String(row.value)} target="_blank" rel="noopener noreferrer">
                              {row.value}
                            </a>
                          </div>
                        ) : (
                          <div className="project-settings-meta__value">{row.value}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {canEdit && project ? (
              <div className="project-settings-surface">
                <div className="project-settings-card-header">
                  <div className="project-settings-card-header__main">
                    <div className="project-settings-card-header__text">
                      <h3 className="project-settings-heading">Integrações</h3>
                      <p className="project-settings-lede" style={{ marginTop: 0 }}>
                        Vincule este projeto em <strong>Configurações → Integrações</strong>.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!project.organizationId}
                    onClick={() => {
                      if (!project.organizationId) return
                      const q = new URLSearchParams({ orgId: project.organizationId })
                      void router.push(`/settings/integrations?${q.toString()}`)
                    }}
                    className="app-btn-secondary"
                    style={{ padding: '0.375rem 0.75rem', fontSize: '1.4rem', flexShrink: 0 }}
                  >
                    Abrir Integrações
                  </button>
                </div>
                {project.organizationId && currentOrg?.id !== project.organizationId && (
                  <Alert>
                    Selecione no menu da equipe a organização deste projeto antes de abrir Integrações.
                  </Alert>
                )}
                {!project.organizationId && (
                  <p className="project-settings-lede" style={{ margin: 0 }}>
                    Associe o projeto a uma organização para habilitar integrações.
                  </p>
                )}
              </div>
            ) : null}

            {/* Widget appearance */}
            <div className="project-settings-surface">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="project-settings-card-header">
                  <div className="project-settings-card-header__main">
                    <div className="project-settings-card-header__text">
                      <h3 className="project-settings-heading">Aparência do widget</h3>
                      <p className="project-settings-lede" style={{ marginTop: 0 }}>
                        Estilo, posição e cor do botão no site.
                      </p>
                    </div>
                  </div>
                </div>

                {appearanceMsg && (
                  <Alert variant={appearanceMsg.type}>{appearanceMsg.text}</Alert>
                )}

                <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {/* Controls */}
                  <div style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Widget style */}
                    <div>
                      <span className="project-settings-muted-caption">Estilo do botão</span>
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
                            <span style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>
                              {s === 'text' ? 'Texto' : 'Ícone'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Widget position */}
                    <div>
                      <span className="project-settings-muted-caption">Posição</span>
                      <div style={{
                        width: '100%',
                        aspectRatio: '16 / 10',
                        maxWidth: 260,
                        borderRadius: '0.75rem',
                        border: '1px solid var(--neutral-border-medium)',
                        background: 'var(--surface-background)',
                        position: 'relative',
                      }}>
                        {/* Empty space for clean look */}
                        {/* 8 clickable dots */}
                        {([
                          { value: 'top-left', style: { top: 8, left: 8 } },
                          { value: 'top-center', style: { top: 8, left: '50%', transform: 'translateX(-50%)' } },
                          { value: 'top-right', style: { top: 8, right: 8 } },
                          { value: 'middle-left', style: { top: '50%', left: 8, transform: 'translateY(-50%)' } },
                          { value: 'middle-right', style: { top: '50%', right: 8, transform: 'translateY(-50%)' } },
                          { value: 'bottom-left', style: { bottom: 8, left: 8 } },
                          { value: 'bottom-center', style: { bottom: 8, left: '50%', transform: 'translateX(-50%)' } },
                          { value: 'bottom-right', style: { bottom: 8, right: 8 } },
                        ] as { value: string; style: React.CSSProperties }[]).map((pos) => {
                          const isActive = widgetPosition === pos.value
                          return (
                            <button
                              key={pos.value}
                              onClick={() => setWidgetPosition(pos.value)}
                              title={pos.value.replace('top-', 'Superior ').replace('bottom-', 'Inferior ').replace('middle-', 'Meio ').replace('left', 'esquerda').replace('right', 'direita').replace('center', 'centro')}
                              style={{
                                position: 'absolute',
                                ...pos.style,
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <div style={{
                                width: isActive ? 16 : 10,
                                height: isActive ? 16 : 10,
                                borderRadius: '50%',
                                background: isActive ? widgetColor : 'var(--neutral-alpha-medium)',
                                border: isActive ? '2px solid #fff' : '2px solid transparent',
                                boxShadow: isActive ? `0 0 0 2px ${widgetColor}, 0 2px 8px ${widgetColor}66` : 'none',
                                transition: 'all 0.2s ease',
                                pointerEvents: 'none',
                              }} />
                            </button>
                          )
                        })}
                      </div>
                      <span style={{ fontSize: '1.2rem', color: 'var(--neutral-on-background-weak)', marginTop: 6, display: 'block' }}>
                        {widgetPosition.replace('top-', 'Superior ').replace('bottom-', 'Inferior ').replace('middle-', 'Meio ').replace('left', 'esquerda').replace('right', 'direita').replace('center', 'centro')}
                      </span>
                    </div>

                    {/* Widget color */}
                    <div>
                      <span className="project-settings-muted-caption">Cor</span>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginLeft: '0.25rem' }}>
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
                              fontSize: '1.2rem',
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
                  <div style={{ width: 280, flex: '1 1 260px', maxWidth: '100%', flexShrink: 0 }}>
                    <span className="project-settings-muted-caption">Pré-visualização</span>
                    <div style={{
                      borderRadius: '0.75rem',
                      border: '1px solid var(--neutral-border-medium)',
                      overflow: 'hidden',
                      background: 'var(--surface-background)',
                    }}>
                      {/* Mock browser bar */}
                      <div style={{
                        padding: '0.8rem 1.2rem',
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
                          fontSize: '1.2rem',
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
                            ...(widgetPosition.includes('top') ? { top: 10 } : widgetPosition.includes('middle') ? { top: '50%', transform: 'translateY(-50%)' } : { bottom: 10 }),
                            ...(widgetPosition.includes('left') ? { left: 10 } : widgetPosition.includes('center') ? { left: '50%', transform: 'translateX(-50%)' } : { right: 10 }),
                          } : {
                            // Text style: tag grudada na borda
                            ...(widgetPosition.includes('center') ? {
                              // Centro: horizontal, grudado top/bottom
                              ...(widgetPosition.includes('top') ? { top: 0 } : { bottom: 0 }),
                              left: '50%', transform: 'translateX(-50%)',
                            } : {
                              // Laterais: vertical, grudado left/right
                              ...(widgetPosition.includes('top') ? { top: 10 } : widgetPosition.includes('middle') ? { top: '50%', transform: 'translateY(-50%)' } : { bottom: 10 }),
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

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={handleAppearanceSave} disabled={!canEdit} className="app-btn-primary">{appearanceSaving ? 'Salvando...' : 'Salvar aparência'}</button>
                </div>
              </div>
            </div>

            {/* Shared URL — only for proxy mode */}
            {(project?.mode ?? 'proxy') === 'proxy' && (
              <div className="project-settings-surface">
                <div className="project-settings-card-header">
                  <div className="project-settings-card-header__main">
                    <div className="project-settings-card-header__text">
                      <h3 className="project-settings-heading">Link do visualizador</h3>
                      <p className="project-settings-lede" style={{ marginTop: 0 }}>
                        Acesso para a equipe testar pelo navegador.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="project-settings-inline-field">
                  <div className="project-settings-inline-field__input" title={viewerUrl}>
                    {viewerUrl}
                  </div>
                  <button type="button" onClick={copyViewerUrl} className="app-btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '1.4rem', flexShrink: 0 }}>
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}

            {/* Embed script — only for embed mode */}
            {(project?.mode ?? 'proxy') === 'embed' && (
              <div className="project-settings-surface">
                <div className="project-settings-card-header">
                  <div className="project-settings-card-header__main">
                    <div className="project-settings-card-header__text">
                      <h3 className="project-settings-heading">Script no site</h3>
                      <p className="project-settings-lede" style={{ marginTop: 0 }}>
                        Cole antes de <code style={{ fontSize: '1.2rem' }}>&lt;/body&gt;</code>.
                      </p>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <pre
                    style={{
                      width: '100%',
                      background: 'var(--neutral-solid-strong)',
                      color: '#4ade80',
                      fontSize: '1.2rem',
                      borderRadius: '0.5rem',
                      padding: '1rem',
                      overflow: 'auto',
                      fontFamily: 'monospace',
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      border: '1px solid var(--neutral-border-medium)',
                    }}
                  >
                    {embedSnippet}
                  </pre>
                  <div>
                    <button type="button" onClick={copyEmbedSnippet} className="app-btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '1.4rem' }}>
                      {copiedEmbed ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pause/Resume embed connection */}
            {(project?.mode ?? 'proxy') === 'embed' && (
              <div className="project-settings-surface">
                <div className="project-settings-card-header">
                  <div className="project-settings-card-header__main">
                    <div className="project-settings-card-header__text">
                      <h3 className="project-settings-heading">Widget no site</h3>
                      <p className="project-settings-lede" style={{ marginTop: 0 }}>
                        {embedPaused
                          ? 'Pausado — não aparece e não recebe reports.'
                          : 'Ativo — visível para visitantes.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleEmbedPause}
                    disabled={!canEdit}
                    className="app-btn-primary"
                    style={{ padding: '0.375rem 0.875rem', fontSize: '1.4rem', flexShrink: 0 }}
                  >
                    {pauseToggling ? (embedPaused ? 'Retomando...' : 'Pausando...') : (embedPaused ? 'Retomar' : 'Pausar')}
                  </button>
                </div>
              </div>
            )}

            {/* Archive project */}
            <div className="project-settings-surface project-settings-surface--warning">
              <div className="project-settings-card-header" style={{ borderBottomColor: 'var(--warning-border-medium)' }}>
                <div className="project-settings-card-header__main">
                  <div className="project-settings-card-header__text">
                    <h3 className="project-settings-heading" style={{ color: 'var(--warning-on-background-strong)' }}>
                      Arquivar projeto
                    </h3>
                    <p className="project-settings-lede" style={{ marginTop: 0 }}>
                      Some da lista; reports e histórico permanecem.
                    </p>
                  </div>
                </div>
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={!canEdit}
                    className="app-btn-secondary"
                    style={{ padding: '0.375rem 0.75rem', fontSize: '1.4rem', flexShrink: 0 }}
                  >
                    Arquivar projeto
                  </button>
                ) : null}
              </div>

                {showDeleteConfirm ? (
                  <div
                    style={{ marginTop: '1rem', background: 'var(--warning-alpha-weak)', padding: '1rem', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid var(--warning-border-medium)' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 500, color: 'var(--neutral-on-background-strong)' }}>
                        Tem certeza que deseja arquivar o projeto <code style={{ background: 'var(--warning-alpha-medium)', padding: '2px 6px', borderRadius: '4px', fontSize: '1.2rem' }}>{project?.name}</code>?
                      </span>
                      {deleteError && (
                        <Alert>{deleteError}</Alert>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" onClick={handleArchive} className="app-btn-danger">Confirmar arquivamento</button>
                        <button type="button" onClick={() => {
                            setShowDeleteConfirm(false)
                            setDeleteError(null)
                          }} className="app-btn-secondary">Cancelar</button>
                      </div>
                    </div>
                  </div>
                ) : null}
            </div>
          </div>
        )}

        {/* History tab */}
        {activeTab === 'history' && (
          <div className="app-card">
            {activityLog.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '3rem 1rem', textAlign: 'center' }}>
                <AppIcon size={40} style={{ opacity: 0.5, color: 'var(--neutral-on-background-weak)' }}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </AppIcon>
                <span style={{ fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>
                  Nenhuma atividade registrada ainda.
                </span>
                <span className="app-section-sub" style={{ maxWidth: '24rem' }}>
                  Ações como editar o projeto, alterar status de reports e novos reports serão exibidas aqui.
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {activityLog.map((entry, i) => {
                  const isLast = i === activityLog.length - 1
                  return (
                    <div
                      key={entry.id}
                      style={{
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start',
                        padding: '0.875rem 0',
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
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '1.4rem', color: 'var(--neutral-on-background-strong)' }}>
                            {getActionLabel(entry.action)}
                          </span>
                          <span style={{ fontSize: '1.4rem', color: 'var(--neutral-on-background-weak)' }}>
                            {formatDate(entry.createdAt)}
                          </span>
                        </div>
                        {entry.userEmail && (
                          <span style={{ fontSize: '1.4rem', color: 'var(--neutral-on-background-weak)' }}>
                            por {entry.userEmail}
                          </span>
                        )}
                        {renderActivityDetails(entry)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

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
              border: '1px solid var(--neutral-border-medium)',
              borderRadius: 'var(--radius-l, 1rem)',
              width: '100%',
              maxWidth: 560,
              maxHeight: '85vh',
              overflow: 'auto',
              padding: '2rem',
              position: 'relative',
              boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
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
              <AppIcon size="lg" strokeWidth={ICON_STROKE.emphasis}>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </AppIcon>
            </button>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--neutral-on-background-strong)', margin: '0 0 0.5rem' }}>
              Como instalar o widget
            </h2>
            <p style={{ fontSize: '1.4rem', color: 'var(--neutral-on-background-weak)', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
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
                    fontSize: '1.2rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {item.step}
                  </span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>
                    {item.title}
                  </span>
                </div>
                <div style={{ marginLeft: 36 }}>
                  <p style={{ fontSize: '1.4rem', color: 'var(--neutral-on-background-weak)', margin: '0 0 0.5rem', lineHeight: 1.5 }}>
                    {item.description}
                  </p>
                  {item.code && (
                    <pre style={{
                      background: 'var(--neutral-solid-strong)',
                      color: '#4ade80',
                      fontSize: '1.2rem',
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
                      fontSize: '1.2rem',
                      color: 'var(--neutral-on-background-strong)',
                      lineHeight: 1.6,
                    }}>
                      <span style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Onde colar em cada framework:</span>
                      {item.tips.map((tip) => (
                        <div key={tip} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--brand-on-background-strong)', flexShrink: 0 }}>•</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '1.2rem' }}>{tip}</span>
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
              fontSize: '1.4rem',
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
              <div style={{ minHeight: '20rem' }}>
                <div>
                  <Spinner />
                  <span>Carregando report...</span>
                </div>
              </div>
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
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "0.125rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "var(--neutral-alpha-weak)", color: "var(--neutral-on-background-weak)" }}></span>
                  <span
                    style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
                  >
                    {selectedFeedback.title || selectedFeedback.comment?.slice(0, 80) || 'Report'}
                  </span>
                  <button onClick={closeFeedbackModal} title="Fechar" style={{ border: "none", background: "transparent", cursor: "pointer", padding: "0.25rem", color: "var(--neutral-on-background-weak)", display: "inline-flex", alignItems: "center" }}><AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></AppIcon></button>
                </div>

                {/* Modal content */}
                <div style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  {/* Left column */}
                  <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Warning for non-embed reports that have rrweb events */}
                    {selectedFeedback.metadata?.rrwebEvents && selectedFeedback.metadata.rrwebEvents.length > 0 && selectedFeedback.metadata?.source !== 'embed' && (
                      <div style={{ background: 'var(--warning-alpha-weak)', border: '1px solid var(--warning-border-medium)' }}>
                        <div>
                          <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></AppIcon>
                          <div>
                            <span>Report via URL compartilhada</span>
                            <span>O Session Replay não está disponível para reports enviados via URL compartilhada. Utilize o screenshot como referência visual.</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Session Replay (only for embed source — replay is unreliable in proxy mode) */}
                    {selectedFeedback.metadata?.rrwebEvents && selectedFeedback.metadata.rrwebEvents.length > 0 && selectedFeedback.metadata?.source === 'embed' && (
                      <div style={{ overflow: 'hidden', padding: 0 }}>
                        <SessionReplay events={selectedFeedback.metadata.rrwebEvents} />
                      </div>
                    )}

                    {/* Screenshot */}
                    {selectedFeedback.screenshotUrl && (
                      <div>
                        <div>
                          <h2>Screenshot</h2>
                          <img
                            src={selectedFeedback.screenshotUrl}
                            alt="Screenshot"
                            style={{ width: '100%', borderRadius: '0.5rem', border: '1px solid var(--neutral-border-medium)' }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <div>
                        <div>
                          <h2>Descrição</h2>
                          {!feedbackEditingComment && (
                            <button onClick={() => { setFeedbackCommentDraft(selectedFeedback.comment); setFeedbackEditingComment(true) }} title="Editar" style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0.25rem', color: 'var(--neutral-on-background-weak)', display: 'inline-flex', alignItems: 'center' }}><AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></AppIcon></button>
                          )}
                        </div>
                        {feedbackEditingComment ? (
                          <div>
                            <textarea
                              id="modal-comment-edit"
                              value={feedbackCommentDraft}
                              onChange={(e) => setFeedbackCommentDraft(e.target.value)}
                              disabled={feedbackCommentSaving}
                            />
                            <div>
                              <button onClick={() => setFeedbackEditingComment(false)} disabled={feedbackCommentSaving} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--neutral-border-medium)', background: 'var(--surface-background)', color: 'var(--neutral-on-background-strong)', fontSize: '1.4rem', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                              <button onClick={handleFeedbackCommentSave} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'var(--brand-solid-strong)', color: '#fff', fontSize: '1.4rem', fontWeight: 600, cursor: 'pointer' }}>Salvar</button>
                            </div>
                          </div>
                        ) : (
                          <span style={{ whiteSpace: 'pre-wrap' }}>{selectedFeedback.comment}</span>
                        )}
                      </div>
                    </div>

                    {/* Steps / Expected / Actual */}
                    {(selectedFeedback.metadata?.stepsToReproduce || selectedFeedback.metadata?.expectedResult || selectedFeedback.metadata?.actualResult) && (
                      <div>
                        <div>
                          {selectedFeedback.metadata?.stepsToReproduce && (
                            <div>
                              <h2>Passos para reproduzir</h2>
                              <span style={{ whiteSpace: 'pre-wrap' }}>{selectedFeedback.metadata.stepsToReproduce}</span>
                            </div>
                          )}
                          {selectedFeedback.metadata?.expectedResult && (
                            <div>
                              <h2>Resultado esperado</h2>
                              <span style={{ whiteSpace: 'pre-wrap' }}>{selectedFeedback.metadata.expectedResult}</span>
                            </div>
                          )}
                          {selectedFeedback.metadata?.actualResult && (
                            <div>
                              <h2>Resultado real</h2>
                              <span style={{ whiteSpace: 'pre-wrap' }}>{selectedFeedback.metadata.actualResult}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Network Logs */}
                    {(selectedFeedback.networkLogs?.length ?? 0) > 0 && (
                      <div style={{ overflow: 'hidden' }}>
                        <div>
                          <div
                            onClick={() => setFeedbackNetworkOpen(!feedbackNetworkOpen)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', cursor: 'pointer' }}
                          >
                            <h2>Network Logs ({selectedFeedback.networkLogs!.length})</h2>
                            <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                          </div>
                          {feedbackNetworkOpen && (
                            <div style={{ maxHeight: '20rem', overflowY: 'auto' }}>
                              {selectedFeedback.networkLogs!.map((log, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderTop: '1px solid var(--neutral-border-medium)' }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", padding: "0.125rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "var(--neutral-alpha-weak)", color: "var(--neutral-on-background-weak)" }}></span>
                                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.2rem', flexShrink: 0 }}>{log.method}</span>
                                  <span style={{ fontFamily: 'monospace', fontSize: '1.2rem', color: 'var(--neutral-on-background-weak)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }} title={log.url}>{log.url}</span>
                                  {log.duration != null && <span style={{ fontFamily: 'monospace', fontSize: '1.2rem', color: 'var(--neutral-on-background-weak)', flexShrink: 0 }}>{log.duration}ms</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Console Logs */}
                    {(selectedFeedback.consoleLogs?.length ?? 0) > 0 && (
                      <div style={{ overflow: 'hidden' }}>
                        <div>
                          <div
                            onClick={() => setFeedbackConsoleOpen(!feedbackConsoleOpen)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', cursor: 'pointer' }}
                          >
                            <h2>Console Logs ({selectedFeedback.consoleLogs!.length})</h2>
                            <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                          </div>
                          {feedbackConsoleOpen && (
                            <div style={{ maxHeight: '20rem', overflowY: 'auto' }}>
                              {selectedFeedback.consoleLogs!.map((log, i) => {
                                const level = log.level?.toUpperCase() ?? 'LOG'
                                const variant = level === 'ERROR' ? 'danger' : level === 'WARN' ? 'warning' : 'info'
                                return (
                                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem 1rem', borderTop: '1px solid var(--neutral-border-medium)' }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", padding: "0.125rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "var(--neutral-alpha-weak)", color: "var(--neutral-on-background-weak)" }}></span>
                                    <span style={{ fontFamily: 'monospace', fontSize: '1.2rem', color: 'var(--neutral-on-background-weak)', wordBreak: 'break-word', flex: 1, minWidth: 0 }}>{log.message}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right sidebar */}
                  <div style={{ flex: 1, minWidth: '14rem', maxWidth: '18rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '4.5rem' }}>
                    {/* Status */}
                    <div>
                      <div>
                        <h2>Status</h2>
                        <div>
                          {[
                            { value: 'OPEN', label: 'Aberto' },
                            { value: 'IN_PROGRESS', label: 'Em andamento' },
                            { value: 'UNDER_REVIEW', label: 'Sob revisão' },
                            { value: 'RESOLVED', label: 'Concluída' },
                            { value: 'CANCELLED', label: 'Cancelado' },
                          ].map((opt) => (
                            <span style={{ display: "inline-flex", alignItems: "center", padding: "0.125rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "var(--neutral-alpha-weak)", color: "var(--neutral-on-background-weak)" }}></span>
                          ))}
                        </div>
                        {feedbackStatusSaving && (
                          <div>
                            <Spinner />
                            <span>Salvando...</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Assignees */}
                    <div>
                      <div>
                        <div>
                          <h2>Responsáveis</h2>
                          {feedbackAssignSaving && <Spinner />}
                        </div>
                        {feedbackAssignees.length === 0 && (
                          <span>Nenhum responsável.</span>
                        )}
                        {feedbackAssignees.length > 0 && (
                          <div>
                            {feedbackAssignees.map((a) => (
                              <div key={a.userId} style={{ padding: '4px 0' }}>
                                <div>
                                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--neutral-alpha-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>
                                    {(a.name || a.email).charAt(0).toUpperCase()}
                                  </div>
                                  <span>{a.name || a.email.split('@')[0]}</span>
                                </div>
                                {(userRole === 'OWNER' || userRole === 'ADMIN') && (
                                  <button onClick={() => handleFeedbackUnassign(a.userId)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--neutral-on-background-weak)', fontSize: 13, padding: '2px 4px' }} title="Remover">✕</button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {(userRole === 'OWNER' || userRole === 'ADMIN') && (
                          <div style={{ position: 'relative' }}>
                            <button onClick={() => setShowFeedbackAssignDropdown(!showFeedbackAssignDropdown)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'transparent', color: 'var(--neutral-on-background-weak)', fontSize: '1.4rem', fontWeight: 600, cursor: 'pointer' }}>+ Atribuir</button>
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
                      </div>
                    </div>

                    {/* Details */}
                    <div>
                      <div>
                        <h2>Detalhes</h2>

                        {/* Tags */}
                        <div>
                          <span>Tipo e Severidade</span>
                          <div>
                            <span style={{ display: "inline-flex", alignItems: "center", padding: "0.125rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "var(--neutral-alpha-weak)", color: "var(--neutral-on-background-weak)" }}></span>
                            {selectedFeedback.severity && (
                              <span style={{ display: "inline-flex", alignItems: "center", padding: "0.125rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "var(--neutral-alpha-weak)", color: "var(--neutral-on-background-weak)" }}></span>
                            )}
                          </div>
                        </div>

                        {/* Source badge */}
                        {selectedFeedback.metadata?.source && (
                          <div>
                            <span>Origem</span>
                            <span style={{ display: "inline-flex", alignItems: "center", padding: "0.125rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "var(--neutral-alpha-weak)", color: "var(--neutral-on-background-weak)" }}></span>
                          </div>
                        )}

                        {/* Page URL */}
                        {selectedFeedback.pageUrl && (
                          <div>
                            <span>Página</span>
                            <a
                              href={selectedFeedback.pageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: '1.2rem',
                                wordBreak: 'break-all',
                                color: 'var(--brand-on-background-strong)',
                                textDecoration: 'underline',
                                textUnderlineOffset: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                              }}
                            >
                              {selectedFeedback.pageUrl}
                              <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                            </a>
                          </div>
                        )}

                        {/* Date */}
                        <div>
                          <span>Data</span>
                          <div>
                            <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                            <span>{formatDate(selectedFeedback.createdAt)}</span>
                          </div>
                        </div>

                        {/* User Agent (parsed) + Viewport */}
                        {selectedFeedback.userAgent && (() => {
                          const { os, browser } = parseUserAgent(selectedFeedback.userAgent)
                          return (
                            <div>
                              <span>Navegador</span>
                              <div>
                                <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                                <span>{os} • {browser}</span>
                              </div>
                              {selectedFeedback.metadata?.viewport && (
                                <div>
                                  <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                                  <span>Viewport: {selectedFeedback.metadata.viewport}</span>
                                </div>
                              )}
                            </div>
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
                            <div>
                              <span>Eventos Capturados</span>
                              <div>
                                <div>
                                  <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                                  <span>{selectedFeedback.metadata?.rrwebEvents?.length ?? 0} eventos de sessão</span>
                                </div>
                                <div>
                                  <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></AppIcon>
                                  <span>
                                    {consoleLogs.length} console logs
                                    {errorCount > 0 && <span style={{ color: 'var(--danger-solid-strong)' }}> ({errorCount} {errorCount === 1 ? 'erro' : 'erros'})</span>}
                                    {warnCount > 0 && <span style={{ color: 'var(--warning-solid-strong)' }}> ({warnCount} {warnCount === 1 ? 'aviso' : 'avisos'})</span>}
                                  </span>
                                </div>
                                <div>
                                  <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                                  <span>
                                    {networkLogs.length} requisições de rede
                                    {failedRequests > 0 && <span style={{ color: 'var(--danger-solid-strong)' }}> ({failedRequests} {failedRequests === 1 ? 'falha' : 'falhas'})</span>}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ minHeight: '20rem' }}>
                <Alert>Não foi possível carregar o report.</Alert>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </AppLayout>
  )
}
