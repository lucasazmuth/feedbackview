'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatDate, getTagColors, getTypeLabel, getSeverityLabel, getStatusLabel } from '../utils/labels'
import InlineStatusDropdown from '../components/InlineStatusDropdown'
import InlineAssigneeEditor from '../components/InlineAssigneeEditor'
import InlineDatePicker from '../components/InlineDatePicker'
import type { SortField, SortState } from '../hooks/useSort'
import { AppIcon } from '@/components/ui/AppIcon'
import { ICON_STROKE } from '@/lib/icon-tokens'

interface Feedback {
  id: string
  type: string
  severity?: string
  status: string
  comment: string
  startDate?: string | null
  dueDate?: string | null
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

interface TableViewProps {
  feedbacks: Feedback[]
  feedbackAssigneesMap: Record<string, { userId: string; name: string | null; email: string }[]>
  teamMembers: TeamMember[]
  sort: SortState
  onToggleSort: (field: SortField) => void
  isSelected: (id: string) => boolean
  onToggleSelect: (id: string) => void
  onSelectAll: (ids: string[]) => void
  selectedCount: number
  onOpenDetail: (feedbackId: string) => void
  onStatusChange: (feedbackId: string, status: string) => void
  onAssign: (feedbackId: string, userIds: string[]) => void
  onUnassign: (feedbackId: string, userId: string) => void
  onReorder: (orderedIds: string[]) => void
  onStartDateChange: (feedbackId: string, startDate: string | null) => void
  onDueDateChange: (feedbackId: string, dueDate: string | null) => void
}

const GRID_COLS = '1.25rem 1.5rem 7rem 8rem 1fr 5.5rem 7rem 2.5rem 11rem'

const cellStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', minHeight: '1.75rem' }

const STATUS_ACCENT: Record<string, string> = {
  OPEN: 'var(--warning-solid-strong)',
  IN_PROGRESS: 'var(--info-solid-strong)',
  UNDER_REVIEW: 'var(--brand-solid-strong)',
  RESOLVED: 'var(--success-solid-strong)',
  CANCELLED: 'var(--danger-solid-strong)',
  ARCHIVED: 'var(--neutral-solid-medium)',
}

const STATUS_DISPLAY_ORDER = ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'RESOLVED', 'CANCELLED']

function SortHeader({ label, field, sort, onToggleSort }: { label: string; field: SortField; sort: SortState; onToggleSort: (f: SortField) => void }) {
  const isActive = sort.field === field
  return (
    <button
      onClick={() => onToggleSort(field)}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.25rem',
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        color: isActive ? 'var(--neutral-on-background-strong)' : 'var(--neutral-on-background-weak)',
        fontSize: '1.1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em',
      }}
    >
      {label}
      {isActive && (
        <AppIcon size={10} strokeWidth={2.5} style={{ transform: sort.direction === 'asc' ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>
          <polyline points="6 9 12 15 18 9" />
        </AppIcon>
      )}
    </button>
  )
}

function Checkbox({ checked, onClick }: { checked: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 16, height: 16, borderRadius: 3,
        border: checked ? '2px solid var(--brand-solid-strong)' : '2px solid var(--neutral-border-medium)',
        background: checked ? 'var(--brand-solid-strong)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0,
      }}
    >
      {checked && (
        <AppIcon size={10} strokeWidth={3} style={{ color: '#fff' }}>
          <polyline points="20 6 9 17 4 12" />
        </AppIcon>
      )}
    </div>
  )
}

// Drag handle that appears on hover
function DragHandle() {
  return (
    <div style={{
      width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'grab', color: 'var(--neutral-on-background-weak)', opacity: 0.5,
      flexShrink: 0,
    }}>
      <AppIcon size="xs" fill="currentColor" stroke="none">
        <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
        <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
        <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
      </AppIcon>
    </div>
  )
}

// Sortable row wrapper
function SortableRow({
  feedback,
  feedbackAssigneesMap,
  teamMembers,
  isSelected,
  onToggleSelect,
  onOpenDetail,
  onStatusChange,
  onAssign,
  onUnassign,
  onStartDateChange,
  onDueDateChange,
  accentColor,
  isLast,
}: {
  feedback: Feedback
  feedbackAssigneesMap: Record<string, { userId: string; name: string | null; email: string }[]>
  teamMembers: TeamMember[]
  isSelected: boolean
  onToggleSelect: (id: string) => void
  onOpenDetail: (feedbackId: string) => void
  onStatusChange: (feedbackId: string, status: string) => void
  onAssign: (feedbackId: string, userIds: string[]) => void
  onUnassign: (feedbackId: string, userId: string) => void
  onStartDateChange: (feedbackId: string, startDate: string | null) => void
  onDueDateChange: (feedbackId: string, dueDate: string | null) => void
  accentColor: string
  isLast: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: feedback.id,
    data: { type: 'row', status: feedback.status },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'grid',
        gridTemplateColumns: GRID_COLS,
        padding: '0.5rem 1rem',
        borderBottom: !isLast ? '1px solid var(--neutral-border-medium)' : undefined,
        borderLeft: `3px solid ${accentColor}`,
        cursor: 'pointer',
        transition: 'background 0.15s',
        gap: '1rem',
        alignItems: 'center',
        background: isSelected ? 'var(--brand-alpha-weak)' : 'var(--surface-background)',
      }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--neutral-alpha-weak)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? 'var(--brand-alpha-weak)' : 'var(--surface-background)' }}
    >
      {/* Drag handle */}
      <div style={cellStyle} {...attributes} {...listeners}>
        <DragHandle />
      </div>
      <div style={cellStyle}>
        <Checkbox
          checked={isSelected}
          onClick={(e) => { e.stopPropagation(); onToggleSelect(feedback.id) }}
        />
      </div>
      <div style={cellStyle} onClick={() => onOpenDetail(feedback.id)}>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: getTagColors(feedback.type).bg, color: getTagColors(feedback.type).color }}>{getTypeLabel(feedback.type)}</span>
      </div>
      <div style={{ ...cellStyle, overflow: 'hidden' }} onClick={() => onOpenDetail(feedback.id)}>
        <span className="text-xs text-gray truncate cursor-pointer">
          {feedback.Project?.name || '—'}
        </span>
      </div>
      <div style={{ ...cellStyle, overflow: 'hidden' }} onClick={() => onOpenDetail(feedback.id)}>
        <span className="text-sm text-primary-text truncate cursor-pointer">
          {feedback.comment}
        </span>
      </div>
      <div style={cellStyle} onClick={() => onOpenDetail(feedback.id)}>
        {feedback.severity ? (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: getTagColors(feedback.severity).bg, color: getTagColors(feedback.severity).color }}>{getSeverityLabel(feedback.severity)}</span>
        ) : (
          <span style={{ fontSize: '1.2rem', color: 'var(--neutral-on-background-weak)' }}>—</span>
        )}
      </div>
      <div style={cellStyle}>
        <InlineStatusDropdown
          status={feedback.status}
          onStatusChange={(newStatus) => onStatusChange(feedback.id, newStatus)}
        />
      </div>
      <div style={cellStyle}>
        <InlineAssigneeEditor
          feedbackId={feedback.id}
          assignees={feedbackAssigneesMap[feedback.id] || []}
          teamMembers={teamMembers}
          onAssign={onAssign}
          onUnassign={onUnassign}
        />
      </div>
      {/* Combined date range: start → due */}
      <div style={{ ...cellStyle, gap: '0.25rem', minWidth: 0 }}>
        <InlineDatePicker
          feedbackId={feedback.id}
          dueDate={feedback.startDate || feedback.createdAt}
          onDueDateChange={(id, date) => onStartDateChange(id, date)}
          label="Início"
        />
        <span style={{ color: 'var(--neutral-on-background-weak)', fontSize: '0.6875rem' }}>&rarr;</span>
        <InlineDatePicker
          feedbackId={feedback.id}
          dueDate={feedback.dueDate || null}
          onDueDateChange={onDueDateChange}
        />
      </div>
    </div>
  )
}

// Drag overlay (what you see while dragging)
function DragOverlayRow({ feedback }: { feedback: Feedback }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.625rem 1rem',
      background: 'var(--surface-background)',
      border: '1px solid var(--brand-border-strong)',
      borderRadius: '0.5rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      maxWidth: 500,
    }}>
      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: getTagColors(feedback.type).bg, color: getTagColors(feedback.type).color }}>{getTypeLabel(feedback.type)}</span>
      <span className="text-sm text-primary-text truncate">
        {feedback.comment?.slice(0, 60)}
      </span>
    </div>
  )
}

export default function TableView({
  feedbacks,
  feedbackAssigneesMap,
  teamMembers,
  sort,
  onToggleSort,
  isSelected: isSelectedFn,
  onToggleSelect,
  onSelectAll,
  selectedCount,
  onOpenDetail,
  onStatusChange,
  onAssign,
  onUnassign,
  onReorder,
  onStartDateChange,
  onDueDateChange,
}: TableViewProps) {
  const groups = useMemo(() => {
    const map: Record<string, Feedback[]> = {}
    for (const f of feedbacks) {
      if (!map[f.status]) map[f.status] = []
      map[f.status].push(f)
    }
    return STATUS_DISPLAY_ORDER
      .filter(s => map[s] && map[s].length > 0)
      .map(s => ({ status: s, items: map[s] }))
  }, [feedbacks])

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [activeId, setActiveId] = useState<string | null>(null)

  const toggleCollapse = (status: string) => {
    setCollapsed(prev => ({ ...prev, [status]: !prev[status] }))
  }

  // DnD setup
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const feedbackMap = useMemo(() => {
    const m = new Map<string, Feedback>()
    for (const f of feedbacks) m.set(f.id, f)
    return m
  }, [feedbacks])

  const activeFeedback = activeId ? feedbackMap.get(activeId) : null

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const draggedId = active.id as string
    const overId = over.id as string
    const draggedStatus = active.data?.current?.status
    const overStatus = over.data?.current?.status

    // Same group → reorder
    if (draggedStatus && overStatus && draggedStatus === overStatus) {
      const group = groups.find(g => g.status === draggedStatus)
      if (group) {
        const ids = group.items.map(f => f.id)
        const oldIndex = ids.indexOf(draggedId)
        const newIndex = ids.indexOf(overId)
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const newOrder = arrayMove(ids, oldIndex, newIndex)
          onReorder(newOrder)
        }
      }
      return
    }

    // Different group → change status
    let targetStatus: string | null = null
    if (overId.startsWith('group-')) {
      targetStatus = overId.replace('group-', '')
    } else if (overStatus) {
      targetStatus = overStatus
    }

    if (targetStatus && feedbackMap.get(draggedId)?.status !== targetStatus) {
      onStatusChange(draggedId, targetStatus)
    }
  }, [feedbackMap, onStatusChange, onReorder, groups])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full flex flex-col gap-4" style={{ minWidth: 0 }}>
        {groups.map(group => {
          const isCollapsed = collapsed[group.status] ?? false
          const groupIds = group.items.map(f => f.id)
          const accentColor = STATUS_ACCENT[group.status] || 'var(--neutral-solid-medium)'

          return (
            <div key={group.status} style={{ borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--neutral-border-medium)' }}>
              {/* Group header */}
              <div
                onClick={() => toggleCollapse(group.status)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.625rem 1rem',
                  background: 'var(--neutral-alpha-weak)',
                  cursor: 'pointer',
                  borderLeft: `3px solid ${accentColor}`,
                  userSelect: 'none',
                }}
              >
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="var(--neutral-on-background-weak)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 0.15s', flexShrink: 0 }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: getTagColors(group.status).bg, color: getTagColors(group.status).color }}>{getStatusLabel(group.status)}</span>
                <span style={{
                  fontSize: '1.2rem', fontWeight: 600, color: 'var(--neutral-on-background-weak)',
                  background: 'var(--neutral-alpha-medium)', borderRadius: '50%',
                  width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {group.items.length}
                </span>
              </div>

              {/* Column headers */}
              {!isCollapsed && (
                <div style={{
                  display: 'grid', gridTemplateColumns: GRID_COLS,
                  padding: '0.5rem 1rem',
                  borderBottom: '1px solid var(--neutral-border-medium)',
                  borderLeft: `3px solid ${accentColor}`,
                  gap: '1rem', alignItems: 'center',
                  background: 'var(--surface-background)',
                }}>
                  <span /> {/* drag handle column */}
                  <Checkbox
                    checked={groupIds.length > 0 && groupIds.every(id => isSelectedFn(id))}
                    onClick={(e) => { e.stopPropagation(); onSelectAll(groupIds) }}
                  />
                  <span className="text-xs font-medium text-gray uppercase">TIPO</span>
                  <span className="text-xs font-medium text-gray uppercase">PROJETO</span>
                  <span className="text-xs font-medium text-gray uppercase">Comentário</span>
                  <SortHeader label="Prioridade" field="severity" sort={sort} onToggleSort={onToggleSort} />
                  <span className="text-xs font-medium text-gray uppercase">STATUS</span>
                  <span className="text-xs font-medium text-gray uppercase">RESP.</span>
                  <SortHeader label="Prazo" field="createdAt" sort={sort} onToggleSort={onToggleSort} />
                </div>
              )}

              {/* Rows with drag & drop */}
              {!isCollapsed && (
                <SortableContext items={groupIds} strategy={verticalListSortingStrategy} id={`group-${group.status}`}>
                  {group.items.map((feedback, i) => (
                    <SortableRow
                      key={feedback.id}
                      feedback={feedback}
                      feedbackAssigneesMap={feedbackAssigneesMap}
                      teamMembers={teamMembers}
                      isSelected={isSelectedFn(feedback.id)}
                      onToggleSelect={onToggleSelect}
                      onOpenDetail={onOpenDetail}
                      onStatusChange={onStatusChange}
                      onAssign={onAssign}
                      onUnassign={onUnassign}
                      onStartDateChange={onStartDateChange}
                      onDueDateChange={onDueDateChange}
                      accentColor={accentColor}
                      isLast={i === group.items.length - 1}
                    />
                  ))}
                </SortableContext>
              )}

              {/* Group footer */}
              {!isCollapsed && (
                <div style={{
                  padding: '0.375rem 1rem',
                  borderLeft: `3px solid ${accentColor}`,
                  background: 'var(--neutral-alpha-weak)',
                  fontSize: '1.1rem',
                  color: 'var(--neutral-on-background-weak)',
                }}>
                  {group.items.length}/{feedbacks.length} reports
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeFeedback ? <DragOverlayRow feedback={activeFeedback} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
