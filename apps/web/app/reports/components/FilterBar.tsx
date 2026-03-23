'use client'

import { useState, useRef, useEffect } from 'react'
import { Row, Text, Tag, Icon, Button } from '@once-ui-system/core'
import { ALL_TYPES, ALL_SEVERITIES, ALL_STATUSES, getTagVariant, getTypeLabel, getSeverityLabel, getStatusLabel } from '../utils/labels'
import type { FilterState } from '../hooks/useFilters'

interface Project {
  id: string
  name: string
}

interface FilterBarProps {
  filters: FilterState
  projects: Project[]
  currentUserId?: string
  activeFilterCount: number
  onToggleArrayFilter: (field: 'types' | 'severities' | 'statuses', value: string) => void
  onSetProjectId: (projectId: string | null) => void
  onSetAssignee: (assignee: string | null) => void
  onRemoveFilter: (field: keyof FilterState, value?: string) => void
  onClearAll: () => void
  onApplyPreset: (preset: 'my-reports' | 'critical-bugs' | 'unassigned' | 'open', currentUserId?: string) => void
}

// Dropdown popover for multi-select
function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
  onClose,
}: {
  label: string
  options: readonly { value: string; label: string }[]
  selected: string[]
  onToggle: (value: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div ref={ref} style={{
      position: 'absolute',
      top: '100%',
      left: 0,
      marginTop: 4,
      minWidth: 180,
      background: 'var(--surface-background)',
      border: '1px solid var(--neutral-border-medium)',
      borderRadius: '0.75rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      zIndex: 100,
      padding: '0.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem',
    }}>
      <Text variant="label-default-xs" onBackground="neutral-weak" style={{ padding: '0.25rem 0.5rem' }}>{label}</Text>
      {options.map(opt => {
        const isActive = selected.includes(opt.value)
        return (
          <button
            key={opt.value}
            onClick={() => onToggle(opt.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: isActive ? 'var(--brand-alpha-weak)' : 'transparent',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              transition: 'background 0.1s',
            }}
          >
            <div style={{
              width: 16, height: 16, borderRadius: 4,
              border: isActive ? '2px solid var(--brand-solid-strong)' : '2px solid var(--neutral-border-medium)',
              background: isActive ? 'var(--brand-solid-strong)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {isActive && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <Tag variant={getTagVariant(opt.value)} size="s" label={opt.label} />
          </button>
        )
      })}
    </div>
  )
}

function ProjectDropdown({
  projects,
  projectId,
  onSetProjectId,
  onClose,
}: {
  projects: Project[]
  projectId: string | null
  onSetProjectId: (id: string | null) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', left: 0, marginTop: 4, minWidth: 200,
      background: 'var(--surface-background)', border: '1px solid var(--neutral-border-medium)',
      borderRadius: '0.75rem', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100,
      padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: 240, overflowY: 'auto',
    }}>
      <Text variant="label-default-xs" onBackground="neutral-weak" style={{ padding: '0.25rem 0.5rem' }}>Projeto</Text>
      <button onClick={() => onSetProjectId(null)} style={{
        padding: '0.5rem', borderRadius: '0.5rem', border: 'none',
        background: !projectId ? 'var(--brand-alpha-weak)' : 'transparent',
        cursor: 'pointer', textAlign: 'left', fontSize: '0.8125rem', color: 'var(--neutral-on-background-strong)',
      }}>
        Todos
      </button>
      {projects.map(p => (
        <button key={p.id} onClick={() => onSetProjectId(p.id)} style={{
          padding: '0.5rem', borderRadius: '0.5rem', border: 'none',
          background: projectId === p.id ? 'var(--brand-alpha-weak)' : 'transparent',
          cursor: 'pointer', textAlign: 'left', fontSize: '0.8125rem', color: 'var(--neutral-on-background-strong)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {p.name}
        </button>
      ))}
    </div>
  )
}

export default function FilterBar({
  filters,
  projects,
  currentUserId,
  activeFilterCount,
  onToggleArrayFilter,
  onSetProjectId,
  onSetAssignee,
  onRemoveFilter,
  onClearAll,
  onApplyPreset,
}: FilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {/* Filter triggers + presets */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {/* Add filter dropdowns */}
        {[
          { key: 'types', label: 'Tipo', options: ALL_TYPES, selected: filters.types },
          { key: 'severities', label: 'Severidade', options: ALL_SEVERITIES, selected: filters.severities },
          { key: 'statuses', label: 'Status', options: ALL_STATUSES, selected: filters.statuses },
        ].map(filter => (
          <div key={filter.key} style={{ position: 'relative' }}>
            <button
              onClick={() => setOpenDropdown(openDropdown === filter.key ? null : filter.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.5rem',
                border: filter.selected.length > 0
                  ? '1px solid var(--brand-border-strong)'
                  : '1px solid var(--neutral-border-medium)',
                background: filter.selected.length > 0
                  ? 'var(--brand-alpha-weak)'
                  : 'var(--surface-background)',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'var(--neutral-on-background-strong)',
                transition: 'all 0.15s',
              }}
            >
              {filter.label}
              {filter.selected.length > 0 && (
                <span style={{
                  background: 'var(--brand-solid-strong)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 18,
                  height: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                }}>
                  {filter.selected.length}
                </span>
              )}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: openDropdown === filter.key ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {openDropdown === filter.key && (
              <FilterDropdown
                label={filter.label}
                options={filter.options}
                selected={filter.selected}
                onToggle={(value) => onToggleArrayFilter(filter.key as 'types' | 'severities' | 'statuses', value)}
                onClose={() => setOpenDropdown(null)}
              />
            )}
          </div>
        ))}

        {/* Project filter */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setOpenDropdown(openDropdown === 'project' ? null : 'project')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.5rem',
              border: filters.projectId
                ? '1px solid var(--brand-border-strong)'
                : '1px solid var(--neutral-border-medium)',
              background: filters.projectId
                ? 'var(--brand-alpha-weak)'
                : 'var(--surface-background)',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--neutral-on-background-strong)',
              transition: 'all 0.15s',
            }}
          >
            Projeto
            {filters.projectId && (
              <span style={{
                background: 'var(--brand-solid-strong)',
                color: '#fff',
                borderRadius: '50%',
                width: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.6875rem',
                fontWeight: 700,
              }}>
                1
              </span>
            )}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: openDropdown === 'project' ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {openDropdown === 'project' && (
            <ProjectDropdown
              projects={projects}
              projectId={filters.projectId}
              onSetProjectId={(id) => { onSetProjectId(id); setOpenDropdown(null) }}
              onClose={() => setOpenDropdown(null)}
            />
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: 'var(--neutral-border-medium)', flexShrink: 0 }} />

        {/* Quick presets */}
        {currentUserId && (
          <button
            onClick={() => onApplyPreset('my-reports', currentUserId)}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--neutral-border-medium)',
              background: filters.assignee === currentUserId ? 'var(--brand-alpha-weak)' : 'var(--surface-background)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'var(--neutral-on-background-medium)',
              transition: 'all 0.15s',
            }}
          >
            Meus reports
          </button>
        )}
        <button
          onClick={() => onApplyPreset('critical-bugs')}
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--neutral-border-medium)',
            background: filters.types.length === 1 && filters.types[0] === 'BUG' && filters.severities.length === 1 && filters.severities[0] === 'CRITICAL' ? 'var(--danger-alpha-weak)' : 'var(--surface-background)',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 500,
            color: 'var(--neutral-on-background-medium)',
            transition: 'all 0.15s',
          }}
        >
          Bugs críticos
        </button>
        <button
          onClick={() => onApplyPreset('unassigned')}
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--neutral-border-medium)',
            background: filters.assignee === 'unassigned' ? 'var(--warning-alpha-weak)' : 'var(--surface-background)',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 500,
            color: 'var(--neutral-on-background-medium)',
            transition: 'all 0.15s',
          }}
        >
          Sem responsável
        </button>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
          {filters.types.map(t => (
            <Tag key={`type-${t}`} variant={getTagVariant(t)} size="s" label={getTypeLabel(t)}
              onClick={() => onRemoveFilter('types', t)}
              style={{ cursor: 'pointer' }}
            />
          ))}
          {filters.severities.map(s => (
            <Tag key={`sev-${s}`} variant={getTagVariant(s)} size="s" label={getSeverityLabel(s)}
              onClick={() => onRemoveFilter('severities', s)}
              style={{ cursor: 'pointer' }}
            />
          ))}
          {filters.statuses.map(s => (
            <Tag key={`status-${s}`} variant={getTagVariant(s)} size="s" label={getStatusLabel(s)}
              onClick={() => onRemoveFilter('statuses', s)}
              style={{ cursor: 'pointer' }}
            />
          ))}
          {filters.projectId && (
            <Tag variant="neutral" size="s"
              label={`Projeto: ${projects.find(p => p.id === filters.projectId)?.name || '...'}`}
              onClick={() => onRemoveFilter('projectId')}
              style={{ cursor: 'pointer' }}
            />
          )}
          {filters.assignee && (
            <Tag variant="neutral" size="s"
              label={filters.assignee === 'unassigned' ? 'Sem responsável' : 'Meus reports'}
              onClick={() => onRemoveFilter('assignee')}
              style={{ cursor: 'pointer' }}
            />
          )}
          <button
            onClick={onClearAll}
            style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '0.375rem',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'var(--danger-on-background-strong)',
              transition: 'color 0.15s',
            }}
          >
            Limpar tudo
          </button>
        </div>
      )}
    </div>
  )
}
