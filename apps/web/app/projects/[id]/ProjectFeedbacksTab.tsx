'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import UpgradeModal from '@/components/ui/UpgradeModal'
import { api } from '@/lib/api'
import { AppIcon } from '@/components/ui/AppIcon'
import { ICON_STROKE } from '@/lib/icon-tokens'

// Reuse report management components
import FilterBar from '@/app/reports/components/FilterBar'
import BulkToolbar from '@/app/reports/components/BulkToolbar'
import FeedbackDetailModal from '@/app/reports/components/FeedbackDetailModal'
import TableView from '@/app/reports/views/TableView'
import CardView from '@/app/reports/views/CardView'
import { getTagVariant, getTypeLabel, getSeverityLabel, getStatusLabel } from '@/app/reports/utils/labels'
import { useFilters } from '@/app/reports/hooks/useFilters'
import { useSelection } from '@/app/reports/hooks/useSelection'
import { useSort } from '@/app/reports/hooks/useSort'
import { useReportsExportEntitlement } from '@/app/reports/hooks/useReportsExportEntitlement'
import {
  buildExportRows,
  downloadReportsCsv,
  downloadReportsXlsx,
  exportDateStamp,
} from '@/app/reports/lib/exportReports'

const KanbanView = dynamic(() => import('@/app/reports/views/KanbanView'), { ssr: false })

interface Feedback {
  id: string
  type: string
  severity?: string
  status: string
  comment: string
  dueDate?: string | null
  startDate?: string | null
  screenshotUrl?: string
  createdAt: string
  pageUrl?: string
  projectId: string
  Project?: { id: string; name: string; ownerId?: string }
}

interface TeamMember {
  id: string
  name: string | null
  email: string
}

type ViewMode = 'list' | 'card' | 'kanban'

function normalizePlanKey(plan: string | undefined): 'FREE' | 'PRO' | 'BUSINESS' {
  const p = (plan || 'FREE').toUpperCase()
  if (p === 'PRO' || p === 'BUSINESS') return p
  return 'FREE'
}

interface ProjectFeedbacksTabProps {
  feedbacks: Feedback[]
  feedbackAssigneesMap: Record<string, { userId: string; name: string | null; email: string }[]>
  teamMembers: TeamMember[]
  currentUserId?: string
  projectName: string
  organizationId?: string | null
  currentPlanForUpgrade?: string
}

export default function ProjectFeedbacksTab({
  feedbacks: initialFeedbacks,
  feedbackAssigneesMap: initialAssigneesMap,
  teamMembers,
  currentUserId,
  projectName,
  organizationId = null,
  currentPlanForUpgrade = 'FREE',
}: ProjectFeedbacksTabProps) {
  const exportEntitled = useReportsExportEntitlement(organizationId || undefined)
  const [exportFormatOpen, setExportFormatOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [exportEmptyMsg, setExportEmptyMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!exportEmptyMsg) return
    const t = setTimeout(() => setExportEmptyMsg(null), 6000)
    return () => clearTimeout(t)
  }, [exportEmptyMsg])

  useEffect(() => {
    if (!exportFormatOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportFormatOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [exportFormatOpen])

  const [feedbacks, setFeedbacks] = useState(initialFeedbacks)
  const [feedbackAssigneesMap, setFeedbackAssigneesMap] = useState(initialAssigneesMap)

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('project-report-view-mode') as ViewMode | null
      if (stored && ['list', 'card', 'kanban'].includes(stored)) return stored
    }
    return 'list'
  })

  function handleSetViewMode(mode: ViewMode) {
    setViewMode(mode)
    localStorage.setItem('project-report-view-mode', mode)
  }

  // Hooks — no project filter needed since we're already in a project
  const {
    filters,
    filteredFeedbacks,
    activeFilterCount,
    setSearch,
    toggleArrayFilter,
    setAssignee,
    removeFilter,
    clearAll,
    applyPreset,
  } = useFilters(feedbacks, feedbackAssigneesMap)

  const { sort, toggleSort, setManualSort, sortedFeedbacks } = useSort(filteredFeedbacks)
  const selection = useSelection()

  const selectionRef = useRef(selection)
  selectionRef.current = selection
  const viewModeRef = useRef(viewMode)
  viewModeRef.current = viewMode

  // Detail modal
  const [modalFeedbackId, setModalFeedbackId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const openDetail = useCallback((feedbackId: string) => {
    if (selectionRef.current.selectedCount > 0 && viewModeRef.current !== 'kanban') {
      selectionRef.current.toggle(feedbackId)
      return
    }
    setModalFeedbackId(feedbackId)
    setModalOpen(true)
  }, [])

  const closeDetail = useCallback(() => {
    setModalOpen(false)
    setModalFeedbackId(null)
  }, [])

  // Status change
  const handleStatusChange = useCallback(async (feedbackId: string, newStatus: string) => {
    setFeedbacks(prev => prev.map(f => f.id === feedbackId ? { ...f, status: newStatus } : f))
    try {
      await api.feedbacks.updateStatus(feedbackId, newStatus)
    } catch {
      setFeedbacks(prev => prev.map(f => f.id === feedbackId ? { ...f, status: initialFeedbacks.find(of => of.id === feedbackId)?.status || f.status } : f))
    }
  }, [initialFeedbacks])

  // Assign/unassign
  const handleAssign = useCallback(async (feedbackId: string, userIds: string[]) => {
    try {
      await api.feedbacks.assign(feedbackId, userIds)
      const newAssignees = userIds.map(uid => {
        const tm = teamMembers.find(m => m.id === uid)
        return { userId: uid, name: tm?.name || null, email: tm?.email || '' }
      })
      setFeedbackAssigneesMap(prev => ({
        ...prev,
        [feedbackId]: [...(prev[feedbackId] || []), ...newAssignees.filter(na => !(prev[feedbackId] || []).some(a => a.userId === na.userId))],
      }))
    } catch {}
  }, [teamMembers])

  const handleUnassign = useCallback(async (feedbackId: string, userId: string) => {
    try {
      await api.feedbacks.unassign(feedbackId, userId)
      setFeedbackAssigneesMap(prev => ({
        ...prev,
        [feedbackId]: (prev[feedbackId] || []).filter(a => a.userId !== userId),
      }))
    } catch {}
  }, [])

  // Start date change
  const handleStartDateChange = useCallback(async (feedbackId: string, startDate: string | null) => {
    setFeedbacks(prev => prev.map(f => f.id === feedbackId ? { ...f, startDate } : f))
    try { await api.feedbacks.updateStartDate(feedbackId, startDate) } catch {
      setFeedbacks(prev => prev.map(f => f.id === feedbackId ? { ...f, startDate: initialFeedbacks.find(of => of.id === feedbackId)?.startDate } : f))
    }
  }, [initialFeedbacks])

  // Due date change
  const handleDueDateChange = useCallback(async (feedbackId: string, dueDate: string | null) => {
    setFeedbacks(prev => prev.map(f => f.id === feedbackId ? { ...f, dueDate } : f))
    try { await api.feedbacks.updateDueDate(feedbackId, dueDate) } catch {
      setFeedbacks(prev => prev.map(f => f.id === feedbackId ? { ...f, dueDate: initialFeedbacks.find(of => of.id === feedbackId)?.dueDate } : f))
    }
  }, [initialFeedbacks])

  // Reorder
  const handleReorder = useCallback(async (orderedIds: string[]) => {
    setManualSort()
    setFeedbacks(prev => {
      const map = new Map(prev.map(f => [f.id, f]))
      const reordered = orderedIds.map(id => map.get(id)).filter(Boolean) as typeof prev
      const rest = prev.filter(f => !orderedIds.includes(f.id))
      return [...reordered, ...rest]
    })
    try { await api.feedbacks.reorder(orderedIds) } catch {}
  }, [setManualSort])

  // Bulk
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const handleBulkStatusChange = useCallback(async (status: string) => {
    setBulkActionLoading(true)
    const ids = selectionRef.current.selectedArray
    setFeedbacks(prev => prev.map(f => ids.includes(f.id) ? { ...f, status } : f))
    try {
      await api.feedbacks.bulkUpdateStatus(ids, status)
      selectionRef.current.clearSelection()
    } catch { setFeedbacks(initialFeedbacks) }
    setBulkActionLoading(false)
  }, [initialFeedbacks])

  const handleBulkDelete = useCallback(async () => {
    const ids = selectionRef.current.selectedArray
    if (ids.length === 0) return
    setBulkActionLoading(true)
    setFeedbacks(prev => prev.filter(f => !ids.includes(f.id)))
    setFeedbackAssigneesMap(prev => {
      const next = { ...prev }
      ids.forEach((id) => {
        delete next[id]
      })
      return next
    })
    try {
      await api.feedbacks.bulkDelete(ids)
      selectionRef.current.clearSelection()
    } catch {
      setFeedbacks(initialFeedbacks)
      setFeedbackAssigneesMap(initialAssigneesMap)
    } finally {
      setBulkActionLoading(false)
    }
  }, [initialFeedbacks, initialAssigneesMap])

  const runFilteredExport = useCallback(
    (format: 'csv' | 'xlsx') => {
      if (sortedFeedbacks.length === 0) {
        setExportEmptyMsg('Nada para exportar com os filtros atuais.')
        setExportFormatOpen(false)
        return
      }
      const rows = buildExportRows(sortedFeedbacks, feedbackAssigneesMap)
      const stamp = exportDateStamp()
      const safeSlug = projectName.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').slice(0, 48)
      const suffix = safeSlug ? `${safeSlug}-${stamp}` : stamp
      if (format === 'csv') {
        downloadReportsCsv(rows, `reports-filtrados-${suffix}.csv`)
      } else {
        downloadReportsXlsx(rows, `reports-filtrados-${suffix}.xlsx`)
      }
      setExportFormatOpen(false)
    },
    [sortedFeedbacks, feedbackAssigneesMap, projectName],
  )

  const displayFeedbacks = viewMode === 'kanban' ? filteredFeedbacks : sortedFeedbacks

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Search + View toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--neutral-on-background-weak)' }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </AppIcon>
          <input
            type="text"
            placeholder="Buscar report..."
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem',
              borderRadius: '0.5rem', border: '1px solid var(--neutral-border-medium)',
              background: 'var(--surface-background)', color: 'var(--neutral-on-background-strong)',
              fontSize: '0.875rem', outline: 'none', height: 40,
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand-solid-strong)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--neutral-border-medium)' }}
          />
        </div>

        {/* Filter icon — inline with search */}
        <FilterBar
          filters={filters}
          projects={[]}
          currentUserId={currentUserId}
          activeFilterCount={activeFilterCount}
          compact
          onToggleArrayFilter={toggleArrayFilter}
          onSetProjectId={() => {}}
          onSetAssignee={setAssignee}
          onRemoveFilter={removeFilter}
          onClearAll={clearAll}
          onApplyPreset={applyPreset}
        />

        {organizationId && (
          <button
            type="button"
            title={exportEntitled === null ? 'Verificando plano…' : 'Exportar filtrado'}
            aria-label={exportEntitled === null ? 'Verificando plano' : 'Exportar filtrado'}
            aria-busy={exportEntitled === null}
            disabled={exportEntitled === null}
            onClick={() => {
              if (exportEntitled === null) return
              if (!exportEntitled) {
                setUpgradeOpen(true)
                return
              }
              setExportFormatOpen(true)
            }}
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              borderRadius: '0.5rem',
              border: '1px solid var(--neutral-border-medium)',
              background: 'var(--surface-background)',
              cursor: exportEntitled === null ? 'wait' : 'pointer',
              color: 'var(--neutral-on-background-weak)',
              transition: 'all 0.15s',
              flexShrink: 0,
              padding: 0,
            }}
          >
            {exportEntitled === null ? (
              <Spinner size="sm" />
            ) : (
              <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis} aria-hidden>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </AppIcon>
            )}
          </button>
        )}

        {/* View toggle */}
        <div style={{ display: 'flex', borderRadius: '0.5rem', border: '1px solid var(--neutral-border-medium)', overflow: 'hidden', flexShrink: 0 }}>
          {[
            { mode: 'card' as ViewMode, title: 'Cards', icon: <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></AppIcon> },
            { mode: 'list' as ViewMode, title: 'Lista', icon: <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></AppIcon> },
            { mode: 'kanban' as ViewMode, title: 'Kanban', icon: <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><rect x="3" y="3" width="5" height="18" rx="1" /><rect x="10" y="3" width="5" height="12" rx="1" /><rect x="17" y="3" width="5" height="15" rx="1" /></AppIcon> },
          ].map((v, i) => (
            <button
              key={v.mode}
              onClick={() => handleSetViewMode(v.mode)}
              title={v.title}
              style={{
                width: 40, height: 38, border: 'none',
                borderLeft: i > 0 ? '1px solid var(--neutral-border-medium)' : undefined,
                background: viewMode === v.mode ? 'var(--neutral-alpha-weak)' : 'var(--surface-background)',
                color: viewMode === v.mode ? 'var(--neutral-on-background-strong)' : 'var(--neutral-on-background-weak)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              {v.icon}
            </button>
          ))}
        </div>
      </div>

      {exportEmptyMsg && (
        <Alert variant="warning">
          {exportEmptyMsg}
        </Alert>
      )}

      {/* Content */}
      {displayFeedbacks.length === 0 ? (
        <div style={{ width: '100%', padding: '2rem', borderRadius: '0.75rem', border: '1px solid var(--neutral-border-medium)', background: 'var(--surface-background)', textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.5rem 0', width: '100%' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'var(--neutral-alpha-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AppIcon size="xl" strokeWidth={ICON_STROKE.emphasis} style={{ color: 'var(--neutral-on-background-weak)' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></AppIcon>
            </div>
            <span style={{ fontSize: '0.875rem', color: 'var(--neutral-on-background-weak)' }}>
              {feedbacks.length === 0
                ? 'Nenhum report ainda. Compartilhe a URL do visualizador!'
                : 'Nenhum report com os filtros selecionados.'}
            </span>
          </div>
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanView
          feedbacks={displayFeedbacks}
          feedbackAssigneesMap={feedbackAssigneesMap}
          onOpenDetail={(id) => { setModalFeedbackId(id); setModalOpen(true) }}
          onStatusChange={handleStatusChange}
        />
      ) : viewMode === 'card' ? (
        <CardView
          feedbacks={displayFeedbacks}
          feedbackAssigneesMap={feedbackAssigneesMap}
          isSelected={selection.isSelected}
          onToggleSelect={selection.toggle}
          selectedCount={selection.selectedCount}
          onOpenDetail={openDetail}
        />
      ) : (
        <TableView
          feedbacks={displayFeedbacks}
          feedbackAssigneesMap={feedbackAssigneesMap}
          teamMembers={teamMembers}
          sort={sort}
          onToggleSort={toggleSort}
          isSelected={selection.isSelected}
          onToggleSelect={selection.toggle}
          onSelectAll={selection.selectAll}
          selectedCount={selection.selectedCount}
          onOpenDetail={openDetail}
          onStatusChange={handleStatusChange}
          onAssign={handleAssign}
          onUnassign={handleUnassign}
          onReorder={handleReorder}
          onStartDateChange={handleStartDateChange}
          onDueDateChange={handleDueDateChange}
        />
      )}

      <BulkToolbar
        selectedCount={selection.selectedCount}
        onChangeStatus={handleBulkStatusChange}
        onDelete={handleBulkDelete}
        onClearSelection={selection.clearSelection}
        actionLoading={bulkActionLoading}
      />

      {exportFormatOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-export-format-title"
            onClick={() => setExportFormatOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              minHeight: '100vh',
              margin: 0,
              boxSizing: 'border-box',
              zIndex: 100000,
              background: 'rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              isolation: 'isolate',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '24rem',
                flexShrink: 0,
                backgroundColor: 'var(--surface-background)',
                color: 'var(--neutral-on-background-strong)',
                borderRadius: '0.75rem',
                border: '1px solid var(--neutral-border-medium)',
                padding: '1.25rem',
                boxShadow: '0 16px 48px rgba(0, 0, 0, 0.22)',
                opacity: 1,
                pointerEvents: 'auto',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                <h2 id="project-export-format-title" style={{ margin: 0, fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>
                  Exportar filtrado
                </h2>
                <span style={{ fontSize: '0.875rem', color: 'var(--neutral-on-background-weak)' }}>
                  Escolha o formato do ficheiro: CSV (texto) ou Excel (.xlsx).
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button onClick={() => runFilteredExport('csv')} style={{ padding: '0.375rem 0.75rem', borderRadius: '0.5rem', border: 'none', background: 'var(--brand-solid-strong)', color: '#fff', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>CSV</button>
                  <button onClick={() => runFilteredExport('xlsx')} style={{ padding: '0.375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--neutral-border-medium)', background: 'var(--surface-background)', color: 'var(--neutral-on-background-strong)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>Excel (.xlsx)</button>
                </div>
                <button onClick={() => setExportFormatOpen(false)} style={{ padding: '0.375rem 0.75rem', borderRadius: '0.5rem', border: 'none', background: 'transparent', color: 'var(--neutral-on-background-weak)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {upgradeOpen && organizationId && (
        <UpgradeModal
          currentPlan={normalizePlanKey(currentPlanForUpgrade)}
          onClose={() => setUpgradeOpen(false)}
        />
      )}

      <FeedbackDetailModal
        isOpen={modalOpen}
        onClose={closeDetail}
        feedbackId={modalFeedbackId}
        teamMembers={teamMembers}
        assignees={modalFeedbackId ? (feedbackAssigneesMap[modalFeedbackId] || []) : []}
        onAssign={handleAssign}
        onUnassign={handleUnassign}
        onStartDateChange={handleStartDateChange}
        onDueDateChange={handleDueDateChange}
      />
    </div>
  )
}
