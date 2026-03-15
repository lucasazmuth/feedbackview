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
  metadata?: { rrwebEvents?: any[]; stepsToReproduce?: string; expectedResult?: string; actualResult?: string } | null
  Project?: { ownerId: string; name: string } | null
}

interface FeedbackClientProps {
  feedback: Feedback | null
  error: string | null
}

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Aberto' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'RESOLVED', label: 'Resolvido' },
  { value: 'CLOSED', label: 'Fechado' },
]

function getTypeLabel(type: string) {
  const map: Record<string, string> = { BUG: 'Bug', SUGGESTION: 'Sugestão', QUESTION: 'Dúvida', PRAISE: 'Elogio' }
  return map[type] || type
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = { OPEN: 'Aberto', IN_PROGRESS: 'Em andamento', RESOLVED: 'Resolvido', CLOSED: 'Fechado' }
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

function getStatusTagVariant(status: string): 'warning' | 'info' | 'success' | 'neutral' {
  switch (status) {
    case 'OPEN': return 'warning'
    case 'IN_PROGRESS': return 'info'
    case 'RESOLVED': return 'success'
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

export default function FeedbackClient({
  feedback,
  error,
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
          maxWidth={72}
          gap="l"
          style={{ alignItems: 'flex-start' }}
        >
          {/* Left column */}
          <Column gap="l" fillWidth style={{ flex: 2, minWidth: 0 }}>
            {/* Session Replay */}
            {feedback.metadata?.rrwebEvents && feedback.metadata.rrwebEvents.length > 0 && (
              <Card fillWidth radius="l" style={{ overflow: 'hidden', padding: 0 }}>
                <SessionReplay events={feedback.metadata.rrwebEvents} />
              </Card>
            )}

            {/* Screenshot (if no replay) */}
            {feedback.screenshotUrl && !(feedback.metadata?.rrwebEvents && feedback.metadata.rrwebEvents.length > 0) && (
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

            {/* Metadata */}
            <Card fillWidth padding="l" radius="l">
              <Column gap="m">
                <Heading variant="heading-strong-s">Detalhes</Heading>

                {/* Screenshot in sidebar (when replay exists, show thumb here) */}
                {feedback.screenshotUrl && feedback.metadata?.rrwebEvents && feedback.metadata.rrwebEvents.length > 0 && (
                  <img
                    src={feedback.screenshotUrl}
                    alt="Screenshot"
                    style={{ width: '100%', borderRadius: '0.5rem', border: '1px solid var(--neutral-border-medium)' }}
                  />
                )}

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

                {/* User Agent */}
                {feedback.userAgent && (
                  <Column gap="xs">
                    <Text variant="label-default-s" onBackground="neutral-weak">Navegador</Text>
                    <Text variant="body-default-xs" style={{ wordBreak: 'break-all' }}>{feedback.userAgent}</Text>
                  </Column>
                )}

                {/* Captured Events Summary */}
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
                      </Text>
                    </Row>
                    <Row gap="xs" vertical="center">
                      <Icon name="openLink" size="xs" />
                      <Text variant="body-default-xs">
                        {networkLogs.length} requisição{networkLogs.length !== 1 ? 'ões' : ''} de rede
                      </Text>
                    </Row>
                  </Column>
                </Column>
              </Column>
            </Card>
          </Column>
        </Row>
      </Flex>
      </Column>
    </AppLayout>
  )
}
