'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  Column,
  Row,
  Text,
  Tag,
  Icon,
  Card,
  Flex,
} from '@once-ui-system/core'
import { api } from '@/lib/api'

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

interface ProjectFeedbacksTabProps {
  feedbacks: Feedback[]
  feedbackAssigneesMap: Record<string, { userId: string; name: string | null; email: string }[]>
  teamMembers: TeamMember[]
  currentUserId?: string
  projectName: string
}

export default function ProjectFeedbacksTab({
  feedbacks: initialFeedbacks,
  feedbackAssigneesMap: initialAssigneesMap,
  teamMembers,
  currentUserId,
  projectName,
}: ProjectFeedbacksTabProps) {
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
  const [bulkStatusLoading, setBulkStatusLoading] = useState(false)
  const handleBulkStatusChange = useCallback(async (status: string) => {
    setBulkStatusLoading(true)
    const ids = selectionRef.current.selectedArray
    setFeedbacks(prev => prev.map(f => ids.includes(f.id) ? { ...f, status } : f))
    try {
      await api.feedbacks.bulkUpdateStatus(ids, status)
      selectionRef.current.clearSelection()
    } catch { setFeedbacks(initialFeedbacks) }
    setBulkStatusLoading(false)
  }, [initialFeedbacks])

  const displayFeedbacks = viewMode === 'kanban' ? filteredFeedbacks : sortedFeedbacks

  return (
    <Column gap="l" fillWidth>
      {/* Search + View toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--neutral-on-background-weak)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
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

        {/* View toggle */}
        <div style={{ display: 'flex', borderRadius: '0.5rem', border: '1px solid var(--neutral-border-medium)', overflow: 'hidden', flexShrink: 0 }}>
          {[
            { mode: 'card' as ViewMode, title: 'Cards', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg> },
            { mode: 'list' as ViewMode, title: 'Lista', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg> },
            { mode: 'kanban' as ViewMode, title: 'Kanban', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="18" rx="1" /><rect x="10" y="3" width="5" height="12" rx="1" /><rect x="17" y="3" width="5" height="15" rx="1" /></svg> },
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

      {/* Content */}
      {displayFeedbacks.length === 0 ? (
        <Card fillWidth padding="xl" radius="l" style={{ textAlign: 'center' }}>
          <Column fillWidth horizontal="center" gap="m" paddingY="l">
            <Flex horizontal="center" vertical="center" radius="full" style={{ width: '3rem', height: '3rem', background: 'var(--neutral-alpha-weak)' }}>
              <Icon name="message" size="m" />
            </Flex>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {feedbacks.length === 0
                ? 'Nenhum report ainda. Compartilhe a URL do visualizador!'
                : 'Nenhum report com os filtros selecionados.'}
            </Text>
          </Column>
        </Card>
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
        onArchive={() => handleBulkStatusChange('ARCHIVED')}
        onClearSelection={selection.clearSelection}
        statusLoading={bulkStatusLoading}
      />

      <FeedbackDetailModal
        isOpen={modalOpen}
        onClose={closeDetail}
        feedbackId={modalFeedbackId}
      />
    </Column>
  )
}
