'use client'

import { useState, useRef, useEffect } from 'react'
import { ALL_TYPES, ALL_SEVERITIES, ALL_STATUSES, getTagColors, getTypeLabel, getSeverityLabel, getStatusLabel } from '../utils/labels'
import type { FilterState } from '../hooks/useFilters'
import { AppIcon } from '@/components/ui/AppIcon'
import { ICON_STROKE } from '@/lib/icon-tokens'

interface Project {
  id: string
  name: string
}

interface FilterBarProps {
  filters: FilterState
  projects: Project[]
  currentUserId?: string
  activeFilterCount: number
  compact?: boolean
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
      gap: '0.5rem',
    }}>
      <span className="text-xs font-medium text-gray" style={{ padding: '0.4rem 0.8rem' }}>{label}</span>
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
                <AppIcon size={10} strokeWidth={3} style={{ color: '#fff' }}>
                  <polyline points="20 6 9 17 4 12" />
                </AppIcon>
              )}
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: getTagColors(opt.value).bg, color: getTagColors(opt.value).color }}>{opt.label}</span>
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
      padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 240, overflowY: 'auto',
    }}>
      <span className="text-xs font-medium text-gray" style={{ padding: '0.4rem 0.8rem' }}>Projeto</span>
      <button onClick={() => onSetProjectId(null)} style={{
        padding: '0.5rem', borderRadius: '0.5rem', border: 'none',
        background: !projectId ? 'var(--brand-alpha-weak)' : 'transparent',
        cursor: 'pointer', textAlign: 'left', fontSize: '1.4rem', color: 'var(--neutral-on-background-strong)',
      }}>
        Todos
      </button>
      {projects.map(p => (
        <button key={p.id} onClick={() => onSetProjectId(p.id)} style={{
          padding: '0.5rem', borderRadius: '0.5rem', border: 'none',
          background: projectId === p.id ? 'var(--brand-alpha-weak)' : 'transparent',
          cursor: 'pointer', textAlign: 'left', fontSize: '1.4rem', color: 'var(--neutral-on-background-strong)',
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
  compact,
  onToggleArrayFilter,
  onSetProjectId,
  onSetAssignee,
  onRemoveFilter,
  onClearAll,
  onApplyPreset,
}: FilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!panelOpen) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setPanelOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [panelOpen])

  // Compact mode: icon-only filter button with absolute popover
  const filterBtnRef = useRef<HTMLButtonElement>(null)

  if (compact) {
    return (
      <>
        <div style={{ position: 'relative', flexShrink: 0 }} ref={panelRef}>
          <button
            ref={filterBtnRef}
            onClick={() => setPanelOpen(!panelOpen)}
            title="Filtros"
            style={{
              width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              borderRadius: '0.5rem',
              border: activeFilterCount > 0 ? '1px solid var(--brand-border-strong)' : '1px solid var(--neutral-border-medium)',
              background: activeFilterCount > 0 ? 'var(--brand-alpha-weak)' : 'var(--surface-background)',
              cursor: 'pointer',
              color: activeFilterCount > 0 ? 'var(--brand-on-background-strong)' : 'var(--neutral-on-background-weak)',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}>
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="7" y1="12" x2="17" y2="12" />
              <line x1="10" y1="18" x2="14" y2="18" />
            </AppIcon>
            {activeFilterCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: 'var(--brand-solid-strong)', color: '#fff',
                borderRadius: '50%', width: 16, height: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', fontWeight: 700,
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>

            {panelOpen && (
              <div className="app-filter-dropdown" style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                zIndex: 9999, width: '18rem', maxHeight: '70vh', overflowY: 'auto',
              }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--neutral-on-background-weak)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Filtrar por
                </span>

                {/* Filter sections */}
                {[
                  { key: 'types' as const, label: 'Tipo', options: ALL_TYPES, selected: filters.types },
                  { key: 'severities' as const, label: 'Severidade', options: ALL_SEVERITIES, selected: filters.severities },
                  { key: 'statuses' as const, label: 'Status', options: ALL_STATUSES, selected: filters.statuses },
                ].map(filter => (
                  <div key={filter.key}>
                    <span className="app-filter-label">{filter.label}</span>
                    <div className="app-filter-chips">
                      {filter.options.map(opt => {
                        const isActive = filter.selected.includes(opt.value)
                        return (
                          <button
                            key={opt.value}
                            onClick={() => onToggleArrayFilter(filter.key, opt.value)}
                            className={`app-filter-chip${isActive ? ' app-filter-chip--active' : ''}`}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* Quick presets */}
                <div>
                  <span className="app-filter-label">Atalhos</span>
                  <div className="app-filter-chips">
                    {currentUserId && (
                      <button onClick={() => { onApplyPreset('my-reports', currentUserId); setPanelOpen(false) }}
                        className="app-filter-chip">
                        Meus reports
                      </button>
                    )}
                    <button onClick={() => { onApplyPreset('critical-bugs'); setPanelOpen(false) }}
                      className="app-filter-chip">
                      Bugs críticos
                    </button>
                    <button onClick={() => { onApplyPreset('unassigned'); setPanelOpen(false) }}
                      className="app-filter-chip">
                      Sem responsável
                    </button>
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <button onClick={() => { onClearAll(); setPanelOpen(false) }}
                    style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--danger-on-background-strong)', textAlign: 'center' }}>
                    Limpar filtros
                  </button>
                )}
              </div>
            )}
          </div>
      </>
    )
  }

  // Full mode (default — for /reports page)
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
                gap: '0.6rem',
                padding: '0.8rem 1.2rem',
                borderRadius: '0.5rem',
                border: filter.selected.length > 0
                  ? '1px solid var(--brand-border-strong)'
                  : '1px solid var(--neutral-border-medium)',
                background: filter.selected.length > 0
                  ? 'var(--brand-alpha-weak)'
                  : 'var(--surface-background)',
                cursor: 'pointer',
                fontSize: '1.4rem',
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
                  fontSize: '1.2rem',
                  fontWeight: 700,
                }}>
                  {filter.selected.length}
                </span>
              )}
              <AppIcon size="xs" strokeWidth={ICON_STROKE.emphasis} style={{ transform: openDropdown === filter.key ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>
                <polyline points="6 9 12 15 18 9" />
              </AppIcon>
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
              gap: '0.6rem',
              padding: '0.8rem 1.2rem',
              borderRadius: '0.5rem',
              border: filters.projectId
                ? '1px solid var(--brand-border-strong)'
                : '1px solid var(--neutral-border-medium)',
              background: filters.projectId
                ? 'var(--brand-alpha-weak)'
                : 'var(--surface-background)',
              cursor: 'pointer',
              fontSize: '1.4rem',
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
                fontSize: '1.2rem',
                fontWeight: 700,
              }}>
                1
              </span>
            )}
            <AppIcon size="xs" strokeWidth={ICON_STROKE.emphasis} style={{ transform: openDropdown === 'project' ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>
              <polyline points="6 9 12 15 18 9" />
            </AppIcon>
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
              padding: '0.8rem 1.2rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--neutral-border-medium)',
              background: filters.assignee === currentUserId ? 'var(--brand-alpha-weak)' : 'var(--surface-background)',
              cursor: 'pointer',
              fontSize: '1.2rem',
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
            padding: '0.8rem 1.2rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--neutral-border-medium)',
            background: filters.types.length === 1 && filters.types[0] === 'BUG' && filters.severities.length === 1 && filters.severities[0] === 'CRITICAL' ? 'var(--danger-alpha-weak)' : 'var(--surface-background)',
            cursor: 'pointer',
            fontSize: '1.2rem',
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
            padding: '0.8rem 1.2rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--neutral-border-medium)',
            background: filters.assignee === 'unassigned' ? 'var(--warning-alpha-weak)' : 'var(--surface-background)',
            cursor: 'pointer',
            fontSize: '1.2rem',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {filters.types.map(t => (
            <span key={`type-${t}`} className="text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer" style={{ background: getTagColors(t).bg, color: getTagColors(t).color }} onClick={() => onRemoveFilter('types', t)}>
              {getTypeLabel(t)}
            </span>
          ))}
          {filters.severities.map(s => (
            <span key={`sev-${s}`} className="text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer" style={{ background: getTagColors(s).bg, color: getTagColors(s).color }} onClick={() => onRemoveFilter('severities', s)}>
              {getSeverityLabel(s)}
            </span>
          ))}
          {filters.statuses.map(s => (
            <span key={`status-${s}`} className="text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer" style={{ background: getTagColors(s).bg, color: getTagColors(s).color }} onClick={() => onRemoveFilter('statuses', s)}>
              {getStatusLabel(s)}
            </span>
          ))}
          {filters.projectId && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }} onClick={() => onRemoveFilter('projectId')}>
              {`Projeto: ${projects.find(p => p.id === filters.projectId)?.name || '...'}`}
            </span>
          )}
          {filters.assignee && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }} onClick={() => onRemoveFilter('assignee')}>
              {filters.assignee === 'unassigned' ? 'Sem responsável' : 'Meus reports'}
            </span>
          )}
          <button
            onClick={onClearAll}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '0.375rem',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '1.2rem',
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
