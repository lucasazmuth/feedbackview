'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import { ICON_STROKE } from '@/lib/icon-tokens'

interface InlineDatePickerProps {
  feedbackId: string
  dueDate: string | null
  onDueDateChange: (feedbackId: string, dueDate: string | null) => void
  label?: string
}

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date(new Date().toDateString())
}

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const todayStart = new Date(now.toDateString())
  const dateStart = new Date(date.toDateString())
  const diffMs = dateStart.getTime() - todayStart.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Amanhã'
  if (diffDays === -1) return 'Ontem'
  if (diffDays < -1) return `${Math.abs(diffDays)}d atrás`
  if (diffDays <= 7) return `${diffDays}d`

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function MiniCalendar({ selected, onSelect }: { selected: Date | null; onSelect: (date: Date) => void }) {
  const [viewDate, setViewDate] = useState(() => selected || new Date())

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const result: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) result.push(null)
    for (let i = 1; i <= daysInMonth; i++) result.push(i)
    return result
  }, [year, month])

  const today = new Date()
  const todayDate = today.getDate()
  const todayMonth = today.getMonth()
  const todayYear = today.getFullYear()

  const selectedDate = selected?.getDate()
  const selectedMonth = selected?.getMonth()
  const selectedYear = selected?.getFullYear()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={(e) => { e.stopPropagation(); setViewDate(new Date(year, month - 1, 1)) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--neutral-on-background-weak)', borderRadius: '0.25rem' }}
        >
          <AppIcon size="sm" strokeWidth={ICON_STROKE.emphasis}><polyline points="15 18 9 12 15 6" /></AppIcon>
        </button>
        <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>
          {MONTHS[month]} {year}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); setViewDate(new Date(year, month + 1, 1)) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--neutral-on-background-weak)', borderRadius: '0.25rem' }}
        >
          <AppIcon size="sm" strokeWidth={ICON_STROKE.emphasis}><polyline points="9 18 15 12 9 6" /></AppIcon>
        </button>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.125rem' }}>
        {WEEKDAYS.map(d => (
          <span key={d} style={{ fontSize: '1.2rem', fontWeight: 600, textAlign: 'center', color: 'var(--neutral-on-background-weak)', padding: '0.125rem 0', textTransform: 'uppercase' }}>
            {d}
          </span>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.125rem' }}>
        {days.map((day, i) => {
          if (!day) return <span key={`empty-${i}`} />
          const isToday = day === todayDate && month === todayMonth && year === todayYear
          const isSelected = day === selectedDate && month === selectedMonth && year === selectedYear
          return (
            <button
              key={day}
              onClick={(e) => {
                e.stopPropagation()
                const d = new Date(year, month, day, 23, 59, 59)
                onSelect(d)
              }}
              style={{
                width: 28, height: 28,
                borderRadius: '50%',
                border: isToday && !isSelected ? '1px solid var(--brand-border-strong)' : 'none',
                background: isSelected ? 'var(--brand-solid-strong)' : 'transparent',
                color: isSelected ? '#fff' : 'var(--neutral-on-background-strong)',
                cursor: 'pointer',
                fontSize: '1.2rem',
                fontWeight: isToday || isSelected ? 600 : 400,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.1s',
              }}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function InlineDatePicker({ feedbackId, dueDate, onDueDateChange, label }: InlineDatePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Calculate popover position when opened
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const popoverWidth = 240
      const popoverHeight = 360
      // Position below the button, aligned right
      let top = rect.bottom + 4
      let left = rect.right - popoverWidth
      // If it goes off screen bottom, show above
      if (top + popoverHeight > window.innerHeight) {
        top = rect.top - popoverHeight - 4
      }
      // If it goes off screen left, align left instead
      if (left < 8) left = 8
      setPopoverPos({ top, left })
    }
  }, [open])

  const overdue = !label && dueDate ? isOverdue(dueDate) : false
  const selectedDate = dueDate ? new Date(dueDate) : null

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.3rem 0.6rem',
          borderRadius: '0.375rem',
          border: dueDate
            ? overdue
              ? '1px solid var(--danger-border-medium)'
              : '1px solid var(--neutral-border-medium)'
            : '1px dashed var(--neutral-border-medium)',
          background: dueDate
            ? overdue
              ? 'var(--danger-alpha-weak)'
              : 'var(--surface-background)'
            : 'transparent',
          cursor: 'pointer',
          fontSize: '1.2rem',
          fontWeight: 500,
          color: dueDate
            ? overdue
              ? 'var(--danger-on-background-strong)'
              : 'var(--neutral-on-background-strong)'
            : 'var(--neutral-on-background-weak)',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        <AppIcon size={11} strokeWidth={ICON_STROKE.emphasis}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </AppIcon>
        {dueDate ? formatDueDate(dueDate) : (label || 'Prazo')}
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: popoverPos.top,
            left: popoverPos.left,
            background: 'var(--surface-background)',
            border: '1px solid var(--neutral-border-medium)',
            borderRadius: '0.75rem',
            boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
            zIndex: 9999,
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.625rem',
            width: 240,
          }}
        >
          {/* Header */}
          <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--neutral-on-background-weak)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {label === 'Início' ? 'Data de início' : 'Data de entrega'}
          </span>

          {/* Quick options */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Hoje', days: 0 },
              { label: 'Amanhã', days: 1 },
              { label: '+3d', days: 3 },
              { label: '+7d', days: 7 },
              { label: '+14d', days: 14 },
            ].map(opt => {
              const date = new Date()
              date.setDate(date.getDate() + opt.days)
              date.setHours(23, 59, 59)
              return (
                <button
                  key={opt.label}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDueDateChange(feedbackId, date.toISOString())
                    setOpen(false)
                  }}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--neutral-border-medium)',
                    background: 'var(--surface-background)',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    fontWeight: 500,
                    color: 'var(--neutral-on-background-strong)',
                    transition: 'background 0.1s',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          {/* Mini calendar */}
          <MiniCalendar
            selected={selectedDate}
            onSelect={(date) => {
              onDueDateChange(feedbackId, date.toISOString())
              setOpen(false)
            }}
          />

          {/* Clear */}
          {dueDate && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDueDateChange(feedbackId, null)
                setOpen(false)
              }}
              style={{
                padding: '0.375rem',
                borderRadius: '0.375rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '1.2rem',
                color: 'var(--danger-on-background-strong)',
                textAlign: 'center',
              }}
            >
              {label === 'Início' ? 'Remover data' : 'Remover prazo'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
