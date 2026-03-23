'use client'

import { useState, useRef, useEffect } from 'react'
import { Text } from '@once-ui-system/core'

interface TeamMember {
  id: string
  name: string | null
  email: string
}

interface Assignee {
  userId: string
  name: string | null
  email: string
}

interface InlineAssigneeEditorProps {
  feedbackId: string
  assignees: Assignee[]
  teamMembers: TeamMember[]
  onAssign: (feedbackId: string, userIds: string[]) => void
  onUnassign: (feedbackId: string, userId: string) => void
}

export default function InlineAssigneeEditor({ feedbackId, assignees, teamMembers, onAssign, onUnassign }: InlineAssigneeEditorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const assigneeIds = new Set(assignees.map(a => a.userId))

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        style={{ display: 'flex', cursor: 'pointer', alignItems: 'center' }}
      >
        {assignees.length === 0 ? (
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            border: '1.5px dashed var(--neutral-border-medium)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--neutral-on-background-weak)',
            fontSize: 12,
          }}>
            +
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 4,
          minWidth: 220,
          maxHeight: 280,
          overflowY: 'auto',
          background: 'var(--surface-background)',
          border: '1px solid var(--neutral-border-medium)',
          borderRadius: '0.75rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 200,
          padding: '0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.125rem',
        }}>
          <Text variant="label-default-xs" onBackground="neutral-weak" style={{ padding: '0.25rem 0.5rem' }}>
            Responsáveis
          </Text>
          {teamMembers.map(m => {
            const isAssigned = assigneeIds.has(m.id)
            return (
              <button
                key={m.id}
                onClick={(e) => {
                  e.stopPropagation()
                  if (isAssigned) onUnassign(feedbackId, m.id)
                  else onAssign(feedbackId, [m.id])
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: isAssigned ? 'var(--brand-alpha-weak)' : 'transparent',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: isAssigned ? 'var(--brand-solid-strong)' : '#111',
                  color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, flexShrink: 0,
                }}>
                  {(m.name || m.email).charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="body-default-s" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.name || m.email.split('@')[0]}
                  </Text>
                  <Text variant="body-default-xs" onBackground="neutral-weak" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.email}
                  </Text>
                </div>
                {isAssigned && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand-solid-strong)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
          {teamMembers.length === 0 && (
            <Text variant="body-default-xs" onBackground="neutral-weak" style={{ padding: '0.5rem', textAlign: 'center' }}>
              Nenhum membro encontrado
            </Text>
          )}
        </div>
      )}
    </div>
  )
}
