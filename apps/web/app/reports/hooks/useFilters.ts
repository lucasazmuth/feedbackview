'use client'

import { useState, useMemo, useCallback } from 'react'

export interface FilterState {
  search: string
  projectId: string | null
  types: string[]
  severities: string[]
  statuses: string[]
  assignee: string | null // 'unassigned' | userId | null
}

interface BaseFeedback {
  id: string
  type: string
  severity?: string
  status: string
  comment: string
  pageUrl?: string
  projectId: string
  Project?: { id: string; name: string }
}

type AssigneesMap = Record<string, { userId: string; name: string | null; email: string }[]>

const INITIAL_FILTERS: FilterState = {
  search: '',
  projectId: null,
  types: [],
  severities: [],
  statuses: [],
  assignee: null,
}

export function useFilters<T extends BaseFeedback>(allFeedbacks: T[], feedbackAssigneesMap: AssigneesMap) {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS)

  const toggleArrayFilter = useCallback((field: 'types' | 'severities' | 'statuses', value: string) => {
    setFilters(prev => {
      const arr = prev[field]
      return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] }
    })
  }, [])

  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }))
  }, [])

  const setProjectId = useCallback((projectId: string | null) => {
    setFilters(prev => ({ ...prev, projectId }))
  }, [])

  const setAssignee = useCallback((assignee: string | null) => {
    setFilters(prev => ({ ...prev, assignee: prev.assignee === assignee ? null : assignee }))
  }, [])

  const removeFilter = useCallback((field: keyof FilterState, value?: string) => {
    setFilters(prev => {
      if (field === 'search') return { ...prev, search: '' }
      if (field === 'projectId') return { ...prev, projectId: null }
      if (field === 'assignee') return { ...prev, assignee: null }
      if (value && (field === 'types' || field === 'severities' || field === 'statuses')) {
        return { ...prev, [field]: (prev[field] as string[]).filter(v => v !== value) }
      }
      return prev
    })
  }, [])

  const clearAll = useCallback(() => {
    setFilters(INITIAL_FILTERS)
  }, [])

  const applyPreset = useCallback((preset: 'my-reports' | 'critical-bugs' | 'unassigned' | 'open', currentUserId?: string) => {
    if (preset === 'my-reports' && currentUserId) {
      setFilters({ ...INITIAL_FILTERS, assignee: currentUserId })
    } else if (preset === 'critical-bugs') {
      setFilters({ ...INITIAL_FILTERS, types: ['BUG'], severities: ['CRITICAL'] })
    } else if (preset === 'unassigned') {
      setFilters({ ...INITIAL_FILTERS, assignee: 'unassigned' })
    } else if (preset === 'open') {
      setFilters({ ...INITIAL_FILTERS, statuses: ['OPEN'] })
    }
  }, [])

  const filteredFeedbacks = useMemo(() => {
    return allFeedbacks.filter(f => {
      if (filters.projectId && f.projectId !== filters.projectId) return false
      if (filters.types.length > 0 && !filters.types.includes(f.type)) return false
      if (filters.severities.length > 0 && f.severity && !filters.severities.includes(f.severity)) return false
      if (filters.severities.length > 0 && !f.severity) return false
      if (filters.statuses.length > 0 && !filters.statuses.includes(f.status)) return false
      if (filters.assignee === 'unassigned') {
        const assignees = feedbackAssigneesMap[f.id] || []
        if (assignees.length > 0) return false
      } else if (filters.assignee) {
        const assignees = feedbackAssigneesMap[f.id] || []
        if (!assignees.some(a => a.userId === filters.assignee)) return false
      }
      if (filters.search.trim()) {
        const q = filters.search.trim().toLowerCase()
        if (
          !f.comment.toLowerCase().includes(q) &&
          !(f.pageUrl || '').toLowerCase().includes(q) &&
          !(f.Project?.name || '').toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [allFeedbacks, filters, feedbackAssigneesMap])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.projectId) count++
    count += filters.types.length
    count += filters.severities.length
    count += filters.statuses.length
    if (filters.assignee) count++
    return count
  }, [filters])

  return {
    filters,
    filteredFeedbacks,
    activeFilterCount,
    setSearch,
    setProjectId,
    setAssignee,
    toggleArrayFilter,
    removeFilter,
    clearAll,
    applyPreset,
  }
}
