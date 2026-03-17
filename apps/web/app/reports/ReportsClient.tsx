'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
  Column,
  Row,
  Heading,
  Text,
  Tag,
  Icon,
  Card,
  Flex,
  Button,
  IconButton,
  Textarea,
  Spinner,
  Feedback as FeedbackAlert,
} from '@once-ui-system/core'
import AppLayout from '@/components/ui/AppLayout'
import { useOrg } from '@/contexts/OrgContext'
import { api } from '@/lib/api'

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
  projectId: string
  Project?: { id: string; name: string; ownerId: string }
}

interface Project {
  id: string
  name: string
  organizationId?: string | null
}

interface ReportsClientProps {
  feedbacks: Feedback[]
  projects: Project[]
  error: string | null
}

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

export default function ReportsClient({ feedbacks, projects, error }: ReportsClientProps) {
  const router = useRouter()
  const { currentOrg } = useOrg()

  // Filter by current org
  const orgProjects = currentOrg
    ? projects.filter((p) => p.organizationId === currentOrg.id)
    : projects
  const orgProjectIds = new Set(orgProjects.map((p) => p.id))
  const orgFeedbacks = feedbacks.filter((f) => orgProjectIds.has(f.projectId))

  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list')

  // Feedback detail modal
  interface FeedbackDetail {
    id: string; type: string; severity?: string; status: string; comment: string; title?: string
    screenshotUrl?: string; pageUrl?: string; userAgent?: string; createdAt: string; projectId: string
    consoleLogs?: { level: string; message: string; timestamp?: number }[]
    networkLogs?: { method: string; url: string; status?: number; duration?: number }[]
    metadata?: { rrwebEvents?: any[]; stepsToReproduce?: string; expectedResult?: string; actualResult?: string; source?: string } | null
    Project?: { name: string } | null
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

  const openFeedbackModal = useCallback(async (feedbackId: string) => {
    setFeedbackModalOpen(true); setFeedbackLoading(true); setSelectedFeedback(null)
    setFeedbackEditingComment(false); setFeedbackNetworkOpen(false); setFeedbackConsoleOpen(false)
    try { const res = await fetch(`/api/feedbacks/${feedbackId}`); if (res.ok) setSelectedFeedback(await res.json()) } catch {}
    setFeedbackLoading(false)
  }, [])
  const closeFeedbackModal = useCallback(() => { setFeedbackModalOpen(false); setSelectedFeedback(null) }, [])
  const handleFeedbackStatusChange = useCallback(async (newStatus: string) => {
    if (!selectedFeedback) return; setFeedbackStatusSaving(true)
    try { await api.feedbacks.updateStatus(selectedFeedback.id, newStatus); setSelectedFeedback(prev => prev ? { ...prev, status: newStatus } : null) } catch {}
    setFeedbackStatusSaving(false)
  }, [selectedFeedback])
  const handleFeedbackCommentSave = useCallback(async () => {
    if (!selectedFeedback) return; setFeedbackCommentSaving(true)
    try { await api.feedbacks.updateComment(selectedFeedback.id, feedbackCommentDraft); setSelectedFeedback(prev => prev ? { ...prev, comment: feedbackCommentDraft } : null); setFeedbackEditingComment(false) } catch {}
    setFeedbackCommentSaving(false)
  }, [selectedFeedback, feedbackCommentDraft])

  useEffect(() => {
    const stored = localStorage.getItem('reports-view-mode') as 'card' | 'list' | null
    if (stored) setViewMode(stored)
  }, [])

  function handleSetViewMode(mode: 'card' | 'list') {
    setViewMode(mode)
    localStorage.setItem('reports-view-mode', mode)
  }

  const filteredFeedbacks = orgFeedbacks.filter((f) => {
    if (projectFilter && f.projectId !== projectFilter) return false
    if (typeFilter && f.type !== typeFilter) return false
    if (severityFilter && f.severity !== severityFilter) return false
    if (statusFilter && f.status !== statusFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (
        !f.comment.toLowerCase().includes(q) &&
        !(f.pageUrl || '').toLowerCase().includes(q) &&
        !(f.Project?.name || '').toLowerCase().includes(q)
      )
        return false
    }
    return true
  })

  const hasActiveFilter = projectFilter !== '' || typeFilter !== '' || severityFilter !== '' || statusFilter !== ''

  const totalCount = orgFeedbacks.length
  const openCount = orgFeedbacks.filter((f) => f.status === 'OPEN').length
  const criticalCount = orgFeedbacks.filter((f) => f.severity === 'CRITICAL').length

  if (error) {
    return (
      <AppLayout>
        <Column fillWidth horizontal="center" vertical="center" style={{ minHeight: '60vh' }}>
          <Text variant="body-default-m" onBackground="danger-strong">{error}</Text>
        </Column>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Column as="main" fillWidth paddingX="l" paddingY="m" gap="l">
        {/* Page title + stats */}
        <Row fillWidth horizontal="between" vertical="center">
          <Column gap="xs">
            <Heading variant="heading-strong-l" as="h1">Reports</Heading>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Todos os reports recebidos de todos os projetos
            </Text>
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
          </Row>
        </Row>

        {/* Toolbar: search + filter + view toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <svg
              width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="var(--neutral-on-background-weak)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por comentário, URL ou projeto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
              onClick={() => setShowFilter(!showFilter)}
              title="Filtrar reports"
              style={{
                width: 40,
                height: 40,
                borderRadius: '0.5rem',
                border: '1px solid var(--neutral-border-medium)',
                background: hasActiveFilter ? 'var(--brand-solid-strong)' : 'var(--surface-background)',
                color: hasActiveFilter ? '#fff' : 'var(--neutral-on-background-weak)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (!hasActiveFilter) e.currentTarget.style.background = 'var(--neutral-alpha-weak)'
              }}
              onMouseLeave={(e) => {
                if (!hasActiveFilter) e.currentTarget.style.background = 'var(--surface-background)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="7" y1="12" x2="17" y2="12" />
                <line x1="10" y1="18" x2="14" y2="18" />
              </svg>
            </button>
            {showFilter && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 199 }}
                  onClick={() => setShowFilter(false)}
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
                    width: '20rem',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  {/* Project filter */}
                  <Text variant="label-default-s" onBackground="neutral-strong">Projeto</Text>
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setProjectFilter('')}
                      style={{
                        padding: '0.375rem 0.625rem',
                        borderRadius: '0.375rem',
                        border: '1px solid',
                        borderColor: projectFilter === '' ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)',
                        background: projectFilter === '' ? 'var(--brand-solid-strong)' : 'transparent',
                        color: projectFilter === '' ? '#fff' : 'var(--neutral-on-background-weak)',
                        fontSize: '0.75rem',
                        fontWeight: projectFilter === '' ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      Todos
                    </button>
                    {orgProjects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setProjectFilter(p.id)}
                        style={{
                          padding: '0.375rem 0.625rem',
                          borderRadius: '0.375rem',
                          border: '1px solid',
                          borderColor: projectFilter === p.id ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)',
                          background: projectFilter === p.id ? 'var(--brand-solid-strong)' : 'transparent',
                          color: projectFilter === p.id ? '#fff' : 'var(--neutral-on-background-weak)',
                          fontSize: '0.75rem',
                          fontWeight: projectFilter === p.id ? 600 : 400,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>

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

                  {hasActiveFilter && (
                    <button
                      onClick={() => { setProjectFilter(''); setTypeFilter(''); setSeverityFilter(''); setStatusFilter('') }}
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
              onClick={() => handleSetViewMode('card')}
              title="Visualização em cards"
              style={{
                width: 40,
                height: 38,
                border: 'none',
                background: viewMode === 'card' ? 'var(--neutral-alpha-weak)' : 'var(--surface-background)',
                color: viewMode === 'card' ? 'var(--neutral-on-background-strong)' : 'var(--neutral-on-background-weak)',
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
              onClick={() => handleSetViewMode('list')}
              title="Visualização em lista"
              style={{
                width: 40,
                height: 38,
                border: 'none',
                background: viewMode === 'list' ? 'var(--neutral-alpha-weak)' : 'var(--surface-background)',
                color: viewMode === 'list' ? 'var(--neutral-on-background-strong)' : 'var(--neutral-on-background-weak)',
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

        {/* Content */}
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
                  ? 'Nenhum report recebido ainda.'
                  : 'Nenhum report com os filtros selecionados.'}
              </Text>
            </Column>
          </Card>
        ) : viewMode === 'card' ? (
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
                      {feedback.Project?.name && (
                        <Tag variant="neutral" size="s" label={feedback.Project.name} />
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
                gridTemplateColumns: '6rem 8rem 1fr 6rem 5rem 10rem 2rem',
                padding: '0.625rem 1rem',
                borderBottom: '1px solid var(--neutral-border-medium)',
                background: 'var(--neutral-alpha-weak)',
                gap: '0.75rem',
                alignItems: 'center',
              }}
            >
              <Text variant="label-default-xs" onBackground="neutral-weak">Tipo</Text>
              <Text variant="label-default-xs" onBackground="neutral-weak">Projeto</Text>
              <Text variant="label-default-xs" onBackground="neutral-weak">Comentário</Text>
              <Text variant="label-default-xs" onBackground="neutral-weak">Severidade</Text>
              <Text variant="label-default-xs" onBackground="neutral-weak">Status</Text>
              <Text variant="label-default-xs" onBackground="neutral-weak">Data</Text>
              <span />
            </div>
            {filteredFeedbacks.map((feedback, i) => (
              <div
                key={feedback.id}
                onClick={() => openFeedbackModal(feedback.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '6rem 8rem 1fr 6rem 5rem 10rem 2rem',
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
                  variant="body-default-xs"
                  onBackground="neutral-weak"
                  style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {feedback.Project?.name || '—'}
                </Text>
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

      {/* ── Feedback Detail Modal ─────────────────────────────────────── */}
      {feedbackModalOpen && (
        <div onClick={closeFeedbackModal} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '3vh', overflowY: 'auto' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '64rem', maxHeight: '94vh', overflowY: 'auto', background: 'var(--page-background)', borderRadius: '1rem', border: '1px solid var(--neutral-border-medium)', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', margin: '0 1rem 2rem' }}>
            {feedbackLoading ? (
              <Flex fillWidth style={{ minHeight: '20rem' }} horizontal="center" vertical="center">
                <Column horizontal="center" gap="m"><Spinner size="m" /><Text variant="body-default-s" onBackground="neutral-weak">Carregando report...</Text></Column>
              </Flex>
            ) : selectedFeedback ? (
              <>
                {/* Modal header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem', borderBottom: '1px solid var(--neutral-border-medium)', position: 'sticky', top: 0, background: 'var(--surface-background)', zIndex: 1, borderRadius: '1rem 1rem 0 0' }}>
                  <Tag variant={getTagVariant(selectedFeedback.type)} size="s" label={getTypeLabel(selectedFeedback.type)} />
                  {selectedFeedback.Project?.name && <Text variant="body-default-xs" onBackground="neutral-weak">{selectedFeedback.Project.name}</Text>}
                  <Text variant="body-default-s" onBackground="neutral-strong" style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {selectedFeedback.title || selectedFeedback.comment?.slice(0, 80) || 'Report'}
                  </Text>
                  <IconButton icon="close" variant="tertiary" size="s" tooltip="Fechar" onClick={closeFeedbackModal} />
                </div>

                {/* Modal content */}
                <div style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  {/* Left column */}
                  <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                    {selectedFeedback.metadata?.rrwebEvents && selectedFeedback.metadata.rrwebEvents.length > 0 && selectedFeedback.metadata?.source === 'embed' && (
                      <Card fillWidth radius="l" style={{ overflow: 'hidden', padding: 0 }}><SessionReplay events={selectedFeedback.metadata.rrwebEvents} /></Card>
                    )}
                    {selectedFeedback.screenshotUrl && (
                      <Card fillWidth padding="l" radius="l"><Column gap="s"><Heading variant="heading-strong-s">Screenshot</Heading><img src={selectedFeedback.screenshotUrl} alt="Screenshot" style={{ width: '100%', borderRadius: '0.5rem', border: '1px solid var(--neutral-border-medium)' }} /></Column></Card>
                    )}
                    <Card fillWidth padding="l" radius="l">
                      <Column gap="s">
                        <Row fillWidth horizontal="between" vertical="center">
                          <Heading variant="heading-strong-s">Descrição</Heading>
                          {!feedbackEditingComment && <IconButton icon="edit" variant="tertiary" size="s" tooltip="Editar" onClick={() => { setFeedbackCommentDraft(selectedFeedback.comment); setFeedbackEditingComment(true) }} />}
                        </Row>
                        {feedbackEditingComment ? (
                          <Column gap="s">
                            <Textarea id="modal-comment-edit" label="Descrição" value={feedbackCommentDraft} lines={4} resize="vertical" onChange={(e) => setFeedbackCommentDraft(e.target.value)} disabled={feedbackCommentSaving} />
                            <Row gap="s" horizontal="end">
                              <Button variant="secondary" size="s" label="Cancelar" onClick={() => setFeedbackEditingComment(false)} disabled={feedbackCommentSaving} />
                              <Button variant="primary" size="s" label="Salvar" onClick={handleFeedbackCommentSave} loading={feedbackCommentSaving} />
                            </Row>
                          </Column>
                        ) : <Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{selectedFeedback.comment}</Text>}
                      </Column>
                    </Card>
                    {(selectedFeedback.metadata?.stepsToReproduce || selectedFeedback.metadata?.expectedResult || selectedFeedback.metadata?.actualResult) && (
                      <Card fillWidth padding="l" radius="l"><Column gap="m">
                        {selectedFeedback.metadata?.stepsToReproduce && <Column gap="xs"><Heading variant="heading-strong-s">Passos para reproduzir</Heading><Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{selectedFeedback.metadata.stepsToReproduce}</Text></Column>}
                        {selectedFeedback.metadata?.expectedResult && <Column gap="xs"><Heading variant="heading-strong-s">Resultado esperado</Heading><Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{selectedFeedback.metadata.expectedResult}</Text></Column>}
                        {selectedFeedback.metadata?.actualResult && <Column gap="xs"><Heading variant="heading-strong-s">Resultado real</Heading><Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{selectedFeedback.metadata.actualResult}</Text></Column>}
                      </Column></Card>
                    )}
                    {(selectedFeedback.networkLogs?.length ?? 0) > 0 && (
                      <Card fillWidth padding="0" radius="l" style={{ overflow: 'hidden' }}><Column fillWidth>
                        <div onClick={() => setFeedbackNetworkOpen(!feedbackNetworkOpen)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', cursor: 'pointer' }}>
                          <Heading variant="heading-strong-s">Network Logs ({selectedFeedback.networkLogs!.length})</Heading>
                          <Icon name="chevronDown" size="xs" style={{ transform: feedbackNetworkOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                        </div>
                        {feedbackNetworkOpen && <div style={{ maxHeight: '20rem', overflowY: 'auto' }}>{selectedFeedback.networkLogs!.map((log, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderTop: '1px solid var(--neutral-border-medium)' }}>
                            <Tag variant={log.status && log.status >= 400 ? 'danger' : 'success'} size="s" label={String(log.status ?? '-')} />
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>{log.method}</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={log.url}>{log.url}</span>
                            {log.duration != null && <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', flexShrink: 0 }}>{log.duration}ms</span>}
                          </div>
                        ))}</div>}
                      </Column></Card>
                    )}
                    {(selectedFeedback.consoleLogs?.length ?? 0) > 0 && (
                      <Card fillWidth padding="0" radius="l" style={{ overflow: 'hidden' }}><Column fillWidth>
                        <div onClick={() => setFeedbackConsoleOpen(!feedbackConsoleOpen)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', cursor: 'pointer' }}>
                          <Heading variant="heading-strong-s">Console Logs ({selectedFeedback.consoleLogs!.length})</Heading>
                          <Icon name="chevronDown" size="xs" style={{ transform: feedbackConsoleOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                        </div>
                        {feedbackConsoleOpen && <div style={{ maxHeight: '20rem', overflowY: 'auto' }}>{selectedFeedback.consoleLogs!.map((log, i) => {
                          const level = log.level?.toUpperCase() ?? 'LOG'
                          const variant = level === 'ERROR' ? 'danger' : level === 'WARN' ? 'warning' : 'info'
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem 1rem', borderTop: '1px solid var(--neutral-border-medium)' }}>
                              <Tag variant={variant as any} size="s" label={level} style={{ flexShrink: 0 }} />
                              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', wordBreak: 'break-word', flex: 1 }}>{log.message}</span>
                            </div>
                          )
                        })}</div>}
                      </Column></Card>
                    )}
                  </div>

                  {/* Right sidebar */}
                  <div style={{ flex: 1, minWidth: '14rem', maxWidth: '18rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '4.5rem' }}>
                    <Card fillWidth padding="l" radius="l"><Column gap="m">
                      <Heading variant="heading-strong-s">Status</Heading>
                      <Row gap="xs" wrap>
                        {[
                          { value: 'OPEN', label: 'Aberto' },
                          { value: 'IN_PROGRESS', label: 'Em andamento' },
                          { value: 'UNDER_REVIEW', label: 'Sob revisão' },
                          { value: 'RESOLVED', label: 'Concluída' },
                          { value: 'CANCELLED', label: 'Cancelado' },
                        ].map((opt) => (
                          <Tag key={opt.value} variant={selectedFeedback.status === opt.value ? getTagVariant(opt.value) : 'neutral'} size="s" label={opt.label}
                            onClick={() => handleFeedbackStatusChange(opt.value)}
                            style={{ cursor: feedbackStatusSaving ? 'wait' : 'pointer', opacity: selectedFeedback.status === opt.value ? 1 : 0.6, transition: 'opacity 0.15s' }} />
                        ))}
                      </Row>
                      {feedbackStatusSaving && <Row gap="xs" vertical="center"><Spinner size="s" /><Text variant="body-default-xs" onBackground="neutral-weak">Salvando...</Text></Row>}
                    </Column></Card>
                    <Card fillWidth padding="l" radius="l"><Column gap="m">
                      <Heading variant="heading-strong-s">Detalhes</Heading>
                      <Column gap="xs">
                        <Text variant="label-default-s" onBackground="neutral-weak">Tipo e Severidade</Text>
                        <Row gap="xs" wrap>
                          <Tag variant={getTagVariant(selectedFeedback.type)} size="m" label={getTypeLabel(selectedFeedback.type)} />
                          {selectedFeedback.severity && <Tag variant={getTagVariant(selectedFeedback.severity)} size="m" label={getSeverityLabel(selectedFeedback.severity)} />}
                        </Row>
                      </Column>
                      {selectedFeedback.metadata?.source && (
                        <Column gap="xs"><Text variant="label-default-s" onBackground="neutral-weak">Origem</Text>
                          <Tag variant={selectedFeedback.metadata.source === 'shared-url' ? 'info' : 'brand'} size="s" label={selectedFeedback.metadata.source === 'shared-url' ? 'URL compartilhada' : 'Script embed'} />
                        </Column>
                      )}
                      {selectedFeedback.pageUrl && (
                        <Column gap="xs"><Text variant="label-default-s" onBackground="neutral-weak">Página</Text>
                          <a href={selectedFeedback.pageUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', wordBreak: 'break-all', color: 'var(--brand-on-background-strong)', textDecoration: 'underline', textUnderlineOffset: '2px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            {selectedFeedback.pageUrl}<Icon name="openLink" size="xs" style={{ flexShrink: 0 }} />
                          </a>
                        </Column>
                      )}
                      <Column gap="xs"><Text variant="label-default-s" onBackground="neutral-weak">Data</Text>
                        <Row gap="xs" vertical="center"><Icon name="clock" size="xs" /><Text variant="body-default-xs">{new Date(selectedFeedback.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text></Row>
                      </Column>
                      {selectedFeedback.userAgent && <Column gap="xs"><Text variant="label-default-s" onBackground="neutral-weak">Navegador</Text><Text variant="body-default-xs" style={{ wordBreak: 'break-all' }}>{selectedFeedback.userAgent}</Text></Column>}
                      <Column gap="xs"><Text variant="label-default-s" onBackground="neutral-weak">Eventos Capturados</Text><Column gap="xs">
                        <Row gap="xs" vertical="center"><Icon name="monitor" size="xs" /><Text variant="body-default-xs">{selectedFeedback.metadata?.rrwebEvents?.length ?? 0} eventos de sessão</Text></Row>
                        <Row gap="xs" vertical="center"><Icon name="message" size="xs" /><Text variant="body-default-xs">{selectedFeedback.consoleLogs?.length ?? 0} console logs</Text></Row>
                        <Row gap="xs" vertical="center"><Icon name="openLink" size="xs" /><Text variant="body-default-xs">{selectedFeedback.networkLogs?.length ?? 0} requisições de rede</Text></Row>
                      </Column></Column>
                    </Column></Card>
                  </div>
                </div>
              </>
            ) : (
              <Flex fillWidth style={{ minHeight: '20rem' }} horizontal="center" vertical="center"><FeedbackAlert variant="danger">Não foi possível carregar o report.</FeedbackAlert></Flex>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  )
}
