'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  Column,
  Text,
  Tag,
  Icon,
  Flex,
  Button,
  Textarea,
  Spinner,
  Feedback as FeedbackAlert,
} from '@once-ui-system/core'
import { getTagVariant, getTypeLabel, getStatusLabel, getSeverityLabel, parseUserAgent, ALL_STATUSES } from '../utils/labels'
import { api } from '@/lib/api'

const SessionReplay = dynamic(() => import('@/components/viewer/SessionReplay'), { ssr: false })

interface FeedbackDetail {
  id: string; type: string; severity?: string; status: string; comment: string; title?: string
  screenshotUrl?: string; pageUrl?: string; userAgent?: string; createdAt: string; projectId: string
  startDate?: string | null; dueDate?: string | null
  consoleLogs?: { level: string; message: string; timestamp?: number }[]
  networkLogs?: { method: string; url: string; status?: number; duration?: number }[]
  metadata?: { rrwebEvents?: any[]; stepsToReproduce?: string; expectedResult?: string; actualResult?: string; source?: string; viewport?: string } | null
  Project?: { name: string } | null
}

interface TeamMember { id: string; name: string | null; email: string }
interface Assignee { userId: string; name: string | null; email: string }

interface Props {
  isOpen: boolean
  onClose: () => void
  feedbackId: string | null
  teamMembers?: TeamMember[]
  assignees?: Assignee[]
  onAssign?: (feedbackId: string, userIds: string[]) => void
  onUnassign?: (feedbackId: string, userId: string) => void
  onStartDateChange?: (feedbackId: string, date: string | null) => void
  onDueDateChange?: (feedbackId: string, date: string | null) => void
}

// Sidebar field row
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.625rem 0' }}>
      <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--neutral-on-background-weak)', width: 72, flexShrink: 0, paddingTop: 2 }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

// Mini assign dropdown for sidebar
function AssignDropdown({ feedbackId, teamMembers, assignedIds, onAssign }: { feedbackId: string; teamMembers: TeamMember[]; assignedIds: string[]; onAssign: (fid: string, uids: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const available = teamMembers.filter(m => !assignedIds.includes(m.id))

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button onClick={() => setOpen(!open)} style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px dashed var(--neutral-border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'transparent', color: 'var(--neutral-on-background-weak)', fontSize: 10, padding: 0 }}>+</button>
      {open && available.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, minWidth: 180, maxHeight: 200, overflowY: 'auto', background: 'var(--surface-background)', border: '1px solid var(--neutral-border-medium)', borderRadius: '0.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 300, padding: '0.25rem' }}>
          {available.map(m => (
            <button key={m.id} onClick={() => { onAssign(feedbackId, [m.id]); setOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.5rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '0.6875rem', color: 'var(--neutral-on-background-strong)', transition: 'background 0.1s' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, flexShrink: 0 }}>{(m.name || m.email).charAt(0).toUpperCase()}</div>
              {m.name || m.email.split('@')[0]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Compact date chip for sidebar
function DateChip({ value, placeholder, onChange, isDue }: { value?: string | null; placeholder: string; onChange?: (d: string | null) => void; isDue?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const isOverdue = isDue && value && new Date(value) < new Date()
  const display = value ? new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : null

  const setDate = (d: string | null) => { onChange?.(d); setOpen(false) }
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const in3d = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  const in7d = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: '0.1875rem', padding: '0.125rem 0.375rem', borderRadius: '0.25rem',
        border: display ? (isOverdue ? '1px solid var(--danger-border-medium)' : '1px solid var(--neutral-border-medium)') : '1px dashed var(--neutral-border-medium)',
        background: isOverdue ? 'var(--danger-alpha-weak)' : 'transparent',
        cursor: onChange ? 'pointer' : 'default', fontSize: '0.625rem', fontWeight: 500,
        color: isOverdue ? 'var(--danger-on-background-strong)' : display ? 'var(--neutral-on-background-strong)' : 'var(--neutral-on-background-weak)',
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
        {display || placeholder}
      </button>
      {open && onChange && (
        <div style={{ position: 'fixed', zIndex: 9999, background: 'var(--surface-background)', border: '1px solid var(--neutral-border-medium)', borderRadius: '0.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 140 }}>
          {[{ l: 'Hoje', v: today }, { l: 'Amanhã', v: tomorrow }, { l: '+3d', v: in3d }, { l: '+7d', v: in7d }].map(o => (
            <button key={o.l} onClick={() => setDate(o.v)} style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.625rem', textAlign: 'left', color: 'var(--neutral-on-background-strong)' }}>{o.l}</button>
          ))}
          <div style={{ height: 1, background: 'var(--neutral-border-medium)', margin: '0.125rem 0' }} />
          <input type="date" value={value || ''} onChange={e => setDate(e.target.value || null)} style={{ fontSize: '0.625rem', padding: '0.25rem', border: '1px solid var(--neutral-border-medium)', borderRadius: '0.25rem', background: 'var(--surface-background)', color: 'var(--neutral-on-background-strong)' }} />
          {value && <button onClick={() => setDate(null)} style={{ padding: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.5625rem', color: 'var(--danger-on-background-strong)' }}>Limpar</button>}
        </div>
      )}
    </div>
  )
}

export default function FeedbackDetailModal({ isOpen, onClose, feedbackId, teamMembers = [], assignees = [], onAssign, onUnassign, onStartDateChange, onDueDateChange }: Props) {
  const [fb, setFb] = useState<FeedbackDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [mediaTab, setMediaTab] = useState<'replay' | 'screenshot'>('replay')
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [networkOpen, setNetworkOpen] = useState(false)

  useEffect(() => {
    if (!isOpen || !feedbackId) { setFb(null); setMediaTab('replay'); return }
    let c = false
    setLoading(true); setFb(null); setEditing(false); setConsoleOpen(false); setNetworkOpen(false)
    ;(async () => {
      try { const r = await fetch(`/api/feedbacks/${feedbackId}`); if (r.ok && !c) setFb(await r.json()) } catch {}
      if (!c) setLoading(false)
    })()
    return () => { c = true }
  }, [isOpen, feedbackId])

  const handleStatus = useCallback(async (s: string) => {
    if (!fb) return; setStatusSaving(true)
    try { await api.feedbacks.updateStatus(fb.id, s); setFb(p => p ? { ...p, status: s } : null) } catch {}
    setStatusSaving(false)
  }, [fb])

  const handleSave = useCallback(async () => {
    if (!fb) return; setSaving(true)
    try { await api.feedbacks.updateComment(fb.id, draft); setFb(p => p ? { ...p, comment: draft } : null); setEditing(false) } catch {}
    setSaving(false)
  }, [fb, draft])

  if (!isOpen) return null

  const logs = fb?.consoleLogs || []
  const nets = fb?.networkLogs || []
  const errs = logs.filter(l => l.level === 'error').length
  const fails = nets.filter(l => l.status && l.status >= 400).length
  const hasReplay = fb?.metadata?.rrwebEvents?.length && fb.metadata?.source === 'embed'
  const ua = fb?.userAgent ? parseUserAgent(fb.userAgent) : null

  const sc = (s: string) => s === 'RESOLVED' ? 'var(--success-solid-strong)' : s === 'CANCELLED' ? 'var(--danger-solid-strong)' : s === 'IN_PROGRESS' ? 'var(--info-solid-strong)' : s === 'UNDER_REVIEW' ? 'var(--brand-solid-strong)' : 'var(--warning-solid-strong)'

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '3vh', overflowY: 'auto', backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '64rem', maxHeight: '92vh', background: 'var(--page-background)', borderRadius: '1rem', boxShadow: '0 24px 48px rgba(0,0,0,0.15)', margin: '0 1rem 2rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {loading ? (
          <Flex fillWidth style={{ minHeight: '24rem' }} horizontal="center" vertical="center">
            <Column horizontal="center" gap="m"><Spinner size="m" /><Text variant="body-default-s" onBackground="neutral-weak">Carregando...</Text></Column>
          </Flex>
        ) : fb ? (
          <>
            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--neutral-border-medium)', flexShrink: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: sc(fb.status), flexShrink: 0 }} />
              <Tag variant={getTagVariant(fb.type)} size="s" label={getTypeLabel(fb.type)} />
              {fb.severity && <Tag variant={getTagVariant(fb.severity)} size="s" label={getSeverityLabel(fb.severity)} />}
              <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, color: 'var(--neutral-on-background-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fb.title || fb.comment?.slice(0, 80) || 'Report'}
              </span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--neutral-on-background-weak)', flexShrink: 0 }}>{fmtDate(fb.createdAt)}</span>
              <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '0.375rem', border: 'none', background: 'transparent', color: 'var(--neutral-on-background-weak)', cursor: 'pointer', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            {/* ── Body ── */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

              {/* Main content */}
              <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>

                {/* Media section */}
                {(hasReplay || fb.screenshotUrl) && (
                  <div style={{ background: '#f4f5f7', borderBottom: '1px solid var(--neutral-border-medium)' }}>
                    {/* Media tabs */}
                    {hasReplay && fb.screenshotUrl && (
                      <div style={{ display: 'flex', gap: 0, padding: '0 1rem', borderBottom: '1px solid var(--neutral-border-medium)', background: 'var(--surface-background)' }}>
                        <button onClick={() => setMediaTab('replay')} style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 500, border: 'none', cursor: 'pointer', borderBottom: mediaTab === 'replay' ? '2px solid var(--neutral-on-background-strong)' : '2px solid transparent', color: mediaTab === 'replay' ? 'var(--neutral-on-background-strong)' : 'var(--neutral-on-background-weak)', background: 'transparent', marginBottom: -1, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg> Replay
                        </button>
                        <button onClick={() => setMediaTab('screenshot')} style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 500, border: 'none', cursor: 'pointer', borderBottom: mediaTab === 'screenshot' ? '2px solid var(--neutral-on-background-strong)' : '2px solid transparent', color: mediaTab === 'screenshot' ? 'var(--neutral-on-background-strong)' : 'var(--neutral-on-background-weak)', background: 'transparent', marginBottom: -1, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg> Screenshot
                        </button>
                      </div>
                    )}
                    <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}>
                      {mediaTab === 'replay' && hasReplay ? (
                        <div style={{ width: '100%', maxWidth: '100%', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                          <SessionReplay events={fb.metadata!.rrwebEvents!} />
                        </div>
                      ) : fb.screenshotUrl ? (
                        <img src={fb.screenshotUrl} alt="Screenshot" style={{ maxWidth: '100%', maxHeight: 400, borderRadius: '0.5rem', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', objectFit: 'contain' }} />
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>Descrição</span>
                    {!editing && (
                      <button onClick={() => { setDraft(fb.comment); setEditing(true) }} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.6875rem', fontWeight: 500, color: 'var(--brand-on-background-strong)' }}>Editar</button>
                    )}
                  </div>
                  {editing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <Textarea id="edit-desc" label="" value={draft} lines={4} resize="vertical" onChange={e => setDraft(e.target.value)} disabled={saving} />
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Button variant="secondary" size="s" label="Cancelar" onClick={() => setEditing(false)} disabled={saving} />
                        <Button variant="primary" size="s" label="Salvar" onClick={handleSave} loading={saving} />
                      </div>
                    </div>
                  ) : (
                    <Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{fb.comment}</Text>
                  )}

                  {/* Bug details */}
                  {(fb.metadata?.stepsToReproduce || fb.metadata?.expectedResult || fb.metadata?.actualResult) && (
                    <div style={{ marginTop: '1.25rem', padding: '1rem', borderRadius: '0.5rem', background: 'var(--neutral-alpha-weak)', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                      {fb.metadata?.stepsToReproduce && (
                        <div><span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--neutral-on-background-weak)', display: 'block', marginBottom: '0.25rem' }}>Passos para reproduzir</span><Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{fb.metadata.stepsToReproduce}</Text></div>
                      )}
                      {fb.metadata?.expectedResult && (
                        <div><span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--neutral-on-background-weak)', display: 'block', marginBottom: '0.25rem' }}>Esperado</span><Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{fb.metadata.expectedResult}</Text></div>
                      )}
                      {fb.metadata?.actualResult && (
                        <div><span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--neutral-on-background-weak)', display: 'block', marginBottom: '0.25rem' }}>Resultado real</span><Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{fb.metadata.actualResult}</Text></div>
                      )}
                    </div>
                  )}

                  {/* Console logs (accordion) */}
                  {logs.length > 0 && (
                    <div style={{ marginTop: '1.25rem', borderRadius: '0.5rem', border: '1px solid var(--neutral-border-medium)', overflow: 'hidden' }}>
                      <button onClick={() => setConsoleOpen(!consoleOpen)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0.625rem 0.75rem', border: 'none', background: 'var(--surface-background)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>Console Logs <span style={{ fontSize: '0.625rem', fontWeight: 600, padding: '0.0625rem 0.375rem', borderRadius: '2rem', background: errs > 0 ? 'var(--danger-alpha-weak)' : 'var(--neutral-alpha-medium)', color: errs > 0 ? 'var(--danger-on-background-strong)' : 'var(--neutral-on-background-weak)' }}>{logs.length}</span></span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: consoleOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9" /></svg>
                      </button>
                      {consoleOpen && (
                        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                          {logs.map((l, i) => {
                            const lv = l.level?.toUpperCase() ?? 'LOG'
                            const isErr = lv === 'ERROR'; const isW = lv === 'WARN' || lv === 'WARNING'
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem 0.75rem', borderTop: '1px solid var(--neutral-border-medium)', background: isErr ? 'var(--danger-alpha-weak)' : isW ? 'var(--warning-alpha-weak)' : 'transparent' }}>
                                <span style={{ flexShrink: 0, padding: '0.0625rem 0.375rem', borderRadius: '0.25rem', fontSize: '0.5625rem', fontWeight: 700, fontFamily: 'ui-monospace,monospace', background: isErr ? 'var(--danger-solid-strong)' : isW ? 'var(--warning-solid-strong)' : 'var(--info-solid-strong)', color: '#fff' }}>{lv}</span>
                                <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: '0.6875rem', color: 'var(--neutral-on-background-strong)', wordBreak: 'break-word', flex: 1, lineHeight: 1.4 }}>{l.message}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Network logs (accordion) */}
                  {nets.length > 0 && (
                    <div style={{ marginTop: '0.625rem', borderRadius: '0.5rem', border: '1px solid var(--neutral-border-medium)', overflow: 'hidden' }}>
                      <button onClick={() => setNetworkOpen(!networkOpen)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0.625rem 0.75rem', border: 'none', background: 'var(--surface-background)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>Network <span style={{ fontSize: '0.625rem', fontWeight: 600, padding: '0.0625rem 0.375rem', borderRadius: '2rem', background: fails > 0 ? 'var(--danger-alpha-weak)' : 'var(--neutral-alpha-medium)', color: fails > 0 ? 'var(--danger-on-background-strong)' : 'var(--neutral-on-background-weak)' }}>{nets.length}</span></span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: networkOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9" /></svg>
                      </button>
                      {networkOpen && (
                        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                          {nets.map((l, i) => {
                            const f = l.status && l.status >= 400
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderTop: '1px solid var(--neutral-border-medium)', background: f ? 'var(--danger-alpha-weak)' : 'transparent' }}>
                                <span style={{ flexShrink: 0, padding: '0.0625rem 0.375rem', borderRadius: '0.25rem', fontSize: '0.5625rem', fontWeight: 700, fontFamily: 'ui-monospace,monospace', background: f ? 'var(--danger-solid-strong)' : 'var(--success-solid-strong)', color: '#fff' }}>{l.status ?? '—'}</span>
                                <span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 600, fontSize: '0.625rem', flexShrink: 0 }}>{l.method}</span>
                                <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: '0.625rem', color: 'var(--neutral-on-background-weak)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={l.url}>{l.url}</span>
                                {l.duration != null && <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: '0.625rem', color: 'var(--neutral-on-background-weak)', flexShrink: 0 }}>{l.duration}ms</span>}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Sidebar ── */}
              <div style={{ width: 320, flexShrink: 0, borderLeft: '1px solid var(--neutral-border-medium)', overflowY: 'auto', padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column' }}>

                <Field label="Status">
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {ALL_STATUSES.map(o => {
                      const a = fb.status === o.value
                      return (
                        <button key={o.value} onClick={() => handleStatus(o.value)} disabled={statusSaving} style={{
                          padding: '0.1875rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.625rem', fontWeight: a ? 600 : 400,
                          cursor: statusSaving ? 'wait' : 'pointer',
                          border: a ? `1.5px solid ${sc(o.value)}` : '1px solid var(--neutral-border-medium)',
                          background: a ? `color-mix(in srgb, ${sc(o.value)} 12%, transparent)` : 'transparent',
                          color: a ? 'var(--neutral-on-background-strong)' : 'var(--neutral-on-background-weak)',
                          transition: 'all 0.1s',
                        }}>{o.label}</button>
                      )
                    })}
                  </div>
                </Field>

                <div style={{ height: 1, background: 'var(--neutral-border-medium)', margin: '0.25rem 0' }} />

                {/* Responsável (editable) */}
                <Field label="Resp.">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {assignees.length > 0 ? assignees.map(a => (
                      <div key={a.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', background: 'var(--brand-alpha-weak)', fontSize: '0.625rem', fontWeight: 500, color: 'var(--neutral-on-background-strong)' }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--brand-solid-strong)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700 }}>
                          {(a.name || a.email).charAt(0).toUpperCase()}
                        </div>
                        {a.name || a.email.split('@')[0]}
                        {onUnassign && (
                          <button onClick={() => onUnassign(fb.id, a.userId)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'var(--neutral-on-background-weak)', display: 'flex', fontSize: 10 }}>×</button>
                        )}
                      </div>
                    )) : (
                      <span style={{ fontSize: '0.625rem', color: 'var(--neutral-on-background-weak)', fontStyle: 'italic' }}>Não atribuído</span>
                    )}
                    {onAssign && teamMembers.length > 0 && (
                      <AssignDropdown feedbackId={fb.id} teamMembers={teamMembers} assignedIds={assignees.map(a => a.userId)} onAssign={onAssign} />
                    )}
                  </div>
                </Field>

                {/* Prazo (editable) */}
                <Field label="Prazo">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem' }}>
                    <DateChip
                      value={fb.startDate}
                      placeholder="Início"
                      onChange={(d) => onStartDateChange?.(fb.id, d)}
                    />
                    <span style={{ color: 'var(--neutral-on-background-weak)' }}>→</span>
                    <DateChip
                      value={fb.dueDate}
                      placeholder="Entrega"
                      onChange={(d) => onDueDateChange?.(fb.id, d)}
                      isDue
                    />
                  </div>
                </Field>

                <div style={{ height: 1, background: 'var(--neutral-border-medium)', margin: '0.25rem 0' }} />

                {fb.Project?.name && (
                  <Field label="Projeto">
                    <span style={{ fontSize: '0.75rem', color: 'var(--neutral-on-background-strong)' }}>{fb.Project.name}</span>
                  </Field>
                )}

                <Field label="Tipo">
                  <Tag variant={getTagVariant(fb.type)} size="s" label={getTypeLabel(fb.type)} />
                </Field>

                {fb.severity && (
                  <Field label="Prioridade">
                    <Tag variant={getTagVariant(fb.severity)} size="s" label={getSeverityLabel(fb.severity)} />
                  </Field>
                )}

                <div style={{ height: 1, background: 'var(--neutral-border-medium)', margin: '0.25rem 0' }} />

                {ua && (
                  <Field label="Navegador">
                    <span style={{ fontSize: '0.6875rem', color: 'var(--neutral-on-background-strong)' }}>{ua.browser}</span>
                  </Field>
                )}
                {ua && (
                  <Field label="OS">
                    <span style={{ fontSize: '0.6875rem', color: 'var(--neutral-on-background-strong)' }}>{ua.os}</span>
                  </Field>
                )}
                {fb.metadata?.viewport && (
                  <Field label="Viewport">
                    <span style={{ fontSize: '0.6875rem', color: 'var(--neutral-on-background-strong)' }}>{fb.metadata.viewport}</span>
                  </Field>
                )}
                {fb.metadata?.source && (
                  <Field label="Origem">
                    <span style={{ fontSize: '0.6875rem', color: 'var(--neutral-on-background-strong)' }}>{fb.metadata.source === 'shared-url' ? 'URL compartilhada' : 'Widget embed'}</span>
                  </Field>
                )}

                {fb.pageUrl && (
                  <>
                    <div style={{ height: 1, background: 'var(--neutral-border-medium)', margin: '0.25rem 0' }} />
                    <Field label="Página">
                      <a href={fb.pageUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.6875rem', color: 'var(--brand-on-background-strong)', wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        Abrir <Icon name="openLink" size="xs" />
                      </a>
                    </Field>
                  </>
                )}

                {/* Summary stats */}
                <div style={{ height: 1, background: 'var(--neutral-border-medium)', margin: '0.25rem 0' }} />
                <Field label="Console">
                  <span style={{ fontSize: '0.6875rem', color: errs > 0 ? 'var(--danger-on-background-strong)' : 'var(--neutral-on-background-weak)' }}>
                    {logs.length} logs{errs > 0 && ` (${errs} erros)`}
                  </span>
                </Field>
                <Field label="Network">
                  <span style={{ fontSize: '0.6875rem', color: fails > 0 ? 'var(--danger-on-background-strong)' : 'var(--neutral-on-background-weak)' }}>
                    {nets.length} req.{fails > 0 && ` (${fails} falhas)`}
                  </span>
                </Field>
              </div>
            </div>
          </>
        ) : (
          <Flex fillWidth style={{ minHeight: '20rem' }} horizontal="center" vertical="center">
            <FeedbackAlert variant="danger">Não foi possível carregar o report.</FeedbackAlert>
          </Flex>
        )}
      </div>
    </div>
  )
}
