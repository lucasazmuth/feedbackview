'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  Flex,
  Column,
  Row,
  Heading,
  Text,
  Button,
  IconButton,
  Card,
  Textarea,
  Select,
  Tag,
  Icon,
  Feedback as FeedbackAlert,
  Spinner,
} from '@once-ui-system/core'
import { api } from '@/lib/api'
import AppLayout from '@/components/ui/AppLayout'

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
        <Flex fillWidth style={{ minHeight: '100vh' }} horizontal="center" vertical="center">
          <Column horizontal="center" gap="m">
            <FeedbackAlert variant="danger">{error || 'Report não encontrado.'}</FeedbackAlert>
            <Link href="/dashboard">
              <Button variant="tertiary" size="s" label="Voltar ao dashboard" />
            </Link>
          </Column>
        </Flex>
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
      {/* Header */}
      <Row
        as="header"
        fillWidth
        paddingX="l"
        paddingY="m"
        vertical="center"
        gap="m"
        borderBottom="neutral-medium"
        background="surface"
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
          <Icon name="arrowLeft" size="xs" />
          {feedback.Project?.name || 'Projeto'}
        </Link>
        <Text variant="body-default-s" onBackground="neutral-weak" style={{ flexShrink: 0 }}>/</Text>
        <Tag variant={getTypeTagVariant(feedback.type)} size="s" label={getTypeLabel(feedback.type)} />
        <Text
          variant="body-default-s"
          onBackground="neutral-strong"
          style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '20rem', flexShrink: 0 }}
        >
          {comment || 'Sem descrição'}
        </Text>
      </Row>
      <Column fillWidth paddingX="l" paddingY="l" gap="m">

      <style>{`#status-select { padding-top: 8px !important; padding-bottom: 8px !important; }`}</style>
      <Flex fillWidth>
        <Row
          fillWidth
          gap="l"
          style={{ alignItems: 'flex-start' }}
        >
          {/* Left column */}
          <Column gap="l" fillWidth style={{ flex: 2, minWidth: 0 }}>
            {/* Warning for non-embed reports that have rrweb events */}
            {feedback.metadata?.rrwebEvents && feedback.metadata.rrwebEvents.length > 0 && feedback.metadata?.source !== 'embed' && (
              <Card fillWidth padding="m" radius="l" style={{ background: 'var(--warning-alpha-weak)', border: '1px solid var(--warning-border-medium)' }}>
                <Row gap="s" vertical="center">
                  <Icon name="warning" size="s" onBackground="warning-strong" />
                  <Column gap="4">
                    <Text variant="label-default-s" onBackground="warning-strong">Report via URL compartilhada</Text>
                    <Text variant="body-default-xs" onBackground="warning-medium">O Session Replay não está disponível para reports enviados via URL compartilhada. Utilize o screenshot como referência visual.</Text>
                  </Column>
                </Row>
              </Card>
            )}

            {/* Session Replay (only for embed source — replay is unreliable in proxy mode) */}
            {feedback.metadata?.rrwebEvents && feedback.metadata.rrwebEvents.length > 0 && feedback.metadata?.source === 'embed' && (
              <Card fillWidth radius="l" style={{ overflow: 'hidden', padding: 0 }}>
                <SessionReplay events={feedback.metadata.rrwebEvents} />
              </Card>
            )}

            {/* Screenshot */}
            {feedback.screenshotUrl && (
              <Card fillWidth padding="l" radius="l">
                <Column gap="s">
                  <Heading variant="heading-strong-s">Screenshot</Heading>
                  <img
                    src={feedback.screenshotUrl}
                    alt="Screenshot"
                    style={{ width: '100%', borderRadius: '0.5rem', border: '1px solid var(--neutral-border-medium)' }}
                  />
                </Column>
              </Card>
            )}

            {/* Description */}
            <Card fillWidth padding="l" radius="l">
              <Column gap="s">
                <Row fillWidth horizontal="between" vertical="center">
                  <Heading variant="heading-strong-s">Descrição</Heading>
                  {!editingComment && (
                    <IconButton
                      icon="edit"
                      variant="tertiary"
                      size="s"
                      tooltip="Editar"
                      onClick={() => { setCommentDraft(comment); setEditingComment(true) }}
                    />
                  )}
                </Row>
                {editingComment ? (
                  <Column gap="s">
                    <Textarea
                      id="comment-edit"
                      label="Descrição"
                      value={commentDraft}
                      lines={4}
                      resize="vertical"
                      onChange={(e) => setCommentDraft(e.target.value)}
                      disabled={commentSaving}
                    />
                    <Row gap="s" horizontal="end">
                      <Button
                        variant="secondary"
                        size="s"
                        label="Cancelar"
                        onClick={() => setEditingComment(false)}
                        disabled={commentSaving}
                      />
                      <Button
                        variant="primary"
                        size="s"
                        label="Salvar"
                        onClick={handleCommentSave}
                        loading={commentSaving}
                      />
                    </Row>
                  </Column>
                ) : (
                  <Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{comment}</Text>
                )}
              </Column>
            </Card>

            {/* Steps to Reproduce / Expected / Actual */}
            {(feedback.metadata?.stepsToReproduce || feedback.metadata?.expectedResult || feedback.metadata?.actualResult) && (
              <Card fillWidth padding="l" radius="l">
                <Column gap="m">
                  {feedback.metadata?.stepsToReproduce && (
                    <Column gap="xs">
                      <Heading variant="heading-strong-s">Passos para reproduzir</Heading>
                      <Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{feedback.metadata.stepsToReproduce}</Text>
                    </Column>
                  )}
                  {feedback.metadata?.expectedResult && (
                    <Column gap="xs">
                      <Heading variant="heading-strong-s">Resultado esperado</Heading>
                      <Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{feedback.metadata.expectedResult}</Text>
                    </Column>
                  )}
                  {feedback.metadata?.actualResult && (
                    <Column gap="xs">
                      <Heading variant="heading-strong-s">Resultado real</Heading>
                      <Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{feedback.metadata.actualResult}</Text>
                    </Column>
                  )}
                </Column>
              </Card>
            )}

            {/* Network Logs */}
            {networkLogs.length > 0 && (
              <Card fillWidth padding="0" radius="l" style={{ overflow: 'hidden' }}>
                <Column fillWidth>
                  <div
                    onClick={() => setNetworkLogsOpen(!networkLogsOpen)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', cursor: 'pointer' }}
                  >
                    <Heading variant="heading-strong-s">Network Logs ({networkLogs.length})</Heading>
                    <Icon name="chevronDown" size="xs" style={{ transform: networkLogsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                  </div>
                  {networkLogsOpen && (
                    <div style={{ maxHeight: '28rem', overflowY: 'auto' }}>
                      {networkLogs.map((log, i) => (
                        <div
                          key={i}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderTop: '1px solid var(--neutral-border-medium)' }}
                        >
                          <Tag
                            variant={log.status && log.status >= 400 ? 'danger' : 'success'}
                            size="s"
                            label={String(log.status ?? '-')}
                          />
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>{log.method}</span>
                          <span
                            style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}
                            title={log.url}
                          >{log.url}</span>
                          {log.duration != null && (
                            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', flexShrink: 0 }}>{log.duration}ms</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Column>
              </Card>
            )}

            {/* Console Logs */}
            {consoleLogs.length > 0 && (
              <Card fillWidth padding="0" radius="l" style={{ overflow: 'hidden' }}>
                <Column fillWidth>
                  <div
                    onClick={() => setConsoleLogsOpen(!consoleLogsOpen)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', cursor: 'pointer' }}
                  >
                    <Heading variant="heading-strong-s">Console Logs ({consoleLogs.length})</Heading>
                    <Icon name="chevronDown" size="xs" style={{ transform: consoleLogsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
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
                            <Tag
                              variant={variant as any}
                              size="s"
                              label={level}
                              style={{ flexShrink: 0 }}
                            />
                            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', wordBreak: 'break-word', flex: 1, minWidth: 0 }}>
                              {log.message}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Column>
              </Card>
            )}

          </Column>

          {/* Right sidebar */}
          <Column gap="m" style={{ flex: 1, minWidth: '16rem', maxWidth: '20rem', position: 'sticky', top: '1.5rem' }}>
            {/* Status */}
            <Card fillWidth padding="l" radius="l">
              <Column gap="m">
                <Row horizontal="between" vertical="center">
                  <Heading variant="heading-strong-s">Status</Heading>
                  <Tag variant={getStatusTagVariant(status)} size="s" label={getStatusLabel(status)} />
                </Row>
                <Select
                  id="status-select"
                  label=""
                  options={STATUS_OPTIONS}
                  value={status}
                  onSelect={handleStatusChange}
                />
                {statusSaving && (
                  <Row gap="xs" vertical="center">
                    <Spinner size="s" />
                    <Text variant="body-default-xs" onBackground="neutral-weak">Salvando...</Text>
                  </Row>
                )}
                {statusError && (
                  <FeedbackAlert variant="danger">{statusError}</FeedbackAlert>
                )}
              </Column>
            </Card>

            {/* Assignees */}
            <Card fillWidth padding="l" radius="l">
              <Column gap="m">
                <Row horizontal="between" vertical="center">
                  <Heading variant="heading-strong-s">Responsáveis</Heading>
                  {assignSaving && <Spinner size="s" />}
                </Row>

                {assignees.length === 0 && (
                  <Text variant="body-default-xs" onBackground="neutral-weak">Nenhum responsável atribuído.</Text>
                )}

                {assignees.length > 0 && (
                  <Column gap="xs">
                    {assignees.map((a) => (
                      <Row key={a.userId} horizontal="between" vertical="center" style={{ padding: '4px 0' }}>
                        <Row gap="xs" vertical="center">
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: 'var(--neutral-alpha-weak)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 600, color: 'var(--neutral-on-background-strong)',
                          }}>
                            {(a.name || a.email).charAt(0).toUpperCase()}
                          </div>
                          <Column gap="1">
                            <Text variant="label-default-s">{a.name || a.email.split('@')[0]}</Text>
                            <Text variant="body-default-xs" onBackground="neutral-weak">{a.email}</Text>
                          </Column>
                        </Row>
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
                      </Row>
                    ))}
                  </Column>
                )}

                {canAssign && (
                  <div style={{ position: 'relative' }}>
                    <Button
                      variant="tertiary"
                      size="s"
                      label="+ Atribuir"
                      onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                    />
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
              </Column>
            </Card>

            {/* Metadata */}
            <Card fillWidth padding="l" radius="l">
              <Column gap="m">
                <Heading variant="heading-strong-s">Detalhes</Heading>

                {/* Tags */}
                <Column gap="xs">
                  <Text variant="label-default-s" onBackground="neutral-weak">Tipo e Severidade</Text>
                  <Row gap="xs" wrap>
                    <Tag variant={getTypeTagVariant(feedback.type)} size="m" label={getTypeLabel(feedback.type)} />
                    {feedback.severity && (
                      <Tag variant={getSeverityTagVariant(feedback.severity)} size="m" label={getSeverityLabel(feedback.severity)} />
                    )}
                  </Row>
                </Column>

                {/* Page URL */}
                {feedback.pageUrl && (
                  <Column gap="xs">
                    <Text variant="label-default-s" onBackground="neutral-weak">Página</Text>
                    <a
                      href={feedback.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '0.75rem',
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
                      <Icon name="openLink" size="xs" style={{ flexShrink: 0 }} />
                    </a>
                  </Column>
                )}

                {/* Date */}
                <Column gap="xs">
                  <Text variant="label-default-s" onBackground="neutral-weak">Data</Text>
                  <Row gap="xs" vertical="center">
                    <Icon name="clock" size="xs" />
                    <Text variant="body-default-xs">{formatDate(feedback.createdAt)}</Text>
                  </Row>
                </Column>

                {/* User Agent (parsed) + Viewport */}
                {feedback.userAgent && (() => {
                  const { os, browser } = parseUserAgent(feedback.userAgent)
                  return (
                    <Column gap="xs">
                      <Text variant="label-default-s" onBackground="neutral-weak">Navegador</Text>
                      <Row gap="xs" vertical="center">
                        <Icon name="monitor" size="xs" />
                        <Text variant="body-default-xs">{os} • {browser}</Text>
                      </Row>
                      {feedback.metadata?.viewport && (
                        <Row gap="xs" vertical="center">
                          <Icon name="viewport" size="xs" />
                          <Text variant="body-default-xs">Viewport: {feedback.metadata.viewport}</Text>
                        </Row>
                      )}
                    </Column>
                  )
                })()}

                {/* Captured Events Summary */}
                {(() => {
                  const errorCount = consoleLogs.filter((l: any) => l.level === 'error').length
                  const warnCount = consoleLogs.filter((l: any) => l.level === 'warn' || l.level === 'warning').length
                  const failedRequests = networkLogs.filter((l: any) => l.status && l.status >= 400).length
                  return (
                    <Column gap="xs">
                      <Text variant="label-default-s" onBackground="neutral-weak">Eventos Capturados</Text>
                      <Column gap="xs">
                        <Row gap="xs" vertical="center">
                          <Icon name="monitor" size="xs" />
                          <Text variant="body-default-xs">
                            {feedback.metadata?.rrwebEvents?.length ?? 0} eventos de sessão
                          </Text>
                        </Row>
                        <Row gap="xs" vertical="center">
                          <Icon name="message" size="xs" />
                          <Text variant="body-default-xs">
                            {consoleLogs.length} console log{consoleLogs.length !== 1 ? 's' : ''}
                            {errorCount > 0 && <span style={{ color: 'var(--danger-solid-strong)' }}> ({errorCount} {errorCount === 1 ? 'erro' : 'erros'})</span>}
                            {warnCount > 0 && <span style={{ color: 'var(--warning-solid-strong)' }}> ({warnCount} {warnCount === 1 ? 'aviso' : 'avisos'})</span>}
                          </Text>
                        </Row>
                        <Row gap="xs" vertical="center">
                          <Icon name="openLink" size="xs" />
                          <Text variant="body-default-xs">
                            {networkLogs.length} requisição{networkLogs.length !== 1 ? 'ões' : ''} de rede
                            {failedRequests > 0 && <span style={{ color: 'var(--danger-solid-strong)' }}> ({failedRequests} {failedRequests === 1 ? 'falha' : 'falhas'})</span>}
                          </Text>
                        </Row>
                      </Column>
                    </Column>
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
                    <Column gap="xs">
                      <Text variant="label-default-s" onBackground="neutral-weak">Performance</Text>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        {p.lcp !== undefined && (
                          <div style={{ padding: '6px 8px', borderRadius: 6, background: 'var(--neutral-alpha-weak)' }}>
                            <Text variant="body-default-xs" onBackground="neutral-weak">LCP</Text>
                            <Text variant="label-default-s" style={{ color: lcpColor }}>{(p.lcp / 1000).toFixed(1)}s</Text>
                          </div>
                        )}
                        {p.cls !== undefined && (
                          <div style={{ padding: '6px 8px', borderRadius: 6, background: 'var(--neutral-alpha-weak)' }}>
                            <Text variant="body-default-xs" onBackground="neutral-weak">CLS</Text>
                            <Text variant="label-default-s" style={{ color: clsColor }}>{p.cls.toFixed(3)}</Text>
                          </div>
                        )}
                        {p.inp !== undefined && (
                          <div style={{ padding: '6px 8px', borderRadius: 6, background: 'var(--neutral-alpha-weak)' }}>
                            <Text variant="body-default-xs" onBackground="neutral-weak">INP</Text>
                            <Text variant="label-default-s" style={{ color: inpColor }}>{p.inp}ms</Text>
                          </div>
                        )}
                        {p.pageLoadMs !== undefined && (
                          <div style={{ padding: '6px 8px', borderRadius: 6, background: 'var(--neutral-alpha-weak)' }}>
                            <Text variant="body-default-xs" onBackground="neutral-weak">Load</Text>
                            <Text variant="label-default-s">{(p.pageLoadMs / 1000).toFixed(1)}s</Text>
                          </div>
                        )}
                      </div>
                      {p.memoryMB !== undefined && (
                        <Row gap="xs" vertical="center">
                          <Text variant="body-default-xs" onBackground="neutral-weak">Memória: {p.memoryMB}MB</Text>
                        </Row>
                      )}
                    </Column>
                  )
                })()}

                {/* Rage Clicks */}
                {feedback.metadata?.rageClicks && feedback.metadata.rageClicks.length > 0 && (
                  <Column gap="xs">
                    <Row gap="xs" vertical="center">
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger-solid-strong)' }} />
                      <Text variant="label-default-s" style={{ color: 'var(--danger-solid-strong)' }}>
                        {feedback.metadata.rageClicks.length} Rage Click{feedback.metadata.rageClicks.length > 1 ? 's' : ''}
                      </Text>
                    </Row>
                    {feedback.metadata.rageClicks.map((rc, i) => (
                      <Text key={i} variant="body-default-xs" onBackground="neutral-weak">
                        {rc.count}x em &lt;{rc.tag.toLowerCase()}&gt; {rc.text ? `"${rc.text}"` : rc.sel}
                      </Text>
                    ))}
                  </Column>
                )}

                {/* Dead Clicks */}
                {feedback.metadata?.deadClicks && feedback.metadata.deadClicks.length > 0 && (
                  <Column gap="xs">
                    <Row gap="xs" vertical="center">
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning-solid-strong)' }} />
                      <Text variant="label-default-s" style={{ color: 'var(--warning-solid-strong)' }}>
                        {feedback.metadata.deadClicks.length} Dead Click{feedback.metadata.deadClicks.length > 1 ? 's' : ''}
                      </Text>
                    </Row>
                    {feedback.metadata.deadClicks.map((dc, i) => (
                      <Text key={i} variant="body-default-xs" onBackground="neutral-weak">
                        &lt;{dc.tag.toLowerCase()}&gt; {dc.text ? `"${dc.text}"` : dc.sel}
                      </Text>
                    ))}
                  </Column>
                )}

                {/* Display + Connection + Geo */}
                {(feedback.metadata?.display || feedback.metadata?.connection || feedback.metadata?.geo) && (
                  <Column gap="xs">
                    <Text variant="label-default-s" onBackground="neutral-weak">Ambiente</Text>
                    {feedback.metadata?.display && (
                      <Row gap="xs" vertical="center">
                        <Icon name="monitor" size="xs" />
                        <Text variant="body-default-xs">
                          Tela: {feedback.metadata.display.screenW}×{feedback.metadata.display.screenH} ({feedback.metadata.display.dpr}x)
                          {feedback.metadata.display.touch ? ' • Touch' : ''}
                        </Text>
                      </Row>
                    )}
                    {feedback.metadata?.connection && feedback.metadata.connection.effectiveType && (
                      <Row gap="xs" vertical="center">
                        <Icon name="openLink" size="xs" />
                        <Text variant="body-default-xs">
                          Rede: {feedback.metadata.connection.effectiveType.toUpperCase()}
                          {feedback.metadata.connection.downlink ? ` • ${feedback.metadata.connection.downlink}Mbps` : ''}
                          {feedback.metadata.connection.rtt ? ` • ${feedback.metadata.connection.rtt}ms RTT` : ''}
                        </Text>
                      </Row>
                    )}
                    {feedback.metadata?.geo && (
                      <Row gap="xs" vertical="center">
                        <Icon name="globe" size="xs" />
                        <Text variant="body-default-xs">
                          {feedback.metadata.geo.tz} • {feedback.metadata.geo.lang}
                        </Text>
                      </Row>
                    )}
                  </Column>
                )}
              </Column>
            </Card>

            {/* Click Breadcrumbs (separate card, collapsible) */}
            {feedback.metadata?.clickBreadcrumbs && feedback.metadata.clickBreadcrumbs.length > 0 && (
              <Card padding="0" radius="l" border="neutral-medium">
                <details>
                  <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', cursor: 'pointer' }}>
                    <Text variant="label-default-s">
                      Breadcrumbs ({feedback.metadata.clickBreadcrumbs.length} cliques)
                    </Text>
                  </summary>
                  <div style={{ maxHeight: '300px', overflowY: 'auto', borderTop: '1px solid var(--neutral-border-medium)' }}>
                    {feedback.metadata.clickBreadcrumbs.map((bc, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.4rem 1rem', borderTop: i > 0 ? '1px solid var(--neutral-border-medium)' : 'none' }}>
                        <Text variant="body-default-xs" onBackground="neutral-weak" style={{ whiteSpace: 'nowrap', minWidth: '1.5rem' }}>
                          {i + 1}.
                        </Text>
                        <Text variant="body-default-xs" style={{ fontFamily: 'var(--font-code)' }}>
                          &lt;{bc.tag.toLowerCase()}&gt;{bc.text ? ` "${bc.text}"` : ''}
                        </Text>
                      </div>
                    ))}
                  </div>
                </details>
              </Card>
            )}
          </Column>
        </Row>
      </Flex>
      </Column>
    </AppLayout>
  )
}
