'use client'

import { useState, useCallback, useMemo } from 'react'
import { SEVERITY_WEIGHT, STATUS_ORDER } from '../utils/labels'

export type SortField = 'manual' | 'createdAt' | 'severity' | 'status' | 'type' | 'project'
export type SortDirection = 'asc' | 'desc'

export interface SortState {
  field: SortField
  direction: SortDirection
}

interface BaseFeedback {
  id: string
  type: string
  severity?: string
  status: string
  comment: string
  createdAt: string
  projectId: string
  Project?: { id: string; name: string }
}

export function useSort<T extends BaseFeedback>(feedbacks: T[]) {
  const [sort, setSort] = useState<SortState>({ field: 'createdAt', direction: 'desc' })

  const toggleSort = useCallback((field: SortField) => {
    setSort(prev => {
      if (prev.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' as SortDirection }
      }
      return { field, direction: field === 'createdAt' ? 'desc' : 'asc' as SortDirection }
    })
  }, [])

  // Switch to manual mode (preserves array order as-is)
  const setManualSort = useCallback(() => {
    setSort({ field: 'manual', direction: 'asc' })
  }, [])

  const sortedFeedbacks = useMemo(() => {
    // Manual mode: no sorting, preserve original array order
    if (sort.field === 'manual') return feedbacks

    const sorted = [...feedbacks]
    sorted.sort((a, b) => {
      let cmp = 0
      switch (sort.field) {
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'severity':
          cmp = (SEVERITY_WEIGHT[a.severity || ''] || 0) - (SEVERITY_WEIGHT[b.severity || ''] || 0)
          break
        case 'status':
          cmp = (STATUS_ORDER[a.status] || 99) - (STATUS_ORDER[b.status] || 99)
          break
        case 'type':
          cmp = a.type.localeCompare(b.type)
          break
        case 'project':
          cmp = (a.Project?.name || '').localeCompare(b.Project?.name || '')
          break
      }
      return sort.direction === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [feedbacks, sort])

  return { sort, toggleSort, setManualSort, sortedFeedbacks }
}
