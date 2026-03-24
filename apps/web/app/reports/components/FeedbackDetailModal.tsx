'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  Column,
  Row,
  Heading,
  Text,
  Tag,
  Icon,
  Flex,
  Button,
  IconButton,
  Textarea,
  Spinner,
  Feedback as FeedbackAlert,
} from '@once-ui-system/core'
import { getTagVariant, getTypeLabel, getStatusLabel, getSeverityLabel, parseUserAgent, ALL_STATUSES } from '../utils/labels'
import { api } from '@/lib/api'

const SessionReplay = dynamic(() => import('@/components/viewer/SessionReplay'), { ssr: false })

interface FeedbackDetail {
  id: string
  type: string
  severity?: string
  status: string
  comment: string
  title?: string
  screenshotUrl?: string
  pageUrl?: string
  userAgent?: string
  createdAt: string
  projectId: string
  consoleLogs?: { level: string; message: string; timestamp?: number }[]
  networkLogs?: { method: string; url: string; status?: number; duration?: number }[]
  metadata?: {
    rrwebEvents?: any[]
    stepsToReproduce?: string
    expectedResult?: string
    actualResult?: string
    source?: string
    viewport?: string
  } | null
  Project?: { name: string } | null
}

interface FeedbackDetailModalProps {
  isOpen: boolean
  onClose: () => void
  feedbackId: string | null
}

type TabKey = 'report' | 'console' | 'network'

export default function FeedbackDetailModal({ isOpen, onClose, feedbackId }: FeedbackDetailModalProps) {
  const [feedback, setFeedback] = useState<FeedbackDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [editingComment, setEditingComment] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [commentSaving, setCommentSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('report')

  useEffect(() => {
    if (!isOpen || !feedbackId) {
      setFeedback(null)
      setActiveTab('report')
      return
    }
    let cancelled = false
    setLoading(true)
    setFeedback(null)
    setEditingComment(false)
    ;(async () => {
      try {
        const res = await fetch(`/api/feedbacks/${feedbackId}`)
        if (res.ok && !cancelled) setFeedback(await res.json())
      } catch {}
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [isOpen, feedbackId])

  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!feedback) return
    setStatusSaving(true)
    try {
      await api.feedbacks.updateStatus(feedback.id, newStatus)
      setFeedback(prev => prev ? { ...prev, status: newStatus } : null)
    } catch {}
    setStatusSaving(false)
  }, [feedback])

  const handleCommentSave = useCallback(async () => {
    if (!feedback) return
    setCommentSaving(true)
    try {
      await api.feedbacks.updateComment(feedback.id, commentDraft)
      setFeedback(prev => prev ? { ...prev, comment: commentDraft } : null)
      setEditingComment(false)
    } catch {}
    setCommentSaving(false)
  }, [feedback, commentDraft])

  if (!isOpen) return null

  const consoleLogs = feedback?.consoleLogs || []
  const networkLogs = feedback?.networkLogs || []
  const errorCount = consoleLogs.filter(l => l.level === 'error').length
  const failedRequests = networkLogs.filter(l => l.status && l.status >= 400).length
  const hasReplay = feedback?.metadata?.rrwebEvents && feedback.metadata.rrwebEvents.length > 0 && feedback.metadata?.source === 'embed'
  const ua = feedback?.userAgent ? parseUserAgent(feedback.userAgent) : null

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
      paddingTop: '2vh', overflowY: 'auto',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: '72rem', maxHeight: '96vh',
        background: 'var(--page-background)',
        borderRadius: '0.75rem',
        border: '1px solid var(--neutral-border-medium)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
        margin: '0 1rem 2rem',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {loading ? (
          <Flex fillWidth style={{ minHeight: '24rem' }} horizontal="center" vertical="center">
            <Column horizontal="center" gap="m"><Spinner size="m" /><Text variant="body-default-s" onBackground="neutral-weak">Carregando report...</Text></Column>
          </Flex>
        ) : feedback ? (
          <>
            {/* ── Header ── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.875rem 1.25rem',
              borderBottom: '1px solid var(--neutral-border-medium)',
              background: 'var(--surface-background)',
              flexShrink: 0,
            }}>
              {/* Status dot */}
              <div style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: feedback.status === 'RESOLVED' ? 'var(--success-solid-strong)'
                  : feedback.status === 'CANCELLED' ? 'var(--danger-solid-strong)'
                  : 'var(--warning-solid-strong)',
              }} />
              {/* Title */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text variant="body-default-m" onBackground="neutral-strong" style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                  {feedback.title || feedback.comment?.slice(0, 80) || 'Report'}
                </Text>
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  {formatDate(feedback.createdAt)}
                </Text>
              </div>
              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                {feedback.pageUrl && (
                  <a href={feedback.pageUrl} target="_blank" rel="noopener noreferrer" title="Abrir página original" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '0.5rem', border: '1px solid var(--neutral-border-medium)', background: 'var(--surface-background)', color: 'var(--neutral-on-background-weak)', cursor: 'pointer' }}>
                    <Icon name="openLink" size="s" />
                  </a>
                )}
                <IconButton icon="close" variant="tertiary" size="s" tooltip="Fechar" onClick={onClose} />
              </div>
            </div>

            {/* ── Body: 2 columns ── */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

              {/* Left: Screenshot/Replay */}
              <div style={{
                flex: '1 1 55%', minWidth: 0,
                background: 'var(--neutral-alpha-weak)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '1.5rem',
                overflow: 'auto',
              }}>
                {hasReplay ? (
                  <div style={{ width: '100%', borderRadius: '0.75rem', overflow: 'hidden', background: '#0f172a' }}>
                    <SessionReplay events={feedback.metadata!.rrwebEvents!} />
                  </div>
                ) : feedback.screenshotUrl ? (
                  <img
                    src={feedback.screenshotUrl}
                    alt="Screenshot"
                    style={{
                      maxWidth: '100%', maxHeight: '100%',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--neutral-border-medium)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <Column horizontal="center" gap="s" style={{ padding: '3rem' }}>
                    <Icon name="message" size="l" />
                    <Text variant="body-default-s" onBackground="neutral-weak">Sem captura visual</Text>
                  </Column>
                )}
              </div>

              {/* Right: Tabs panel */}
              <div style={{
                flex: '0 0 45%', maxWidth: '28rem',
                display: 'flex', flexDirection: 'column',
                borderLeft: '1px solid var(--neutral-border-medium)',
                overflow: 'hidden',
              }}>
                {/* Tab bar */}
                <div style={{
                  display: 'flex', borderBottom: '1px solid var(--neutral-border-medium)',
                  background: 'var(--surface-background)', flexShrink: 0,
                }}>
                  {([
                    { key: 'report' as TabKey, label: 'Report' },
                    { key: 'console' as TabKey, label: `Console${consoleLogs.length > 0 ? ` (${consoleLogs.length})` : ''}` },
                    { key: 'network' as TabKey, label: `Network${networkLogs.length > 0 ? ` (${networkLogs.length})` : ''}` },
                  ]).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      style={{
                        flex: 1, padding: '0.75rem 0.5rem',
                        fontSize: '0.8125rem', fontWeight: 600,
                        border: 'none', cursor: 'pointer',
                        borderBottom: activeTab === tab.key ? '2px solid var(--neutral-on-background-strong)' : '2px solid transparent',
                        color: activeTab === tab.key ? 'var(--neutral-on-background-strong)' : 'var(--neutral-on-background-weak)',
                        background: 'transparent',
                        transition: 'all 0.15s',
                        marginBottom: -1,
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>

                  {/* ── Report Tab ── */}
                  {activeTab === 'report' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                      {/* Meta row: Type + Severity + Status */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                        <Tag variant={getTagVariant(feedback.type)} size="s" label={getTypeLabel(feedback.type)} />
                        {feedback.severity && <Tag variant={getTagVariant(feedback.severity)} size="s" label={getSeverityLabel(feedback.severity)} />}
                        {feedback.Project?.name && <Tag variant="neutral" size="s" label={feedback.Project.name} />}
                      </div>

                      {/* Status */}
                      <div>
                        <Text variant="label-default-xs" onBackground="neutral-weak" style={{ marginBottom: '0.375rem', display: 'block' }}>Status</Text>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {ALL_STATUSES.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => handleStatusChange(opt.value)}
                              disabled={statusSaving}
                              style={{
                                padding: '0.25rem 0.625rem', borderRadius: '0.375rem',
                                fontSize: '0.75rem', fontWeight: 500, cursor: statusSaving ? 'wait' : 'pointer',
                                border: feedback.status === opt.value ? '1.5px solid var(--neutral-on-background-strong)' : '1px solid var(--neutral-border-medium)',
                                background: feedback.status === opt.value ? 'var(--neutral-alpha-weak)' : 'transparent',
                                color: feedback.status === opt.value ? 'var(--neutral-on-background-strong)' : 'var(--neutral-on-background-weak)',
                                transition: 'all 0.15s',
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                          <Text variant="label-default-xs" onBackground="neutral-weak">Descrição</Text>
                          {!editingComment && (
                            <button onClick={() => { setCommentDraft(feedback.comment); setEditingComment(true) }}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--brand-on-background-strong)', fontSize: '0.6875rem', fontWeight: 500 }}>
                              Editar
                            </button>
                          )}
                        </div>
                        {editingComment ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <Textarea id="modal-comment-edit" label="" value={commentDraft} lines={4} resize="vertical" onChange={e => setCommentDraft(e.target.value)} disabled={commentSaving} />
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <Button variant="secondary" size="s" label="Cancelar" onClick={() => setEditingComment(false)} disabled={commentSaving} />
                              <Button variant="primary" size="s" label="Salvar" onClick={handleCommentSave} loading={commentSaving} />
                            </div>
                          </div>
                        ) : (
                          <Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{feedback.comment}</Text>
                        )}
                      </div>

                      {/* Steps / Expected / Actual */}
                      {(feedback.metadata?.stepsToReproduce || feedback.metadata?.expectedResult || feedback.metadata?.actualResult) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {feedback.metadata?.stepsToReproduce && (
                            <div>
                              <Text variant="label-default-xs" onBackground="neutral-weak" style={{ marginBottom: '0.25rem', display: 'block' }}>Passos para reproduzir</Text>
                              <Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{feedback.metadata.stepsToReproduce}</Text>
                            </div>
                          )}
                          {feedback.metadata?.expectedResult && (
                            <div>
                              <Text variant="label-default-xs" onBackground="neutral-weak" style={{ marginBottom: '0.25rem', display: 'block' }}>Resultado esperado</Text>
                              <Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{feedback.metadata.expectedResult}</Text>
                            </div>
                          )}
                          {feedback.metadata?.actualResult && (
                            <div>
                              <Text variant="label-default-xs" onBackground="neutral-weak" style={{ marginBottom: '0.25rem', display: 'block' }}>Resultado real</Text>
                              <Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{feedback.metadata.actualResult}</Text>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Errors detected */}
                      {(errorCount > 0 || failedRequests > 0) && (
                        <div>
                          <Text variant="label-default-xs" onBackground="neutral-weak" style={{ marginBottom: '0.375rem', display: 'block' }}>Erros detectados</Text>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                            {errorCount > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'var(--danger-alpha-weak)', border: '1px solid var(--danger-border-medium)' }}>
                                <Text variant="body-default-xs" onBackground="danger-strong">
                                  {errorCount} {errorCount === 1 ? 'erro' : 'erros'} no console
                                </Text>
                              </div>
                            )}
                            {failedRequests > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'var(--danger-alpha-weak)', border: '1px solid var(--danger-border-medium)' }}>
                                <Text variant="body-default-xs" onBackground="danger-strong">
                                  {failedRequests} {failedRequests === 1 ? 'requisição com falha' : 'requisições com falha'}
                                </Text>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Environment */}
                      <div>
                        <Text variant="label-default-xs" onBackground="neutral-weak" style={{ marginBottom: '0.375rem', display: 'block' }}>Ambiente</Text>
                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                          {ua && (
                            <>
                              <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', border: '1px solid var(--neutral-border-medium)', fontSize: '0.6875rem', color: 'var(--neutral-on-background-strong)', background: 'var(--surface-background)' }}>
                                {ua.browser}
                              </span>
                              <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', border: '1px solid var(--neutral-border-medium)', fontSize: '0.6875rem', color: 'var(--neutral-on-background-strong)', background: 'var(--surface-background)' }}>
                                {ua.os}
                              </span>
                            </>
                          )}
                          {feedback.metadata?.viewport && (
                            <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', border: '1px solid var(--neutral-border-medium)', fontSize: '0.6875rem', color: 'var(--neutral-on-background-strong)', background: 'var(--surface-background)' }}>
                              {feedback.metadata.viewport}
                            </span>
                          )}
                          {feedback.metadata?.source && (
                            <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', border: '1px solid var(--neutral-border-medium)', fontSize: '0.6875rem', color: 'var(--neutral-on-background-strong)', background: 'var(--surface-background)' }}>
                              {feedback.metadata.source === 'shared-url' ? 'URL compartilhada' : 'Widget embed'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Links */}
                      {feedback.pageUrl && (
                        <div>
                          <Text variant="label-default-xs" onBackground="neutral-weak" style={{ marginBottom: '0.375rem', display: 'block' }}>Links</Text>
                          <a href={feedback.pageUrl} target="_blank" rel="noopener noreferrer" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                            padding: '0.375rem 0.75rem', borderRadius: '0.5rem',
                            border: '1px solid var(--neutral-border-medium)',
                            fontSize: '0.75rem', color: 'var(--neutral-on-background-strong)',
                            textDecoration: 'none', background: 'var(--surface-background)',
                          }}>
                            Abrir página original <Icon name="openLink" size="xs" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Console Tab ── */}
                  {activeTab === 'console' && (
                    <div>
                      {consoleLogs.length === 0 ? (
                        <Text variant="body-default-s" onBackground="neutral-weak" style={{ textAlign: 'center', padding: '2rem 0' }}>Nenhum log capturado</Text>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {consoleLogs.map((log, i) => {
                            const level = log.level?.toUpperCase() ?? 'LOG'
                            const isError = level === 'ERROR'
                            const isWarn = level === 'WARN' || level === 'WARNING'
                            return (
                              <div key={i} style={{
                                display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                                padding: '0.5rem 0',
                                borderBottom: i < consoleLogs.length - 1 ? '1px solid var(--neutral-border-medium)' : undefined,
                              }}>
                                <span style={{
                                  flexShrink: 0, padding: '0.125rem 0.375rem', borderRadius: '0.25rem',
                                  fontSize: '0.625rem', fontWeight: 700, fontFamily: 'monospace',
                                  background: isError ? 'var(--danger-alpha-weak)' : isWarn ? 'var(--warning-alpha-weak)' : 'var(--info-alpha-weak)',
                                  color: isError ? 'var(--danger-on-background-strong)' : isWarn ? 'var(--warning-on-background-strong)' : 'var(--info-on-background-strong)',
                                }}>
                                  {level}
                                </span>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', wordBreak: 'break-word', flex: 1, lineHeight: 1.5 }}>
                                  {log.message}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Network Tab ── */}
                  {activeTab === 'network' && (
                    <div>
                      {networkLogs.length === 0 ? (
                        <Text variant="body-default-s" onBackground="neutral-weak" style={{ textAlign: 'center', padding: '2rem 0' }}>Nenhuma requisição capturada</Text>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {networkLogs.map((log, i) => {
                            const isFailed = log.status && log.status >= 400
                            return (
                              <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.5rem 0',
                                borderBottom: i < networkLogs.length - 1 ? '1px solid var(--neutral-border-medium)' : undefined,
                              }}>
                                <span style={{
                                  flexShrink: 0, padding: '0.125rem 0.375rem', borderRadius: '0.25rem',
                                  fontSize: '0.625rem', fontWeight: 700, fontFamily: 'monospace',
                                  background: isFailed ? 'var(--danger-alpha-weak)' : 'var(--success-alpha-weak)',
                                  color: isFailed ? 'var(--danger-on-background-strong)' : 'var(--success-on-background-strong)',
                                }}>
                                  {log.status ?? '—'}
                                </span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.6875rem', flexShrink: 0, color: 'var(--neutral-on-background-strong)' }}>
                                  {log.method}
                                </span>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.6875rem', color: 'var(--neutral-on-background-weak)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={log.url}>
                                  {log.url}
                                </span>
                                {log.duration != null && (
                                  <span style={{ fontFamily: 'monospace', fontSize: '0.6875rem', color: 'var(--neutral-on-background-weak)', flexShrink: 0 }}>
                                    {log.duration}ms
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
