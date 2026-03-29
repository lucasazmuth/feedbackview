'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Tag } from '@once-ui-system/core'
import { ALL_STATUSES, getTagVariant, getStatusLabel } from '../utils/labels'

interface InlineStatusDropdownProps {
  status: string
  onStatusChange: (newStatus: string) => void
  disabled?: boolean
}

export default function InlineStatusDropdown({ status, onStatusChange, disabled }: InlineStatusDropdownProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  const updatePosition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setCoords({ top: r.bottom + 4, left: r.left })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={triggerRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <Tag
        variant={getTagVariant(status)}
        size="s"
        label={getStatusLabel(status)}
        onClick={(e) => {
          e.stopPropagation()
          if (!disabled) {
            if (!open && triggerRef.current) {
              const r = triggerRef.current.getBoundingClientRect()
              setCoords({ top: r.bottom + 4, left: r.left })
            }
            setOpen(!open)
          }
        }}
        style={{ cursor: disabled ? 'wait' : 'pointer' }}
      />
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              minWidth: 160,
              background: 'var(--surface-background)',
              border: '1px solid var(--neutral-border-medium)',
              borderRadius: '0.75rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 100000,
              padding: '0.375rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.125rem',
            }}
          >
            {ALL_STATUSES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onStatusChange(opt.value)
                  setOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.625rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: status === opt.value ? 'var(--neutral-alpha-weak)' : 'transparent',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
              >
                <Tag variant={getTagVariant(opt.value)} size="s" label={opt.label} />
                {status === opt.value && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--brand-solid-strong)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginLeft: 'auto' }}
                    aria-hidden
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}
