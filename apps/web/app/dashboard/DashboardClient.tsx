'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Flex,
  Column,
  Row,
  Grid,
  Heading,
  Text,
  Button,
  Tag,
  Icon,
} from '@once-ui-system/core'
import AppLayout from '@/components/ui/AppLayout'
import UpgradeModal from '@/components/ui/UpgradeModal'
import { getPlanLimits, getUsageWarning, getReportsUsagePercent, type Plan, type Role, type Usage } from '@/lib/limits'

interface Project {
  id: string
  name: string
  url: string
  openFeedbackCount?: number
  _count?: { feedbacks: number }
  createdAt: string
  embedLastSeenAt?: string | null
  embedPaused?: boolean
}

interface ArchivedProject {
  id: string
  name: string
  url: string
  createdAt: string
  archivedAt: string
}

interface DashboardClientProps {
  projects: Project[]
  archivedProjects: ArchivedProject[]
  error: string | null
  userEmail: string
  userName: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

function getEmbedStatus(embedLastSeenAt?: string | null, embedPaused?: boolean): { label: string; color: string; dotColor: string } {
  if (embedPaused) {
    return { label: 'Pausado', color: '#d97706', dotColor: '#f59e0b' }
  }
  if (!embedLastSeenAt) {
    return { label: 'Offline', color: '#9ca3af', dotColor: '#9ca3af' }
  }
  const diff = Date.now() - new Date(embedLastSeenAt).getTime()
  const fiveMin = 5 * 60 * 1000
  if (diff < fiveMin) {
    return { label: 'Conectado', color: '#059669', dotColor: '#10b981' }
  }
  return { label: 'Offline', color: '#9ca3af', dotColor: '#9ca3af' }
}

export default function DashboardClient({
  projects,
  archivedProjects,
  error,
  userEmail,
  userName,
}: DashboardClientProps) {
  const router = useRouter()
  const [usageWarning, setUsageWarning] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState<Plan>('FREE')
  const [reportsUsed, setReportsUsed] = useState(0)
  const [reportsLimit, setReportsLimit] = useState(0)
  const [reportsPercent, setReportsPercent] = useState(-1)
  const [isLifetimeLimit, setIsLifetimeLimit] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch('/api/billing/subscription')
        if (!res.ok) return
        const data = await res.json()
        const plan = (data.organization?.plan || 'FREE') as Plan
        const role = (data.role || 'MEMBER') as Role
        const usage: Usage = {
          reportsUsed: data.usage?.reportsUsed || 0,
        }
        const limits = getPlanLimits(plan)
        const warning = getUsageWarning(usage, limits, role)
        setUsageWarning(warning)
        setCurrentPlan(plan)
        setReportsUsed(usage.reportsUsed)
        setReportsLimit(limits.maxReports)
        setReportsPercent(getReportsUsagePercent(usage, limits))
        setIsLifetimeLimit(limits.isLifetimeLimit)
      } catch {
        // ignore
      }
    }
    fetchUsage()
  }, [])

  const [showFilter, setShowFilter] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'none'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'feedbacks'>('recent')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [unarchiving, setUnarchiving] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('dashboard-view-mode') as 'grid' | 'list' | null
    if (saved) setViewMode(saved)
  }, [])

  function handleSetViewMode(mode: 'grid' | 'list') {
    setViewMode(mode)
    localStorage.setItem('dashboard-view-mode', mode)
  }

  const filteredProjects = useMemo(() => {
    let result = [...projects]

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.url.toLowerCase().includes(q))
    }

    if (filterStatus === 'open') {
      result = result.filter((p) => (p.openFeedbackCount ?? 0) > 0)
    } else if (filterStatus === 'none') {
      result = result.filter((p) => (p.openFeedbackCount ?? 0) === 0)
    }

    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'feedbacks') {
      result.sort((a, b) => (b.openFeedbackCount ?? 0) - (a.openFeedbackCount ?? 0))
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    return result
  }, [projects, search, filterStatus, sortBy])

  const hasActiveFilter = filterStatus !== 'all' || sortBy !== 'recent'

  async function handleUnarchive(projectId: string) {
    setUnarchiving(projectId)
    try {
      const res = await fetch(`/api/projects/${projectId}/unarchive`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao desarquivar')
      }
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUnarchiving(null)
    }
  }

  return (
    <AppLayout>
      <Column as="main" fillWidth paddingX="l" paddingY="m" gap="l">
        {/* Page title */}
        <Heading variant="heading-strong-l">Projetos</Heading>


        {/* Error state */}
        {error && (
          <Row
            fillWidth
            padding="m"
            radius="l"
            background="danger-weak"
            border="danger-medium"
          >
            <Text variant="body-default-s" onBackground="danger-strong">
              {error}
            </Text>
          </Row>
        )}

        {/* Toolbar: search + filter + new project */}
        {projects.length > 0 && (
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
                placeholder="Buscar projeto por nome ou URL..."
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
                title="Filtrar projetos"
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
                      width: '16rem',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    <Text variant="label-default-s" onBackground="neutral-strong">Status</Text>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      {([['all', 'Todos'], ['open', 'Com abertos'], ['none', 'Sem abertos']] as const).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => setFilterStatus(val)}
                          style={{
                            padding: '0.375rem 0.625rem',
                            borderRadius: '0.375rem',
                            border: '1px solid',
                            borderColor: filterStatus === val ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)',
                            background: filterStatus === val ? 'var(--brand-solid-strong)' : 'transparent',
                            color: filterStatus === val ? '#fff' : 'var(--neutral-on-background-weak)',
                            fontSize: '0.75rem',
                            fontWeight: filterStatus === val ? 600 : 400,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <Text variant="label-default-s" onBackground="neutral-strong">Ordenar por</Text>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      {([['recent', 'Recentes'], ['name', 'Nome'], ['feedbacks', 'Reports']] as const).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => setSortBy(val)}
                          style={{
                            padding: '0.375rem 0.625rem',
                            borderRadius: '0.375rem',
                            border: '1px solid',
                            borderColor: sortBy === val ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)',
                            background: sortBy === val ? 'var(--brand-solid-strong)' : 'transparent',
                            color: sortBy === val ? '#fff' : 'var(--neutral-on-background-weak)',
                            fontSize: '0.75rem',
                            fontWeight: sortBy === val ? 600 : 400,
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
                        onClick={() => { setFilterStatus('all'); setSortBy('recent') }}
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
                onClick={() => handleSetViewMode('grid')}
                title="Visualização em grade"
                style={{
                  width: 40,
                  height: 38,
                  border: 'none',
                  background: viewMode === 'grid' ? 'var(--neutral-alpha-weak)' : 'var(--surface-background)',
                  color: viewMode === 'grid' ? 'var(--neutral-on-background-strong)' : 'var(--neutral-on-background-weak)',
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

            {/* New project button */}
            <Button
              variant="primary"
              prefixIcon="plus"
              size="m"
              href="/projects/new"
            >
              Novo Projeto
            </Button>
          </div>
        )}

        {/* Empty state */}
        {projects.length === 0 && !error && (
          <Column fillWidth horizontal="center" vertical="center" paddingY="xl" gap="m">
            <Heading variant="heading-strong-m">Nenhum projeto ainda</Heading>
            <Text
              variant="body-default-s"
              onBackground="neutral-weak"
              align="center"
              style={{ maxWidth: '24rem' }}
            >
              Crie seu primeiro projeto para começar a capturar reports com screenshot e session
              replay.
            </Text>
            <Button
              variant="primary"
              prefixIcon="plus"
              size="m"
              href="/projects/new"
            >
              Novo Projeto
            </Button>
          </Column>
        )}

        {/* Projects grid view */}
        {filteredProjects.length > 0 && viewMode === 'grid' && (
          <Grid fillWidth columns={3} gap="m" s={{ columns: 1 }} m={{ columns: 2 }}>
            {filteredProjects.map((project) => {
              const openCount = project.openFeedbackCount ?? project._count?.feedbacks ?? 0
              const embedStatus = getEmbedStatus(project.embedLastSeenAt, project.embedPaused)
              return (
                <Column
                  key={project.id}
                  fillWidth
                  padding="m"
                  gap="s"
                  radius="l"
                  border="neutral-medium"
                  background="surface"
                  onClick={() => router.push(`/projects/${project.id}`)}
                  style={{ justifyContent: 'space-between', cursor: 'pointer', minHeight: '8rem' }}
                >
                  <Column gap="xs" style={{ minWidth: 0 }}>
                    <Row fillWidth horizontal="between" vertical="center">
                      <Heading
                        variant="heading-strong-m"
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}
                      >
                        {project.name}
                      </Heading>
                      <Icon name="chevronRight" size="s" style={{ flexShrink: 0 }} />
                    </Row>
                    <Text
                      variant="body-default-xs"
                      onBackground="neutral-weak"
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {project.url}
                    </Text>
                  </Column>

                  <Row fillWidth vertical="center" gap="s" style={{ marginTop: 'auto' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: embedStatus.color, fontWeight: 500 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: embedStatus.dotColor, flexShrink: 0 }} />
                      {embedStatus.label}
                    </span>
                    <Tag
                      variant={openCount > 0 ? 'warning' : 'neutral'}
                      size="s"
                      label={`${openCount} aberto${openCount !== 1 ? 's' : ''}`}
                    />
                    <Text variant="body-default-xs" onBackground="neutral-weak" style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(project.createdAt)}
                    </Text>
                  </Row>
                </Column>
              )
            })}
          </Grid>
        )}

        {/* Projects list view */}
        {filteredProjects.length > 0 && viewMode === 'list' && (
          <Column fillWidth radius="l" border="neutral-medium" style={{ overflow: 'hidden' }}>
            {/* List header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 12rem 6rem 8rem 6rem 2rem',
                padding: '0.625rem 1rem',
                borderBottom: '1px solid var(--neutral-border-medium)',
                background: 'var(--neutral-alpha-weak)',
                gap: '0.75rem',
                alignItems: 'center',
              }}
            >
              <Text variant="label-default-xs" onBackground="neutral-weak">Nome</Text>
              <Text variant="label-default-xs" onBackground="neutral-weak">URL</Text>
              <Text variant="label-default-xs" onBackground="neutral-weak">Embed</Text>
              <Text variant="label-default-xs" onBackground="neutral-weak">Reports</Text>
              <Text variant="label-default-xs" onBackground="neutral-weak">Criado</Text>
              <span />
            </div>
            {filteredProjects.map((project, i) => {
              const openCount = project.openFeedbackCount ?? project._count?.feedbacks ?? 0
              const embedStatus = getEmbedStatus(project.embedLastSeenAt, project.embedPaused)
              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 12rem 6rem 8rem 6rem 2rem',
                    padding: '0.75rem 1rem',
                    borderBottom: i < filteredProjects.length - 1 ? '1px solid var(--neutral-border-medium)' : undefined,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    gap: '0.75rem',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--neutral-alpha-weak)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <Text
                    variant="body-default-s"
                    onBackground="neutral-strong"
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}
                  >
                    {project.name}
                  </Text>
                  <Text
                    variant="body-default-xs"
                    onBackground="neutral-weak"
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {project.url}
                  </Text>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: embedStatus.color, fontWeight: 500 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: embedStatus.dotColor, flexShrink: 0 }} />
                    {embedStatus.label}
                  </span>
                  <Tag
                    variant={openCount > 0 ? 'warning' : 'neutral'}
                    size="s"
                    label={`${openCount} aberto${openCount !== 1 ? 's' : ''}`}
                  />
                  <Text variant="body-default-xs" onBackground="neutral-weak" style={{ whiteSpace: 'nowrap' }}>
                    {formatDate(project.createdAt)}
                  </Text>
                  <Icon name="chevronRight" size="xs" />
                </div>
              )
            })}
          </Column>
        )}

        {/* Archived projects */}
        {archivedProjects.length > 0 && (
          <Column fillWidth gap="m">
            <button
              onClick={() => setShowArchived(!showArchived)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                color: 'var(--neutral-on-background-weak)',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: showArchived ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Arquivados ({archivedProjects.length})
            </button>

            {showArchived && (
              <Column fillWidth radius="l" border="neutral-medium" style={{ overflow: 'hidden', opacity: 0.75 }}>
                {archivedProjects.map((project, i) => (
                  <div
                    key={project.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 12rem 8rem auto',
                      padding: '0.75rem 1rem',
                      borderBottom: i < archivedProjects.length - 1 ? '1px solid var(--neutral-border-medium)' : undefined,
                      gap: '0.75rem',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      variant="body-default-s"
                      onBackground="neutral-weak"
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}
                    >
                      {project.name}
                    </Text>
                    <Text
                      variant="body-default-xs"
                      onBackground="neutral-weak"
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {project.url}
                    </Text>
                    <Text variant="body-default-xs" onBackground="neutral-weak" style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(project.createdAt)}
                    </Text>
                    <button
                      onClick={() => handleUnarchive(project.id)}
                      disabled={unarchiving === project.id}
                      style={{
                        padding: '0.375rem 0.75rem',
                        borderRadius: '0.375rem',
                        border: '1px solid var(--neutral-border-medium)',
                        background: 'var(--surface-background)',
                        color: 'var(--neutral-on-background-strong)',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        cursor: unarchiving === project.id ? 'wait' : 'pointer',
                        opacity: unarchiving === project.id ? 0.5 : 1,
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {unarchiving === project.id ? 'Desarquivando...' : 'Desarquivar'}
                    </button>
                  </div>
                ))}
              </Column>
            )}
          </Column>
        )}
      </Column>
      {showUpgradeModal && (
        <UpgradeModal
          currentPlan={currentPlan}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </AppLayout>
  )
}
