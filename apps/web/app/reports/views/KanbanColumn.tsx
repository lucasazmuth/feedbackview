'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { getTagColors, getStatusLabel } from '../utils/labels'
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

interface KanbanColumnProps {
  status: string
  feedbacks: Feedback[]
  feedbackAssigneesMap: Record<string, Assignee[]>
  onOpenDetail: (feedbackId: string) => void
}

export default function KanbanColumn({ status, feedbacks, feedbackAssigneesMap, onOpenDetail }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      style={{
        minWidth: 280,
        maxWidth: 320,
        flex: '1 0 280px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        background: isOver ? 'var(--brand-alpha-weak)' : 'var(--neutral-alpha-weak)',
        borderRadius: '0.75rem',
        padding: '0.75rem',
        transition: 'background 0.2s',
        maxHeight: 'calc(100vh - 16rem)',
        overflowY: 'auto',
      }}
    >
      {/* Column header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.25rem 0.5rem' }}>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: getTagColors(status).bg, color: getTagColors(status).color }}>{getStatusLabel(status)}</span>
        <span className="text-xs font-medium text-gray">
          {feedbacks.length}
        </span>
      </div>

      {/* Cards */}
      <SortableContext items={feedbacks.map(f => f.id)} strategy={verticalListSortingStrategy}>
        {feedbacks.map(feedback => (
          <KanbanCard
            key={feedback.id}
            feedback={feedback}
            assignees={feedbackAssigneesMap[feedback.id] || []}
            onClick={onOpenDetail}
          />
        ))}
      </SortableContext>

      {feedbacks.length === 0 && (
        <div style={{
          padding: '2rem 1rem',
          textAlign: 'center',
          border: '2px dashed var(--neutral-border-medium)',
          borderRadius: '0.5rem',
        }}>
          <span className="text-xs text-gray">
            Nenhum report
          </span>
        </div>
      )}
    </div>
  )
}
