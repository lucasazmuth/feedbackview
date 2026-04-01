'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import AppLayout from '@/components/ui/AppLayout'
import { AppIcon } from '@/components/ui/AppIcon'
import { ICON_PX, LUCIDE_ICON_PX, ICON_STROKE } from '@/lib/icon-tokens'
import { Button } from '@/components/ui/Button'
import UpgradeModal from '@/components/ui/UpgradeModal'
import { useOrg } from '@/contexts/OrgContext'
import { getPlanLimits, getUsageWarning, getReportsUsagePercent, type Plan, type Role, type Usage } from '@/lib/limits'

interface Project {
  id: string
  name: string
  url: string
  organizationId?: string | null
  ownerId?: string
  openFeedbackCount?: number
  _count?: { feedbacks: number }
  createdAt: string
  embedLastSeenAt?: string | null
  embedPaused?: boolean
  mode?: string | null
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

function getEmbedStatus(embedLastSeenAt?: string | null, embedPaused?: boolean, mode?: string | null, feedbackCount?: number): { label: string; color: string; dotColor: string } {
  // Proxy mode (shared URL) — no heartbeat, status based on reports
  if (mode === 'proxy') {
    if (embedPaused) {
      return { label: 'Pausado', color: '#d97706', dotColor: '#f59e0b' }
    }
    const hasReports = (feedbackCount ?? 0) > 0
    return hasReports
      ? { label: 'Ativo', color: '#059669', dotColor: '#10b981' }
      : { label: 'Aguardando', color: '#9ca3af', dotColor: '#9ca3af' }
  }

  // Embed mode — heartbeat-based status
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
  const { currentOrg } = useOrg()
  const [usageWarning, setUsageWarning] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState<Plan>('FREE')
  const [reportsUsed, setReportsUsed] = useState(0)
  const [reportsLimit, setReportsLimit] = useState(0)
  const [reportsPercent, setReportsPercent] = useState(-1)
  const [isLifetimeLimit, setIsLifetimeLimit] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  useEffect(() => {
    if (!currentOrg?.id) return
    async function fetchUsage() {
      try {
        const res = await fetch(`/api/billing/subscription?orgId=${currentOrg!.id}`)
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
  }, [currentOrg?.id])

  // Filter projects by current org
  const orgProjects = useMemo(() => {
    if (!currentOrg) return projects
    return projects.filter((p) => p.organizationId === currentOrg.id)
  }, [projects, currentOrg])

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
    let result = [...orgProjects]

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
  }, [orgProjects, search, filterStatus, sortBy])

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
      <div className="app-page">
        {/* Page title */}
        <h1 className="text-2xl font-bold text-off-white">Projetos</h1>


        {/* Error state */}
        {error && (
          <div className="w-full p-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <p className="text-sm text-red-400">
              {error}
            </p>
          </div>
        )}

        {/* Toolbar: search + filter + new project — z-index acima do backdrop do filtro (fixed z-199) para cliques funcionarem */}
        {orgProjects.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', position: 'relative', zIndex: 210 }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
              <AppIcon
                size="md"
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: 'var(--neutral-on-background-weak)',
                }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </AppIcon>
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
                <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}>
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="7" y1="12" x2="17" y2="12" />
                  <line x1="10" y1="18" x2="14" y2="18" />
                </AppIcon>
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
                    }}
                    className="app-filter-dropdown"
                  >
                    <span className="app-filter-label" style={{ marginBottom: 0 }}>Status</span>
                    <div className="app-filter-chips">
                      {([['all', 'Todos'], ['open', 'Com abertos'], ['none', 'Sem abertos']] as const).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => setFilterStatus(val)}
                          className={`app-filter-chip${filterStatus === val ? ' app-filter-chip--active' : ''}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <span className="app-filter-label" style={{ marginBottom: 0 }}>Ordenar por</span>
                    <div className="app-filter-chips">
                      {([['recent', 'Recentes'], ['name', 'Nome'], ['feedbacks', 'Reports']] as const).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => setSortBy(val)}
                          className={`app-filter-chip${sortBy === val ? ' app-filter-chip--active' : ''}`}
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
                <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}>
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </AppIcon>
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

            {/* New project — router.push evita falha de clique quando overlay/stacking ou Link prefere não navegar */}
            <Button
              variant="primary"
              size="medium"
              type="button"
              onClick={() => {
                setShowFilter(false)
                router.push('/criar-projeto')
              }}
            >
              Novo Projeto
            </Button>
          </div>
        )}

        {/* Empty state — onboarding checklist */}
        {orgProjects.length === 0 && !error && (
          <div className="w-full flex flex-col items-center justify-center py-10 gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold text-off-white">Bem-vindo ao Buug!</h1>
              <p className="text-base text-gray" style={{ maxWidth: '28rem' }}>
                Siga os passos abaixo para começar a capturar reports com screenshot, replay e Web Vitals.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 400 }}>
              {[
                { done: true, label: 'Criar sua conta', desc: 'Conta criada com sucesso' },
                { done: false, label: 'Criar seu primeiro projeto', desc: 'Adicione a URL do seu site' },
                { done: false, label: 'Instalar o widget', desc: 'Cole o script ou compartilhe o link' },
                { done: false, label: 'Receber o primeiro report', desc: 'Teste enviando um bug report' },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 12, border: '1px solid var(--neutral-border-medium)', background: step.done ? 'var(--success-alpha-weak)' : 'var(--surface-background)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: step.done ? '#059669' : 'var(--neutral-alpha-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: step.done ? '#fff' : 'var(--neutral-on-background-weak)', fontSize: 13, fontWeight: 700 }}>
                    {step.done ? '✓' : i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: step.done ? '#059669' : 'var(--neutral-on-background-strong)' }}>{step.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--neutral-on-background-weak)' }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="primary"
              size="large"
              type="button"
              onClick={() => router.push('/criar-projeto')}
            >
              Criar primeiro projeto
            </Button>
          </div>
        )}

        {/* Projects grid view */}
        {filteredProjects.length > 0 && viewMode === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', width: '100%' }}>
            {filteredProjects.map((project) => {
              const openCount = project.openFeedbackCount ?? project._count?.feedbacks ?? 0
              const embedStatus = getEmbedStatus(project.embedLastSeenAt, project.embedPaused, project.mode, project._count?.feedbacks)
              return (
                <div
                  key={project.id}
                  className="w-full p-4 flex flex-col gap-2 rounded-xl border border-transparent-white bg-glass-gradient cursor-pointer hover:border-gray/30 transition-colors"
                  onClick={() => router.push(`/projects/${project.id}`)}
                  style={{ justifyContent: 'space-between', minHeight: '8rem' }}
                >
                  <div className="flex flex-col gap-1" style={{ minWidth: 0 }}>
                    <div className="w-full flex items-center justify-between">
                      <h3
                        className="text-base font-bold text-off-white truncate flex-1 min-w-0"
                      >
                        {project.name}
                      </h3>
                      <ChevronRight size={LUCIDE_ICON_PX} className="text-gray flex-shrink-0" />
                    </div>
                    <p className="text-xs text-gray truncate">
                      {project.url}
                    </p>
                  </div>

                  <div className="w-full flex items-center gap-2 mt-auto flex-wrap" style={{ overflow: 'hidden', minWidth: 0 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: embedStatus.color, fontWeight: 500, flexShrink: 0 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: embedStatus.dotColor, flexShrink: 0 }} />
                      {embedStatus.label}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: openCount > 0 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255,255,255,0.06)',
                        color: openCount > 0 ? '#eab308' : '#9ca3af',
                      }}
                    >
                      {`${openCount} aberto${openCount !== 1 ? 's' : ''}`}
                    </span>
                    <span className="text-xs text-gray whitespace-nowrap flex-shrink-0">
                      {formatDate(project.createdAt)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Projects list view */}
        {filteredProjects.length > 0 && viewMode === 'list' && (
          <div className="w-full rounded-xl border border-transparent-white overflow-hidden">
            {/* List header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 10rem 5rem 7rem 5rem 1.5rem',
                padding: '0.625rem 1rem',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                gap: '0.5rem',
                alignItems: 'center',
              }}
            >
              <span className="text-xs font-medium text-gray">Nome</span>
              <span className="text-xs font-medium text-gray">URL</span>
              <span className="text-xs font-medium text-gray">Status</span>
              <span className="text-xs font-medium text-gray">Reports</span>
              <span className="text-xs font-medium text-gray">Criado</span>
              <span />
            </div>
            {filteredProjects.map((project, i) => {
              const openCount = project.openFeedbackCount ?? project._count?.feedbacks ?? 0
              const embedStatus = getEmbedStatus(project.embedLastSeenAt, project.embedPaused, project.mode, project._count?.feedbacks)
              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 10rem 5rem 7rem 5rem 1.5rem',
                    padding: '0.625rem 1rem',
                    borderBottom: i < filteredProjects.length - 1 ? '1px solid var(--neutral-border-medium)' : undefined,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    gap: '0.5rem',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--neutral-alpha-weak)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', minHeight: '1.75rem', overflow: 'hidden' }}>
                    <span className="text-sm text-off-white font-medium truncate">{project.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', minHeight: '1.75rem', overflow: 'hidden' }}>
                    <span className="text-xs text-gray truncate">{project.url}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', minHeight: '1.75rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: embedStatus.color, fontWeight: 500 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: embedStatus.dotColor, flexShrink: 0 }} />
                      {embedStatus.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', minHeight: '1.75rem' }}>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: openCount > 0 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255,255,255,0.06)',
                        color: openCount > 0 ? '#eab308' : '#9ca3af',
                      }}
                    >
                      {`${openCount} aberto${openCount !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', minHeight: '1.75rem' }}>
                    <span className="text-xs text-gray whitespace-nowrap">{formatDate(project.createdAt)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', minHeight: '1.75rem' }}>
                    <ChevronRight size={ICON_PX.sm} className="text-gray" />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Archived projects */}
        {archivedProjects.length > 0 && (
          <div className="w-full flex flex-col gap-4">
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
              <AppIcon
                size="md"
                strokeWidth={ICON_STROKE.emphasis}
                style={{ transform: showArchived ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
              >
                <polyline points="9 18 15 12 9 6" />
              </AppIcon>
              Arquivados ({archivedProjects.length})
            </button>

            {showArchived && (
              <div className="w-full rounded-xl border border-transparent-white overflow-hidden opacity-75">
                {archivedProjects.map((project, i) => (
                  <div
                    key={project.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 10rem 6rem auto',
                      padding: '0.625rem 1rem',
                      borderBottom: i < archivedProjects.length - 1 ? '1px solid var(--neutral-border-medium)' : undefined,
                      gap: '0.75rem',
                      alignItems: 'center',
                    }}
                  >
                    <span className="text-sm text-gray font-medium truncate">
                      {project.name}
                    </span>
                    <span className="text-xs text-gray truncate">
                      {project.url}
                    </span>
                    <span className="text-xs text-gray whitespace-nowrap">
                      {formatDate(project.createdAt)}
                    </span>
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
              </div>
            )}
          </div>
        )}
      </div>
      {showUpgradeModal && (
        <UpgradeModal
          currentPlan={currentPlan}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </AppLayout>
  )
}
