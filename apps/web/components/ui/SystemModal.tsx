'use client'

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AppIcon } from '@/components/ui/AppIcon'

/** Tipografia do cabeçalho — alinhada ao modal ClickUp / IntegrationsClient. */
export const systemModalTitleStyle: CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 700,
  color: 'var(--neutral-on-background-strong)',
  margin: 0,
  lineHeight: 1.3,
}

export const systemModalDescStyle: CSSProperties = {
  fontSize: '0.8125rem',
  color: 'var(--neutral-on-background-weak)',
  margin: '0.375rem 0 0',
  lineHeight: 1.45,
}

export const systemModalLabelStyle: CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--neutral-on-background-weak)',
  marginBottom: '0.25rem',
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '1rem',
  padding: '1.25rem',
  borderBottom: '1px solid var(--neutral-border-medium)',
  flexShrink: 0,
}

const bodyStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
}

const footerBase: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  justifyContent: 'flex-end',
  alignItems: 'center',
  padding: '1rem 1.25rem 1.25rem',
  borderTop: '1px solid var(--neutral-border-medium)',
  flexShrink: 0,
  background: 'var(--surface-background)',
}

export function SystemModalHeader({ children }: { children: ReactNode }) {
  return <div style={headerStyle}>{children}</div>
}

export function SystemModalBody({ children }: { children: ReactNode }) {
  return <div style={bodyStyle}>{children}</div>
}

export function SystemModalFooter({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...footerBase, ...style }}>{children}</div>
}

function CloseGlyph() {
  return (
    <AppIcon size="md" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" />
    </AppIcon>
  )
}

export function SystemModalCloseButton({
  onClick,
  disabled,
  'aria-label': ariaLabel = 'Fechar',
}: {
  onClick: () => void
  disabled?: boolean
  'aria-label'?: string
}) {
  return (
    <button type="button" className="system-modal-close" onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      <CloseGlyph />
    </button>
  )
}

export type SystemModalProps = {
  open: boolean
  onBackdropClick: () => void
  backdropDisabled?: boolean
  'aria-labelledby'?: string
  'aria-label'?: string
  /** Igual ao ClickUp: `min(36rem, 100%)`. Use maior para formulários largos (ex.: edição de membro). */
  panelMaxWidth?: string
  children: ReactNode
}

/**
 * Modal fullscreen com backdrop — mesmo shell que `IntegrationsClient` (ClickUp):
 * `createPortal` em `document.body`, overlay rgba(0,0,0,0.45), painel surface + borda + radius token.
 */
export function SystemModal({
  open,
  onBackdropClick,
  backdropDisabled,
  'aria-labelledby': ariaLabelledBy,
  'aria-label': ariaLabel,
  panelMaxWidth = 'min(36rem, 100%)',
  children,
}: SystemModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!open || !mounted) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(0.75rem, 3vw, 1.25rem)',
        isolation: 'isolate',
      }}
    >
      <div
        role="presentation"
        aria-hidden="true"
        onClick={() => !backdropDisabled && onBackdropClick()}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          cursor: 'pointer',
          background: 'rgba(0,0,0,0.45)',
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: panelMaxWidth,
          width: '100%',
          maxHeight: 'min(92vh, 720px)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          background: 'var(--surface-background)',
          border: '1px solid var(--neutral-border-medium)',
          borderRadius: 'var(--radius-l, 12px)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}
