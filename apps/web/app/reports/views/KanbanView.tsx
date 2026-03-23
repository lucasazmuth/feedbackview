'use client'

import { useState, useMemo } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core'
import { KANBAN_STATUSES } from '../utils/labels'
import KanbanColumn from './KanbanColumn'
import KanbanCard from './KanbanCard'

interface Feedback {
  id: string
  type: string
  severity?: string
  status: string
  comment: string
  title?: string
  createdAt: string
  projectId: string
  Project?: { id: string; name: string; ownerId?: string }
}

interface Assignee {
  userId: string
  name: string | null
  email: string
}

interface KanbanViewProps {
  feedbacks: Feedback[]
  feedbackAssigneesMap: Record<string, Assignee[]>
  onOpenDetail: (feedbackId: string) => void
  onStatusChange: (feedbackId: string, newStatus: string) => void
}

export default function KanbanView({ feedbacks, feedbackAssigneesMap, onOpenDetail, onStatusChange }: KanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, string>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // Group feedbacks by status with optimistic overrides
  const grouped = useMemo(() => {
    const groups: Record<string, Feedback[]> = {}
    for (const s of KANBAN_STATUSES) groups[s] = []

    for (const f of feedbacks) {
      const effectiveStatus = optimisticStatuses[f.id] || f.status
      if (groups[effectiveStatus]) {
        groups[effectiveStatus].push({ ...f, status: effectiveStatus })
      }
      // Skip CANCELLED/ARCHIVED — they don't show in kanban
    }
    return groups
  }, [feedbacks, optimisticStatuses])

  const activeFeedback = activeId ? feedbacks.find(f => f.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const feedbackId = active.id as string
    const feedback = feedbacks.find(f => f.id === feedbackId)
    if (!feedback) return

    // Determine target status
    let targetStatus: string | null = null

    // If dropped on a column (droppable ID is the status)
    if (KANBAN_STATUSES.includes(over.id as any)) {
      targetStatus = over.id as string
    }
    // If dropped on another card, find which column it belongs to
    else {
      const overFeedback = feedbacks.find(f => f.id === over.id)
      if (overFeedback) {
        targetStatus = optimisticStatuses[overFeedback.id] || overFeedback.status
      }
    }

    if (!targetStatus) return

    const currentStatus = optimisticStatuses[feedbackId] || feedback.status
    if (targetStatus === currentStatus) return

    // Optimistic update
    setOptimisticStatuses(prev => ({ ...prev, [feedbackId]: targetStatus! }))

    // API call
    onStatusChange(feedbackId, targetStatus)

    // Clear optimistic override after a delay (the parent will refresh data)
    setTimeout(() => {
      setOptimisticStatuses(prev => {
        const next = { ...prev }
        delete next[feedbackId]
        return next
      })
    }, 2000)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        overflowX: 'auto',
        paddingBottom: '1rem',
        minHeight: 400,
      }}>
        {KANBAN_STATUSES.map(status => (
          <KanbanColumn
            key={status}
            status={status}
            feedbacks={grouped[status] || []}
            feedbackAssigneesMap={feedbackAssigneesMap}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>

      {/* Drag overlay for smooth dragging */}
      <DragOverlay>
        {activeFeedback ? (
          <div style={{ opacity: 0.85, transform: 'rotate(3deg)' }}>
            <KanbanCard
              feedback={activeFeedback}
              assignees={feedbackAssigneesMap[activeFeedback.id] || []}
              onClick={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
