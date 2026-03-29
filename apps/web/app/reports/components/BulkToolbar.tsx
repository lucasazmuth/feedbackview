'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Tag, Button, Text, Row, Column, Heading } from '@once-ui-system/core'

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
        <Row gap="12" vertical="center" horizontal="between">
          <Text variant="body-default-s" onBackground="neutral-strong">
            {selectedCount} selecionados
          </Text>

          <Row gap="8" vertical="center">
            <div style={{ position: 'relative' }}>
              <Button
                size="s"
                variant="secondary"
                label={actionLoading ? 'Atualizando...' : 'Status'}
                disabled={actionLoading || deleteWorking}
                onClick={() => setShowStatusDropdown((v) => !v)}
              />
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
                      <Tag label={opt.label} variant="neutral" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              size="s"
              variant="danger"
              label="Excluir"
              disabled={actionLoading || deleteWorking}
              onClick={() => setDeleteConfirmOpen(true)}
            />

            <Button
              size="s"
              variant="tertiary"
              label="Limpar"
              onClick={onClearSelection}
            />
          </Row>
        </Row>
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
              <Column gap="m" fillWidth>
                <Heading id="bulk-delete-title" variant="heading-strong-m" as="h2">
                  Excluir reports?
                </Heading>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Os <strong>{selectedCount}</strong> reports selecionados serão{' '}
                  <strong>apagados permanentemente</strong>. Não há como desfazer esta ação.
                </Text>
                <Row gap="s" wrap horizontal="end">
                  <Button
                    size="s"
                    variant="tertiary"
                    label="Cancelar"
                    disabled={deleteWorking}
                    onClick={() => setDeleteConfirmOpen(false)}
                  />
                  <Button
                    size="s"
                    variant="danger"
                    label={deleteWorking ? 'Excluindo...' : 'Sim, excluir'}
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
                  />
                </Row>
              </Column>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
