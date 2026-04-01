'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getTagColors, getTypeLabel, getSeverityLabel } from '../utils/labels'
import { AppIcon } from '@/components/ui/AppIcon'
import { ICON_STROKE } from '@/lib/icon-tokens'

interface Feedback {
  id: string
  type: string
  severity?: string
  status: string
  comment: string
  title?: string
  dueDate?: string | null
  createdAt: string
  projectId: string
  Project?: { id: string; name: string; ownerId?: string }
}

interface Assignee {
  userId: string
  name: string | null
  email: string
}

interface KanbanCardProps {
  feedback: Feedback
  assignees: Assignee[]
  onClick: (feedbackId: string) => void
}

export default function KanbanCard({ feedback, assignees, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: feedback.id,
    data: { type: 'feedback', feedback },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const dateStr = new Date(feedback.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const hasDueDate = !!feedback.dueDate
  const isOverdue = hasDueDate && new Date(feedback.dueDate!) < new Date()
  const dueDateStr = hasDueDate
    ? new Date(feedback.dueDate!).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : null

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: 'var(--surface-background)',
        border: '1px solid var(--neutral-border-medium)',
        borderRadius: '0.75rem',
        padding: '0.75rem',
        cursor: 'grab',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        transition: 'box-shadow 0.15s, opacity 0.15s',
      }}
      {...attributes}
      {...listeners}
      onClick={() => onClick(feedback.id)}
    >
      {/* Tags row */}
      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: getTagColors(feedback.type).bg, color: getTagColors(feedback.type).color }}>{getTypeLabel(feedback.type)}</span>
        {feedback.severity && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: getTagColors(feedback.severity).bg, color: getTagColors(feedback.severity).color }}>{getSeverityLabel(feedback.severity)}</span>
        )}
      </div>

      {/* Title/comment */}
      <span
        className="text-sm text-primary-text font-medium"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.4,
        }}
      >
        {feedback.title || feedback.comment?.slice(0, 80)}
      </span>

      {/* Project name + date row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        {feedback.Project?.name ? (
          <span className="text-xs text-gray truncate" style={{ minWidth: 0 }}>
            {feedback.Project.name}
          </span>
        ) : (
          <span />
        )}
        <span
          className={`text-xs flex-shrink-0 flex items-center gap-0.5 ${isOverdue ? 'text-red-400' : 'text-gray'}`}
          style={{ fontSize: '0.6875rem' }}
        >
          {hasDueDate && (
            <AppIcon size={10} strokeWidth={ICON_STROKE.emphasis}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </AppIcon>
          )}
          {dueDateStr || dateStr}
        </span>
      </div>

      {/* Assignees row — bottom right like ClickUp */}
      {assignees.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          {assignees.slice(0, 3).map((a, idx) => (
            <div key={a.userId} title={a.name || a.email} style={{
              width: 22, height: 22, borderRadius: '50%', background: '#111', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, marginLeft: idx > 0 ? -6 : 0,
              border: '2px solid var(--surface-background)', zIndex: 3 - idx,
            }}>
              {(a.name || a.email).charAt(0).toUpperCase()}
            </div>
          ))}
          {assignees.length > 3 && (
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--neutral-alpha-weak)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 600, marginLeft: -6,
              border: '2px solid var(--surface-background)',
            }}>
              +{assignees.length - 3}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
