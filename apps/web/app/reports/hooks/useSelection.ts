'use client'

import { useState, useCallback, useMemo } from 'react'

export function useSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      // If all are already selected, deselect all
      if (ids.every(id => prev.has(id))) return new Set()
      return new Set(ids)
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id)
  }, [selectedIds])

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds])
  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds])

  return {
    selectedIds,
    selectedCount,
    selectedArray,
    toggle,
    selectAll,
    clearSelection,
    isSelected,
  }
}
