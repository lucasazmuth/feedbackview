'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { api } from '@/lib/api'
import AppLayout from '@/components/ui/AppLayout'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { AppIcon } from '@/components/ui/AppIcon'
import { ICON_STROKE } from '@/lib/icon-tokens'

const SessionReplay = dynamic(() => import('@/components/viewer/SessionReplay'), { ssr: false })

interface NetworkLog {
  method: string
  url: string
  status?: number
  duration?: number
}

interface ConsoleLog {
  level: string
  message: string
  timestamp?: number
}

interface Feedback {
  id: string
  type: string
  severity?: string
  status: string
  comment: string
  screenshotUrl?: string
  replayUrl?: string
  pageUrl?: string
  userAgent?: string
  createdAt: string
  projectId: string
  consoleLogs?: ConsoleLog[]
  networkLogs?: NetworkLog[]
  metadata?: {
    rrwebEvents?: any[]; stepsToReproduce?: string; expectedResult?: string; actualResult?: string; source?: string; viewport?: string;
    clickBreadcrumbs?: { ts: number; tag: string; text: string; sel: string; x: number; y: number }[];
    rageClicks?: { ts: number; count: number; sel: string; tag: string; text: string }[];
    deadClicks?: { ts: number; sel: string; tag: string; text: string }[];
    performance?: { lcp?: number; cls?: number; inp?: number; pageLoadMs?: number; memoryMB?: number };
    connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
    display?: { screenW: number; screenH: number; dpr: number; colorDepth: number; touch: boolean };
    geo?: { tz: string; lang: string; langs?: string[] };
  } | null
  Project?: { ownerId: string; name: string } | null
}

interface Assignee {
  id: string
  userId: string
  name: string | null
  email: string
  assignedAt: string
}

interface OrgMember {
  id: string
  name: string | null
  email: string
  role: string
}

interface FeedbackClientProps {
  feedback: Feedback | null
  error: string | null
  initialAssignees?: Assignee[]
  orgMembers?: OrgMember[]
  canAssign?: boolean
}

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Aberto' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'UNDER_REVIEW', label: 'Sob revisão' },
  { value: 'RESOLVED', label: 'Concluída' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

function getTypeLabel(type: string) {
  const map: Record<string, string> = { BUG: 'Bug', SUGGESTION: 'Sugestão', QUESTION: 'Dúvida', PRAISE: 'Elogio' }
  return map[type] || type
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = { OPEN: 'Aberto', IN_PROGRESS: 'Em andamento', UNDER_REVIEW: 'Sob revisão', RESOLVED: 'Concluída', CANCELLED: 'Cancelado' }
  return map[status] || status
}

function getSeverityLabel(sev: string) {
  const map: Record<string, string> = { CRITICAL: 'Crítico', HIGH: 'Alto', MEDIUM: 'Médio', LOW: 'Baixo' }
  return map[sev] || sev
}

function getTypeTagVariant(type: string): 'brand' | 'danger' | 'info' | 'neutral' {
  switch (type) {
    case 'BUG': return 'danger'
    case 'SUGGESTION': return 'info'
    default: return 'neutral'
  }
}

function getSeverityTagVariant(severity: string): 'danger' | 'warning' | 'neutral' {
  switch (severity) {
    case 'CRITICAL':
    case 'HIGH': return 'danger'
    case 'MEDIUM': return 'warning'
    default: return 'neutral'
  }
}

function getStatusTagVariant(status: string): 'brand' | 'warning' | 'info' | 'success' | 'danger' | 'neutral' {
  switch (status) {
    case 'OPEN': return 'warning'
    case 'IN_PROGRESS': return 'info'
    case 'UNDER_REVIEW': return 'brand'
    case 'RESOLVED': return 'success'
    case 'CANCELLED': return 'danger'
    default: return 'neutral'
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function parseUserAgent(ua: string): { os: string; browser: string } {
  let os = 'Desconhecido'
  let browser = 'Desconhecido'
  if (ua.includes('Mac OS X')) { const v = ua.match(/Mac OS X ([\d_.]+)/); os = 'macOS ' + (v ? v[1].replace(/_/g, '.') : '') }
  else if (ua.includes('Windows NT')) { const v = ua.match(/Windows NT ([\d.]+)/); const map: Record<string, string> = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' }; os = 'Windows ' + (v ? (map[v[1]] || v[1]) : '') }
  else if (ua.includes('Android')) { const v = ua.match(/Android ([\d.]+)/); os = 'Android ' + (v ? v[1] : '') }
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('iPhone') || ua.includes('iPad')) { const v = ua.match(/OS ([\d_]+)/); os = 'iOS ' + (v ? v[1].replace(/_/g, '.') : '') }
  if (ua.includes('Edg/')) { const v = ua.match(/Edg\/([\d.]+)/); browser = 'Edge ' + (v ? v[1] : '') }
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) { const v = ua.match(/Chrome\/([\d.]+)/); browser = 'Chrome ' + (v ? v[1] : '') }
  else if (ua.includes('Firefox/')) { const v = ua.match(/Firefox\/([\d.]+)/); browser = 'Firefox ' + (v ? v[1] : '') }
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) { const v = ua.match(/Version\/([\d.]+)/); browser = 'Safari ' + (v ? v[1] : '') }
  return { os, browser }
}

export default function FeedbackClient({
  feedback,
  error,
  initialAssignees = [],
  orgMembers = [],
  canAssign = false,
}: FeedbackClientProps) {
  const [status, setStatus] = useState(feedback?.status ?? 'OPEN')
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  const [comment, setComment] = useState(feedback?.comment ?? '')
  const [editingComment, setEditingComment] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [commentSaving, setCommentSaving] = useState(false)
  const [networkLogsOpen, setNetworkLogsOpen] = useState(false)
  const [consoleLogsOpen, setConsoleLogsOpen] = useState(false)

  // Assignee state
  const [assignees, setAssignees] = useState<Assignee[]>(initialAssignees)
  const [showAssignDropdown, setShowAssignDropdown] = useState(false)
  const [assignSaving, setAssignSaving] = useState(false)

  if (error || !feedback) {
    return (
      <AppLayout>
        <div className="app-page app-page--narrow">
          <div>
            <Alert>{error || 'Report não encontrado.'}</Alert>
            <Link href="/dashboard">
              <button style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'transparent', color: 'var(--neutral-on-background-weak)', fontSize: '1.4rem', fontWeight: 600, cursor: 'pointer' }}>Voltar ao dashboard</button>
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  async function handleAssign(userId: string) {
    setAssignSaving(true)
    try {
      await api.feedbacks.assign(feedback!.id, [userId])
      const member = orgMembers.find(m => m.id === userId)
      if (member) {
        setAssignees(prev => [...prev, { id: '', userId: member.id, name: member.name, email: member.email, assignedAt: new Date().toISOString() }])
      }
      setShowAssignDropdown(false)
    } catch { /* ignore */ }
    setAssignSaving(false)
  }

  async function handleUnassign(userId: string) {
    setAssignSaving(true)
    try {
      await api.feedbacks.unassign(feedback!.id, userId)
      setAssignees(prev => prev.filter(a => a.userId !== userId))
    } catch { /* ignore */ }
    setAssignSaving(false)
  }

  async function handleStatusChange(newStatus: string) {
    setStatusError(null)
    setStatusSaving(true)
    try {
      await api.feedbacks.updateStatus(feedback!.id, newStatus)
      setStatus(newStatus)
    } catch {
      setStatusError('Erro ao atualizar status.')
    } finally {
      setStatusSaving(false)
    }
  }

  async function handleCommentSave() {
    setCommentSaving(true)
    try {
      await api.feedbacks.updateComment(feedback!.id, commentDraft)
      setComment(commentDraft)
      setEditingComment(false)
    } catch {
      // keep editing open on error
    } finally {
      setCommentSaving(false)
    }
  }

  const consoleLogs = feedback.consoleLogs ?? []
  const networkLogs = feedback.networkLogs ?? []

  return (
    <AppLayout>
      <div className="app-page app-page--narrow">
      {/* Header */}
      <div
        style={{ position: 'sticky', top: 0, zIndex: 10 }}
      >
        <Link
          href={`/projects/${feedback.projectId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            color: 'var(--neutral-on-background-weak)',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><path d="m15 18-6-6 6-6"/></AppIcon>
          {feedback.Project?.name || 'Projeto'}
        </Link>
        <span style={{ flexShrink: 0 }}>/</span>
        <span style={{ display: "inline-flex", alignItems: "center", padding: "0.125rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "var(--neutral-alpha-weak)", color: "var(--neutral-on-background-weak)" }}></span>
        <span
          style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '20rem', flexShrink: 0 }}
        >
          {comment || 'Sem descrição'}
        </span>
      </div>
      <div>

      <style>{`#status-select { padding-top: 8px !important; padding-bottom: 8px !important; }`}</style>
      <div>
        <div
          style={{ alignItems: 'flex-start' }}
        >
          {/* Left column */}
          <div style={{ flex: 2, minWidth: 0 }}>
            {/* Warning for non-embed reports that have rrweb events */}
            {feedback.metadata?.rrwebEvents && feedback.metadata.rrwebEvents.length > 0 && feedback.metadata?.source !== 'embed' && (
              <div style={{ background: 'var(--warning-alpha-weak)', border: '1px solid var(--warning-border-medium)' }}>
                <div>
                  <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></AppIcon>
                  <div>
                    <span>Report via URL compartilhada</span>
                    <span>O Session Replay não está disponível para reports enviados via URL compartilhada. Utilize o screenshot como referência visual.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Session Replay (only for embed source — replay is unreliable in proxy mode) */}
            {feedback.metadata?.rrwebEvents && feedback.metadata.rrwebEvents.length > 0 && feedback.metadata?.source === 'embed' && (
              <div style={{ overflow: 'hidden', padding: 0 }}>
                <SessionReplay events={feedback.metadata.rrwebEvents} />
              </div>
            )}

            {/* Screenshot */}
            {feedback.screenshotUrl && (
              <div>
                <div>
                  <h2>Screenshot</h2>
                  <img
                    src={feedback.screenshotUrl}
                    alt="Screenshot"
                    style={{ width: '100%', borderRadius: '0.5rem', border: '1px solid var(--neutral-border-medium)' }}
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <div>
                <div>
                  <h2>Descrição</h2>
                  {!editingComment && (
                    <button onClick={() => { setCommentDraft(comment); setEditingComment(true) }} title="Editar" style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0.25rem', color: 'var(--neutral-on-background-weak)', display: 'inline-flex', alignItems: 'center' }}><AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></AppIcon></button>
                  )}
                </div>
                {editingComment ? (
                  <div>
                    <textarea
                      id="comment-edit"
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      disabled={commentSaving}
                    />
                    <div>
                      <button onClick={() => setEditingComment(false)} disabled={commentSaving} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--neutral-border-medium)', background: 'var(--surface-background)', color: 'var(--neutral-on-background-strong)', fontSize: '1.4rem', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                      <button onClick={handleCommentSave} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'var(--brand-solid-strong)', color: '#fff', fontSize: '1.4rem', fontWeight: 600, cursor: 'pointer' }}>Salvar</button>
                    </div>
                  </div>
                ) : (
                  <span style={{ whiteSpace: 'pre-wrap' }}>{comment}</span>
                )}
              </div>
            </div>

            {/* Steps to Reproduce / Expected / Actual */}
            {(feedback.metadata?.stepsToReproduce || feedback.metadata?.expectedResult || feedback.metadata?.actualResult) && (
              <div>
                <div>
                  {feedback.metadata?.stepsToReproduce && (
                    <div>
                      <h2>Passos para reproduzir</h2>
                      <span style={{ whiteSpace: 'pre-wrap' }}>{feedback.metadata.stepsToReproduce}</span>
                    </div>
                  )}
                  {feedback.metadata?.expectedResult && (
                    <div>
                      <h2>Resultado esperado</h2>
                      <span style={{ whiteSpace: 'pre-wrap' }}>{feedback.metadata.expectedResult}</span>
                    </div>
                  )}
                  {feedback.metadata?.actualResult && (
                    <div>
                      <h2>Resultado real</h2>
                      <span style={{ whiteSpace: 'pre-wrap' }}>{feedback.metadata.actualResult}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Network Logs */}
            {networkLogs.length > 0 && (
              <div style={{ overflow: 'hidden' }}>
                <div>
                  <div
                    onClick={() => setNetworkLogsOpen(!networkLogsOpen)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', cursor: 'pointer' }}
                  >
                    <h2>Network Logs ({networkLogs.length})</h2>
                    <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                  </div>
                  {networkLogsOpen && (
                    <div style={{ maxHeight: '28rem', overflowY: 'auto' }}>
                      {networkLogs.map((log, i) => (
                        <div
                          key={i}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderTop: '1px solid var(--neutral-border-medium)' }}
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", padding: "0.125rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "var(--neutral-alpha-weak)", color: "var(--neutral-on-background-weak)" }}></span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.2rem', flexShrink: 0 }}>{log.method}</span>
                          <span
                            style={{ fontFamily: 'monospace', fontSize: '1.2rem', color: 'var(--neutral-on-background-weak)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}
                            title={log.url}
                          >{log.url}</span>
                          {log.duration != null && (
                            <span style={{ fontFamily: 'monospace', fontSize: '1.2rem', color: 'var(--neutral-on-background-weak)', flexShrink: 0 }}>{log.duration}ms</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Console Logs */}
            {consoleLogs.length > 0 && (
              <div style={{ overflow: 'hidden' }}>
                <div>
                  <div
                    onClick={() => setConsoleLogsOpen(!consoleLogsOpen)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', cursor: 'pointer' }}
                  >
                    <h2>Console Logs ({consoleLogs.length})</h2>
                    <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                  </div>
                  {consoleLogsOpen && (
                    <div style={{ maxHeight: '28rem', overflowY: 'auto' }}>
                      {consoleLogs.map((log, i) => {
                        const level = log.level?.toUpperCase() ?? 'LOG'
                        const variant = level === 'ERROR' ? 'danger' : level === 'WARN' ? 'warning' : 'info'
                        return (
                          <div
                            key={i}
                            style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem 1rem', borderTop: '1px solid var(--neutral-border-medium)' }}
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", padding: "0.125rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "var(--neutral-alpha-weak)", color: "var(--neutral-on-background-weak)" }}></span>
                            <span style={{ fontFamily: 'monospace', fontSize: '1.2rem', color: 'var(--neutral-on-background-weak)', wordBreak: 'break-word', flex: 1, minWidth: 0 }}>
                              {log.message}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Right sidebar */}
          <div style={{ flex: 1, minWidth: '16rem', maxWidth: '20rem', position: 'sticky', top: '1.5rem' }}>
            {/* Status */}
            <div>
              <div>
                <div>
                  <h2>Status</h2>
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "0.125rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "var(--neutral-alpha-weak)", color: "var(--neutral-on-background-weak)" }}></span>
                </div>
                <select
                  id="status-select"
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--neutral-border-medium)', background: 'var(--surface-background)', color: 'var(--neutral-on-background-strong)', fontSize: '1.4rem', outline: 'none', cursor: 'pointer' }}
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {statusSaving && (
                  <div>
                    <Spinner size="sm" />
                    <span>Salvando...</span>
                  </div>
                )}
                {statusError && (
                  <Alert>{statusError}</Alert>
                )}
              </div>
            </div>

            {/* Assignees */}
            <div>
              <div>
                <div>
                  <h2>Responsáveis</h2>
                  {assignSaving && <Spinner size="sm" />}
                </div>

                {assignees.length === 0 && (
                  <span>Nenhum responsável atribuído.</span>
                )}

                {assignees.length > 0 && (
                  <div>
                    {assignees.map((a) => (
                      <div key={a.userId} style={{ padding: '4px 0' }}>
                        <div>
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: 'var(--neutral-alpha-weak)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 600, color: 'var(--neutral-on-background-strong)',
                          }}>
                            {(a.name || a.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span>{a.name || a.email.split('@')[0]}</span>
                            <span>{a.email}</span>
                          </div>
                        </div>
                        {canAssign && (
                          <button
                            onClick={() => handleUnassign(a.userId)}
                            style={{
                              border: 'none', background: 'none', cursor: 'pointer',
                              color: 'var(--neutral-on-background-weak)', fontSize: 14,
                              padding: '2px 4px', borderRadius: 4,
                            }}
                            title="Remover responsável"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {canAssign && (
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setShowAssignDropdown(!showAssignDropdown)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'transparent', color: 'var(--neutral-on-background-weak)', fontSize: '1.4rem', fontWeight: 600, cursor: 'pointer' }}>+ Atribuir</button>
                    {showAssignDropdown && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        marginTop: 4, background: 'var(--surface-background)',
                        border: '1px solid var(--neutral-border-medium)',
                        borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 10, maxHeight: 200, overflowY: 'auto',
                      }}>
                        {orgMembers
                          .filter(m => !assignees.some(a => a.userId === m.id))
                          .map(m => (
                            <button
                              key={m.id}
                              onClick={() => handleAssign(m.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                width: '100%', padding: '8px 12px',
                                border: 'none', background: 'none', cursor: 'pointer',
                                fontSize: 13, color: 'var(--neutral-on-background-strong)',
                                textAlign: 'left',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--neutral-alpha-weak)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                            >
                              <div style={{
                                width: 20, height: 20, borderRadius: '50%',
                                background: 'var(--neutral-alpha-weak)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 600,
                              }}>
                                {(m.name || m.email).charAt(0).toUpperCase()}
                              </div>
                              <span>{m.name || m.email.split('@')[0]}</span>
                              <span style={{ fontSize: 11, color: 'var(--neutral-on-background-weak)', marginLeft: 'auto' }}>{m.role}</span>
                            </button>
                          ))}
                        {orgMembers.filter(m => !assignees.some(a => a.userId === m.id)).length === 0 && (
                          <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--neutral-on-background-weak)' }}>
                            Todos os membros já foram atribuídos.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div>
              <div>
                <h2>Detalhes</h2>

                {/* Tags */}
                <div>
                  <span>Tipo e Severidade</span>
                  <div>
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "0.125rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "var(--neutral-alpha-weak)", color: "var(--neutral-on-background-weak)" }}></span>
                    {feedback.severity && (
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "0.125rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "var(--neutral-alpha-weak)", color: "var(--neutral-on-background-weak)" }}></span>
                    )}
                  </div>
                </div>

                {/* Page URL */}
                {feedback.pageUrl && (
                  <div>
                    <span>Página</span>
                    <a
                      href={feedback.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '1.2rem',
                        wordBreak: 'break-all',
                        color: 'var(--brand-on-background-strong)',
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      {feedback.pageUrl}
                      <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                    </a>
                  </div>
                )}

                {/* Date */}
                <div>
                  <span>Data</span>
                  <div>
                    <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                    <span>{formatDate(feedback.createdAt)}</span>
                  </div>
                </div>

                {/* User Agent (parsed) + Viewport */}
                {feedback.userAgent && (() => {
                  const { os, browser } = parseUserAgent(feedback.userAgent)
                  return (
                    <div>
                      <span>Navegador</span>
                      <div>
                        <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                        <span>{os} • {browser}</span>
                      </div>
                      {feedback.metadata?.viewport && (
                        <div>
                          <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                          <span>Viewport: {feedback.metadata.viewport}</span>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Captured Events Summary */}
                {(() => {
                  const errorCount = consoleLogs.filter((l: any) => l.level === 'error').length
                  const warnCount = consoleLogs.filter((l: any) => l.level === 'warn' || l.level === 'warning').length
                  const failedRequests = networkLogs.filter((l: any) => l.status && l.status >= 400).length
                  return (
                    <div>
                      <span>Eventos Capturados</span>
                      <div>
                        <div>
                          <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                          <span>
                            {feedback.metadata?.rrwebEvents?.length ?? 0} eventos de sessão
                          </span>
                        </div>
                        <div>
                          <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></AppIcon>
                          <span>
                            {consoleLogs.length} console log{consoleLogs.length !== 1 ? 's' : ''}
                            {errorCount > 0 && <span style={{ color: 'var(--danger-solid-strong)' }}> ({errorCount} {errorCount === 1 ? 'erro' : 'erros'})</span>}
                            {warnCount > 0 && <span style={{ color: 'var(--warning-solid-strong)' }}> ({warnCount} {warnCount === 1 ? 'aviso' : 'avisos'})</span>}
                          </span>
                        </div>
                        <div>
                          <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                          <span>
                            {networkLogs.length} requisição{networkLogs.length !== 1 ? 'ões' : ''} de rede
                            {failedRequests > 0 && <span style={{ color: 'var(--danger-solid-strong)' }}> ({failedRequests} {failedRequests === 1 ? 'falha' : 'falhas'})</span>}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Performance Metrics (Core Web Vitals) */}
                {feedback.metadata?.performance && (() => {
                  const p = feedback.metadata.performance
                  const hasData = p.lcp || p.cls !== undefined || p.inp || p.pageLoadMs
                  if (!hasData) return null

                  const lcpColor = p.lcp ? (p.lcp <= 2500 ? 'var(--success-solid-strong)' : p.lcp <= 4000 ? 'var(--warning-solid-strong)' : 'var(--danger-solid-strong)') : undefined
                  const clsColor = p.cls !== undefined ? (p.cls <= 0.1 ? 'var(--success-solid-strong)' : p.cls <= 0.25 ? 'var(--warning-solid-strong)' : 'var(--danger-solid-strong)') : undefined
                  const inpColor = p.inp ? (p.inp <= 200 ? 'var(--success-solid-strong)' : p.inp <= 500 ? 'var(--warning-solid-strong)' : 'var(--danger-solid-strong)') : undefined

                  return (
                    <div>
                      <span>Performance</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        {p.lcp !== undefined && (
                          <div style={{ padding: '6px 8px', borderRadius: 6, background: 'var(--neutral-alpha-weak)' }}>
                            <span>LCP</span>
                            <span style={{ color: lcpColor }}>{(p.lcp / 1000).toFixed(1)}s</span>
                          </div>
                        )}
                        {p.cls !== undefined && (
                          <div style={{ padding: '6px 8px', borderRadius: 6, background: 'var(--neutral-alpha-weak)' }}>
                            <span>CLS</span>
                            <span style={{ color: clsColor }}>{p.cls.toFixed(3)}</span>
                          </div>
                        )}
                        {p.inp !== undefined && (
                          <div style={{ padding: '6px 8px', borderRadius: 6, background: 'var(--neutral-alpha-weak)' }}>
                            <span>INP</span>
                            <span style={{ color: inpColor }}>{p.inp}ms</span>
                          </div>
                        )}
                        {p.pageLoadMs !== undefined && (
                          <div style={{ padding: '6px 8px', borderRadius: 6, background: 'var(--neutral-alpha-weak)' }}>
                            <span>Load</span>
                            <span>{(p.pageLoadMs / 1000).toFixed(1)}s</span>
                          </div>
                        )}
                      </div>
                      {p.memoryMB !== undefined && (
                        <div>
                          <span>Memória: {p.memoryMB}MB</span>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Rage Clicks */}
                {feedback.metadata?.rageClicks && feedback.metadata.rageClicks.length > 0 && (
                  <div>
                    <div>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger-solid-strong)' }} />
                      <span style={{ color: 'var(--danger-solid-strong)' }}>
                        {feedback.metadata.rageClicks.length} Rage Click{feedback.metadata.rageClicks.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    {feedback.metadata.rageClicks.map((rc, i) => (
                      <span key={i}>
                        {rc.count}x em &lt;{rc.tag.toLowerCase()}&gt; {rc.text ? `"${rc.text}"` : rc.sel}
                      </span>
                    ))}
                  </div>
                )}

                {/* Dead Clicks */}
                {feedback.metadata?.deadClicks && feedback.metadata.deadClicks.length > 0 && (
                  <div>
                    <div>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning-solid-strong)' }} />
                      <span style={{ color: 'var(--warning-solid-strong)' }}>
                        {feedback.metadata.deadClicks.length} Dead Click{feedback.metadata.deadClicks.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    {feedback.metadata.deadClicks.map((dc, i) => (
                      <span key={i}>
                        &lt;{dc.tag.toLowerCase()}&gt; {dc.text ? `"${dc.text}"` : dc.sel}
                      </span>
                    ))}
                  </div>
                )}

                {/* Display + Connection + Geo */}
                {(feedback.metadata?.display || feedback.metadata?.connection || feedback.metadata?.geo) && (
                  <div>
                    <span>Ambiente</span>
                    {feedback.metadata?.display && (
                      <div>
                        <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                        <span>
                          Tela: {feedback.metadata.display.screenW}×{feedback.metadata.display.screenH} ({feedback.metadata.display.dpr}x)
                          {feedback.metadata.display.touch ? ' • Touch' : ''}
                        </span>
                      </div>
                    )}
                    {feedback.metadata?.connection && feedback.metadata.connection.effectiveType && (
                      <div>
                        <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                        <span>
                          Rede: {feedback.metadata.connection.effectiveType.toUpperCase()}
                          {feedback.metadata.connection.downlink ? ` • ${feedback.metadata.connection.downlink}Mbps` : ''}
                          {feedback.metadata.connection.rtt ? ` • ${feedback.metadata.connection.rtt}ms RTT` : ''}
                        </span>
                      </div>
                    )}
                    {feedback.metadata?.geo && (
                      <div>
                        <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="1"/></AppIcon>
                        <span>
                          {feedback.metadata.geo.tz} • {feedback.metadata.geo.lang}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Click Breadcrumbs (separate card, collapsible) */}
            {feedback.metadata?.clickBreadcrumbs && feedback.metadata.clickBreadcrumbs.length > 0 && (
              <div>
                <details>
                  <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', cursor: 'pointer' }}>
                    <span>
                      Breadcrumbs ({feedback.metadata.clickBreadcrumbs.length} cliques)
                    </span>
                  </summary>
                  <div style={{ maxHeight: '300px', overflowY: 'auto', borderTop: '1px solid var(--neutral-border-medium)' }}>
                    {feedback.metadata.clickBreadcrumbs.map((bc, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.4rem 1rem', borderTop: i > 0 ? '1px solid var(--neutral-border-medium)' : 'none' }}>
                        <span style={{ whiteSpace: 'nowrap', minWidth: '1.5rem' }}>
                          {i + 1}.
                        </span>
                        <span style={{ fontFamily: 'var(--font-code)' }}>
                          &lt;{bc.tag.toLowerCase()}&gt;{bc.text ? ` "${bc.text}"` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      </div>
    </AppLayout>
  )
}
