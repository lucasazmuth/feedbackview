'use client'

import React, { useState } from 'react'
import { Tag, Button, Text, Row } from '@once-ui-system/core'

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
  onArchive: () => void
  onClearSelection: () => void
  statusLoading: boolean
}

export default function BulkToolbar({
  selectedCount,
  onChangeStatus,
  onArchive,
  onClearSelection,
  statusLoading,
}: BulkToolbarProps) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)

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
                label={statusLoading ? 'Atualizando...' : 'Status'}
                disabled={statusLoading}
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
              label="Arquivar"
              onClick={onArchive}
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
    </div>
  )
}
