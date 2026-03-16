'use client'

import { useState, useEffect } from 'react'
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
  projectId: string
  Project?: { id: string; name: string; ownerId: string }
}

interface Project {
  id: string
  name: string
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

export default function ReportsClient({ feedbacks, projects, error }: ReportsClientProps) {
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list')

  useEffect(() => {
    const stored = localStorage.getItem('reports-view-mode') as 'card' | 'list' | null
    if (stored) setViewMode(stored)
  }, [])

  function handleSetViewMode(mode: 'card' | 'list') {
    setViewMode(mode)
    localStorage.setItem('reports-view-mode', mode)
  }

  const filteredFeedbacks = feedbacks.filter((f) => {
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

  const totalCount = feedbacks.length
  const openCount = feedbacks.filter((f) => f.status === 'OPEN').length
  const criticalCount = feedbacks.filter((f) => f.severity === 'CRITICAL').length

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
                    {projects.map((p) => (
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
                onClick={() => router.push(`/feedbacks/${feedback.id}`)}
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
    </AppLayout>
  )
}
