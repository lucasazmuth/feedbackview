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
  Card,
  Flex,
  Button,
  IconButton,
  Textarea,
  Spinner,
  Feedback as FeedbackAlert,
} from '@once-ui-system/core'
import { getTagVariant, getTypeLabel, getStatusLabel, getSeverityLabel, parseUserAgent } from '../utils/labels'
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

export default function FeedbackDetailModal({ isOpen, onClose, feedbackId }: FeedbackDetailModalProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackDetail | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackStatusSaving, setFeedbackStatusSaving] = useState(false)
  const [feedbackEditingComment, setFeedbackEditingComment] = useState(false)
  const [feedbackCommentDraft, setFeedbackCommentDraft] = useState('')
  const [feedbackCommentSaving, setFeedbackCommentSaving] = useState(false)
  const [feedbackNetworkOpen, setFeedbackNetworkOpen] = useState(false)
  const [feedbackConsoleOpen, setFeedbackConsoleOpen] = useState(false)

  useEffect(() => {
    if (!isOpen || !feedbackId) {
      setSelectedFeedback(null)
      return
    }
    let cancelled = false
    setFeedbackLoading(true)
    setSelectedFeedback(null)
    setFeedbackEditingComment(false)
    setFeedbackNetworkOpen(false)
    setFeedbackConsoleOpen(false)
    ;(async () => {
      try {
        const res = await fetch(`/api/feedbacks/${feedbackId}`)
        if (res.ok && !cancelled) setSelectedFeedback(await res.json())
      } catch {}
      if (!cancelled) setFeedbackLoading(false)
    })()
    return () => { cancelled = true }
  }, [isOpen, feedbackId])

  const handleFeedbackStatusChange = useCallback(async (newStatus: string) => {
    if (!selectedFeedback) return
    setFeedbackStatusSaving(true)
    try {
      await api.feedbacks.updateStatus(selectedFeedback.id, newStatus)
      setSelectedFeedback(prev => prev ? { ...prev, status: newStatus } : null)
    } catch {}
    setFeedbackStatusSaving(false)
  }, [selectedFeedback])

  const handleFeedbackCommentSave = useCallback(async () => {
    if (!selectedFeedback) return
    setFeedbackCommentSaving(true)
    try {
      await api.feedbacks.updateComment(selectedFeedback.id, feedbackCommentDraft)
      setSelectedFeedback(prev => prev ? { ...prev, comment: feedbackCommentDraft } : null)
      setFeedbackEditingComment(false)
    } catch {}
    setFeedbackCommentSaving(false)
  }, [selectedFeedback, feedbackCommentDraft])

  if (!isOpen) return null

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '3vh', overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '64rem', maxHeight: '94vh', overflowY: 'auto', background: 'var(--page-background)', borderRadius: '1rem', border: '1px solid var(--neutral-border-medium)', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', margin: '0 1rem 2rem' }}>
        {feedbackLoading ? (
          <Flex fillWidth style={{ minHeight: '20rem' }} horizontal="center" vertical="center">
            <Column horizontal="center" gap="m"><Spinner size="m" /><Text variant="body-default-s" onBackground="neutral-weak">Carregando report...</Text></Column>
          </Flex>
        ) : selectedFeedback ? (
          <>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem', borderBottom: '1px solid var(--neutral-border-medium)', position: 'sticky', top: 0, background: 'var(--surface-background)', zIndex: 1, borderRadius: '1rem 1rem 0 0' }}>
              <Tag variant={getTagVariant(selectedFeedback.type)} size="s" label={getTypeLabel(selectedFeedback.type)} />
              {selectedFeedback.Project?.name && <Text variant="body-default-xs" onBackground="neutral-weak">{selectedFeedback.Project.name}</Text>}
              <Text variant="body-default-s" onBackground="neutral-strong" style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {selectedFeedback.title || selectedFeedback.comment?.slice(0, 80) || 'Report'}
              </Text>
              <IconButton icon="close" variant="tertiary" size="s" tooltip="Fechar" onClick={onClose} />
            </div>

            {/* Modal content */}
            <div style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              {/* Left column */}
              <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {selectedFeedback.metadata?.rrwebEvents && selectedFeedback.metadata.rrwebEvents.length > 0 && selectedFeedback.metadata?.source !== 'embed' && (
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
                {selectedFeedback.metadata?.rrwebEvents && selectedFeedback.metadata.rrwebEvents.length > 0 && selectedFeedback.metadata?.source === 'embed' && (
                  <Card fillWidth radius="l" style={{ overflow: 'hidden', padding: 0 }}><SessionReplay events={selectedFeedback.metadata.rrwebEvents} /></Card>
                )}
                {selectedFeedback.screenshotUrl && (
                  <Card fillWidth padding="l" radius="l"><Column gap="s"><Heading variant="heading-strong-s">Screenshot</Heading><img src={selectedFeedback.screenshotUrl} alt="Screenshot" style={{ width: '100%', borderRadius: '0.5rem', border: '1px solid var(--neutral-border-medium)' }} /></Column></Card>
                )}
                <Card fillWidth padding="l" radius="l">
                  <Column gap="s">
                    <Row fillWidth horizontal="between" vertical="center">
                      <Heading variant="heading-strong-s">Descrição</Heading>
                      {!feedbackEditingComment && <IconButton icon="edit" variant="tertiary" size="s" tooltip="Editar" onClick={() => { setFeedbackCommentDraft(selectedFeedback.comment); setFeedbackEditingComment(true) }} />}
                    </Row>
                    {feedbackEditingComment ? (
                      <Column gap="s">
                        <Textarea id="modal-comment-edit" label="Descrição" value={feedbackCommentDraft} lines={4} resize="vertical" onChange={(e) => setFeedbackCommentDraft(e.target.value)} disabled={feedbackCommentSaving} />
                        <Row gap="s" horizontal="end">
                          <Button variant="secondary" size="s" label="Cancelar" onClick={() => setFeedbackEditingComment(false)} disabled={feedbackCommentSaving} />
                          <Button variant="primary" size="s" label="Salvar" onClick={handleFeedbackCommentSave} loading={feedbackCommentSaving} />
                        </Row>
                      </Column>
                    ) : <Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{selectedFeedback.comment}</Text>}
                  </Column>
                </Card>
                {(selectedFeedback.metadata?.stepsToReproduce || selectedFeedback.metadata?.expectedResult || selectedFeedback.metadata?.actualResult) && (
                  <Card fillWidth padding="l" radius="l"><Column gap="m">
                    {selectedFeedback.metadata?.stepsToReproduce && <Column gap="xs"><Heading variant="heading-strong-s">Passos para reproduzir</Heading><Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{selectedFeedback.metadata.stepsToReproduce}</Text></Column>}
                    {selectedFeedback.metadata?.expectedResult && <Column gap="xs"><Heading variant="heading-strong-s">Resultado esperado</Heading><Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{selectedFeedback.metadata.expectedResult}</Text></Column>}
                    {selectedFeedback.metadata?.actualResult && <Column gap="xs"><Heading variant="heading-strong-s">Resultado real</Heading><Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>{selectedFeedback.metadata.actualResult}</Text></Column>}
                  </Column></Card>
                )}
                {(selectedFeedback.networkLogs?.length ?? 0) > 0 && (
                  <Card fillWidth padding="0" radius="l" style={{ overflow: 'hidden' }}><Column fillWidth>
                    <div onClick={() => setFeedbackNetworkOpen(!feedbackNetworkOpen)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', cursor: 'pointer' }}>
                      <Heading variant="heading-strong-s">Network Logs ({selectedFeedback.networkLogs!.length})</Heading>
                      <Icon name="chevronDown" size="xs" style={{ transform: feedbackNetworkOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                    </div>
                    {feedbackNetworkOpen && <div style={{ maxHeight: '20rem', overflowY: 'auto' }}>{selectedFeedback.networkLogs!.map((log, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderTop: '1px solid var(--neutral-border-medium)' }}>
                        <Tag variant={log.status && log.status >= 400 ? 'danger' : 'success'} size="s" label={String(log.status ?? '-')} />
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>{log.method}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={log.url}>{log.url}</span>
                        {log.duration != null && <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', flexShrink: 0 }}>{log.duration}ms</span>}
                      </div>
                    ))}</div>}
                  </Column></Card>
                )}
                {(selectedFeedback.consoleLogs?.length ?? 0) > 0 && (
                  <Card fillWidth padding="0" radius="l" style={{ overflow: 'hidden' }}><Column fillWidth>
                    <div onClick={() => setFeedbackConsoleOpen(!feedbackConsoleOpen)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', cursor: 'pointer' }}>
                      <Heading variant="heading-strong-s">Console Logs ({selectedFeedback.consoleLogs!.length})</Heading>
                      <Icon name="chevronDown" size="xs" style={{ transform: feedbackConsoleOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                    </div>
                    {feedbackConsoleOpen && <div style={{ maxHeight: '20rem', overflowY: 'auto' }}>{selectedFeedback.consoleLogs!.map((log, i) => {
                      const level = log.level?.toUpperCase() ?? 'LOG'
                      const variant = level === 'ERROR' ? 'danger' : level === 'WARN' ? 'warning' : 'info'
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem 1rem', borderTop: '1px solid var(--neutral-border-medium)' }}>
                          <Tag variant={variant as any} size="s" label={level} style={{ flexShrink: 0 }} />
                          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', wordBreak: 'break-word', flex: 1 }}>{log.message}</span>
                        </div>
                      )
                    })}</div>}
                  </Column></Card>
                )}
              </div>

              {/* Right sidebar */}
              <div style={{ flex: 1, minWidth: '14rem', maxWidth: '18rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '4.5rem' }}>
                <Card fillWidth padding="l" radius="l"><Column gap="m">
                  <Heading variant="heading-strong-s">Status</Heading>
                  <Row gap="xs" wrap>
                    {[
                      { value: 'OPEN', label: 'Aberto' },
                      { value: 'IN_PROGRESS', label: 'Em andamento' },
                      { value: 'UNDER_REVIEW', label: 'Sob revisão' },
                      { value: 'RESOLVED', label: 'Concluída' },
                      { value: 'CANCELLED', label: 'Cancelado' },
                    ].map((opt) => (
                      <Tag key={opt.value} variant={selectedFeedback.status === opt.value ? getTagVariant(opt.value) : 'neutral'} size="s" label={opt.label}
                        onClick={() => handleFeedbackStatusChange(opt.value)}
                        style={{ cursor: feedbackStatusSaving ? 'wait' : 'pointer', opacity: selectedFeedback.status === opt.value ? 1 : 0.6, transition: 'opacity 0.15s' }} />
                    ))}
                  </Row>
                  {feedbackStatusSaving && <Row gap="xs" vertical="center"><Spinner size="s" /><Text variant="body-default-xs" onBackground="neutral-weak">Salvando...</Text></Row>}
                </Column></Card>
                <Card fillWidth padding="l" radius="l"><Column gap="m">
                  <Heading variant="heading-strong-s">Detalhes</Heading>
                  <Column gap="xs">
                    <Text variant="label-default-s" onBackground="neutral-weak">Tipo e Severidade</Text>
                    <Row gap="xs" wrap>
                      <Tag variant={getTagVariant(selectedFeedback.type)} size="m" label={getTypeLabel(selectedFeedback.type)} />
                      {selectedFeedback.severity && <Tag variant={getTagVariant(selectedFeedback.severity)} size="m" label={getSeverityLabel(selectedFeedback.severity)} />}
                    </Row>
                  </Column>
                  {selectedFeedback.metadata?.source && (
                    <Column gap="xs"><Text variant="label-default-s" onBackground="neutral-weak">Origem</Text>
                      <Tag variant={selectedFeedback.metadata.source === 'shared-url' ? 'info' : 'brand'} size="s" label={selectedFeedback.metadata.source === 'shared-url' ? 'URL compartilhada' : 'Script embed'} />
                    </Column>
                  )}
                  {selectedFeedback.pageUrl && (
                    <Column gap="xs"><Text variant="label-default-s" onBackground="neutral-weak">Página</Text>
                      <a href={selectedFeedback.pageUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', wordBreak: 'break-all', color: 'var(--brand-on-background-strong)', textDecoration: 'underline', textUnderlineOffset: '2px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {selectedFeedback.pageUrl}<Icon name="openLink" size="xs" style={{ flexShrink: 0 }} />
                      </a>
                    </Column>
                  )}
                  <Column gap="xs"><Text variant="label-default-s" onBackground="neutral-weak">Data</Text>
                    <Row gap="xs" vertical="center"><Icon name="clock" size="xs" /><Text variant="body-default-xs">{new Date(selectedFeedback.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text></Row>
                  </Column>
                  {selectedFeedback.userAgent && (() => { const { os, browser } = parseUserAgent(selectedFeedback.userAgent); return (<Column gap="xs"><Text variant="label-default-s" onBackground="neutral-weak">Navegador</Text><Row gap="xs" vertical="center"><Icon name="monitor" size="xs" /><Text variant="body-default-xs">{os} • {browser}</Text></Row>{selectedFeedback.metadata?.viewport && (<Row gap="xs" vertical="center"><Icon name="viewport" size="xs" /><Text variant="body-default-xs">Viewport: {selectedFeedback.metadata.viewport}</Text></Row>)}</Column>) })()}
                  {(() => {
                    const consoleLogs = selectedFeedback.consoleLogs || []
                    const errorCount = consoleLogs.filter((l: any) => l.level === 'error').length
                    const warnCount = consoleLogs.filter((l: any) => l.level === 'warn' || l.level === 'warning').length
                    const networkLogs = selectedFeedback.networkLogs || []
                    const failedRequests = networkLogs.filter((l: any) => l.status && l.status >= 400).length
                    return (
                      <Column gap="xs"><Text variant="label-default-s" onBackground="neutral-weak">Eventos Capturados</Text><Column gap="xs">
                        <Row gap="xs" vertical="center"><Icon name="monitor" size="xs" /><Text variant="body-default-xs">{selectedFeedback.metadata?.rrwebEvents?.length ?? 0} eventos de sessão</Text></Row>
                        <Row gap="xs" vertical="center"><Icon name="message" size="xs" /><Text variant="body-default-xs">{consoleLogs.length} console logs{errorCount > 0 && <span style={{ color: 'var(--danger-solid-strong)' }}> ({errorCount} {errorCount === 1 ? 'erro' : 'erros'})</span>}{warnCount > 0 && <span style={{ color: 'var(--warning-solid-strong)' }}> ({warnCount} {warnCount === 1 ? 'aviso' : 'avisos'})</span>}</Text></Row>
                        <Row gap="xs" vertical="center"><Icon name="openLink" size="xs" /><Text variant="body-default-xs">{networkLogs.length} requisições de rede{failedRequests > 0 && <span style={{ color: 'var(--danger-solid-strong)' }}> ({failedRequests} {failedRequests === 1 ? 'falha' : 'falhas'})</span>}</Text></Row>
                      </Column></Column>
                    )
                  })()}
                </Column></Card>
              </div>
            </div>
          </>
        ) : (
          <Flex fillWidth style={{ minHeight: '20rem' }} horizontal="center" vertical="center"><FeedbackAlert variant="danger">Não foi possível carregar o report.</FeedbackAlert></Flex>
        )}
      </div>
    </div>
  )
}
