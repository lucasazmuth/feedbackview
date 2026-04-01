'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { getTagColors } from '../utils/labels'

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Aberto' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'UNDER_REVIEW', label: 'Sob revisão' },
  { value: 'RESOLVED', label: 'Concluída' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

interface BulkToolbarProps {
  selectedCount: number
  onChangeStatus: (status: string) => void
  onDelete: () => void | Promise<void>
  onClearSelection: () => void
  actionLoading: boolean
}

export default function BulkToolbar({
  selectedCount,
  onChangeStatus,
  onDelete,
  onClearSelection,
  actionLoading,
}: BulkToolbarProps) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteWorking, setDeleteWorking] = useState(false)

  useEffect(() => {
    if (!deleteConfirmOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleteWorking) setDeleteConfirmOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deleteConfirmOpen, deleteWorking])

  if (selectedCount === 0) return null

  return (
    <div
      style={{
        position: 'sticky',
        bottom: '1rem',
        zIndex: 100,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: 600,
          width: '100%',
          background: 'var(--surface-background)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-l)',
          boxShadow: 'var(--shadow-l)',
          padding: '0.75rem 1rem',
          pointerEvents: 'auto',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-off-white">
            {selectedCount} selecionados
          </span>

          <div className="flex items-center gap-2">
            <div style={{ position: 'relative' }}>
              <Button
                size="small"
                variant="secondary"
                disabled={actionLoading || deleteWorking}
                onClick={() => setShowStatusDropdown((v) => !v)}
              >
                {actionLoading ? 'Atualizando...' : 'Status'}
              </Button>
              {showStatusDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    marginBottom: 4,
                    background: 'var(--surface-background)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-m)',
                    boxShadow: 'var(--shadow-m)',
                    padding: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    minWidth: 160,
                    zIndex: 101,
                  }}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <div
                      key={opt.value}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        onChangeStatus(opt.value)
                        setShowStatusDropdown(false)
                      }}
                    >
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>{opt.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              size="small"
              variant="danger"
              disabled={actionLoading || deleteWorking}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              Excluir
            </Button>

            <Button
              size="small"
              variant="ghost"
              onClick={onClearSelection}
            >
              Limpar
            </Button>
          </div>
        </div>
      </div>

      {deleteConfirmOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-delete-title"
            onClick={() => !deleteWorking && setDeleteConfirmOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              minHeight: '100vh',
              margin: 0,
              boxSizing: 'border-box',
              zIndex: 100000,
              background: 'rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              isolation: 'isolate',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '22rem',
                flexShrink: 0,
                backgroundColor: 'var(--surface-background)',
                color: 'var(--neutral-on-background-strong)',
                borderRadius: '0.75rem',
                border: '1px solid var(--neutral-border-medium)',
                padding: '1.25rem',
                boxShadow: '0 16px 48px rgba(0, 0, 0, 0.22)',
              }}
            >
              <div className="flex flex-col gap-4 w-full">
                <h2 id="bulk-delete-title" className="text-lg font-bold text-off-white">
                  Excluir reports?
                </h2>
                <p className="text-sm text-gray">
                  Os <strong>{selectedCount}</strong> reports selecionados serão{' '}
                  <strong>apagados permanentemente</strong>. Não há como desfazer esta ação.
                </p>
                <div className="flex gap-2 flex-wrap justify-end">
                  <Button
                    size="small"
                    variant="ghost"
                    disabled={deleteWorking}
                    onClick={() => setDeleteConfirmOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="small"
                    variant="danger"
                    disabled={deleteWorking}
                    onClick={async () => {
                      setDeleteWorking(true)
                      try {
                        await Promise.resolve(onDelete())
                        setDeleteConfirmOpen(false)
                      } finally {
                        setDeleteWorking(false)
                      }
                    }}
                  >
                    {deleteWorking ? 'Excluindo...' : 'Sim, excluir'}
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
