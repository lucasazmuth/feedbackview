'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Tag, Text } from '@once-ui-system/core'
import { getTagVariant, getTypeLabel, getSeverityLabel } from '../utils/labels'

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
        <Tag variant={getTagVariant(feedback.type)} size="s" label={getTypeLabel(feedback.type)} />
        {feedback.severity && (
          <Tag variant={getTagVariant(feedback.severity)} size="s" label={getSeverityLabel(feedback.severity)} />
        )}
      </div>

      {/* Title/comment */}
      <Text
        variant="body-default-s"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.4,
          fontWeight: 500,
        }}
      >
        {feedback.title || feedback.comment?.slice(0, 80)}
      </Text>

      {/* Project name + date row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        {feedback.Project?.name ? (
          <Text variant="body-default-xs" onBackground="neutral-weak" style={{
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
          }}>
            {feedback.Project.name}
          </Text>
        ) : (
          <span />
        )}
        <Text
          variant="body-default-xs"
          onBackground={isOverdue ? 'danger-strong' : 'neutral-weak'}
          style={{ fontSize: '0.6875rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.2rem' }}
        >
          {hasDueDate && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          )}
          {dueDateStr || dateStr}
        </Text>
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
