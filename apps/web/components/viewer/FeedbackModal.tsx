'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, ChevronDown, Loader2, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'

// Trim rrweb events but always preserve the most recent full snapshot (type 2)
function trimRrwebForSubmit(events: RRWebEvent[], max: number): RRWebEvent[] {
  if (events.length <= max) return events
  let lastSnapshotIdx = -1
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === 2) {
      lastSnapshotIdx = i
      break
    }
  }
  if (lastSnapshotIdx > 0) {
    return events.slice(lastSnapshotIdx)
  }
  return events.slice(-max)
}

interface ConsoleLog {
  level: string
  message: string
  timestamp?: number
}

interface NetworkLog {
  method: string
  url: string
  status?: number
  duration?: number
}

interface RRWebEvent {
  type: number
  data: any
  timestamp: number
}

interface FeedbackModalProps {
  projectId: string
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  consoleLogs: ConsoleLog[]
  networkLogs: NetworkLog[]
  rrwebEvents: RRWebEvent[]
  screenshotFromTracker?: string | null
  pageUrl?: string | null
  widgetColor?: string
  panelSide?: 'left' | 'right'
  onClose: () => void
}

type DrawMode = 'rect' | 'arrow' | null

interface DrawRect {
  x: number
  y: number
  w: number
  h: number
}

export default function FeedbackModal({
  projectId,
  iframeRef,
  consoleLogs,
  networkLogs,
  rrwebEvents,
  screenshotFromTracker,
  pageUrl: pageUrlProp,
  widgetColor = '#4f46e5',
  panelSide = 'right',
  onClose,
}: FeedbackModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(true)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [type, setType] = useState('BUG')
  const [severity, setSeverity] = useState('MEDIUM')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [networkLogsOpen, setNetworkLogsOpen] = useState(false)
  const [consoleLogsOpen, setConsoleLogsOpen] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<{ name: string; type: string; data: string }[]>([])

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null)
  const [rects, setRects] = useState<DrawRect[]>([])

  // Use screenshot captured by tracker inside the iframe (cross-origin safe)
  useEffect(() => {
    if (screenshotFromTracker) {
      setScreenshotDataUrl(screenshotFromTracker)
      setCapturing(false)
    } else {
      // Wait a bit for the tracker to respond
      const timeout = setTimeout(() => setCapturing(false), 3000)
      return () => clearTimeout(timeout)
    }
  }, [screenshotFromTracker])

  // Draw image on canvas when screenshot is ready
  useEffect(() => {
    if (!screenshotDataUrl || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)
      // Also set overlay canvas size
      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.width = img.naturalWidth
        overlayCanvasRef.current.height = img.naturalHeight
      }
    }
    img.src = screenshotDataUrl
  }, [screenshotDataUrl])

  // Redraw overlay rects
  const redrawOverlay = useCallback(
    (currentRects: DrawRect[], currentRect?: DrawRect) => {
      const canvas = overlayCanvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 3
      ctx.fillStyle = 'rgba(239, 68, 68, 0.1)'
      ;[...currentRects, ...(currentRect ? [currentRect] : [])].forEach((r) => {
        ctx.fillRect(r.x, r.y, r.w, r.h)
        ctx.strokeRect(r.x, r.y, r.w, r.h)
      })
    },
    []
  )

  function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = overlayCanvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const pos = getCanvasPos(e)
    setIsDrawing(true)
    setStartPos(pos)
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing || !startPos) return
    const pos = getCanvasPos(e)
    const currentRect: DrawRect = {
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y),
    }
    redrawOverlay(rects, currentRect)
  }

  function handleMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing || !startPos) return
    const pos = getCanvasPos(e)
    const newRect: DrawRect = {
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y),
    }
    if (newRect.w > 5 && newRect.h > 5) {
      const updated = [...rects, newRect]
      setRects(updated)
      redrawOverlay(updated)
    }
    setIsDrawing(false)
    setStartPos(null)
  }

  function getFinalScreenshot(): string | null {
    const baseCanvas = canvasRef.current
    const overlayCanvas = overlayCanvasRef.current
    if (!baseCanvas) return screenshotDataUrl

    const merged = document.createElement('canvas')
    merged.width = baseCanvas.width
    merged.height = baseCanvas.height
    const ctx = merged.getContext('2d')
    if (!ctx) return screenshotDataUrl
    ctx.drawImage(baseCanvas, 0, 0)
    if (overlayCanvas) ctx.drawImage(overlayCanvas, 0, 0)
    return merged.toDataURL('image/jpeg', 0.85)
  }

  async function handleSubmit() {
    setSubmitError(null)
    if (comment.trim().length < 10) {
      setCommentError('A descrição deve ter pelo menos 10 caracteres.')
      return
    }
    setCommentError(null)
    setSubmitting(true)

    try {
      const finalScreenshot = getFinalScreenshot()
      const payload: any = {
        projectId,
        type,
        title: title.trim() || undefined,
        comment: comment.trim(),
        consoleLogs,
        networkLogs,
        rrwebEvents: trimRrwebForSubmit(rrwebEvents, 200),
        attachments: attachments.length > 0 ? attachments : undefined,
      }
      if (type === 'BUG') payload.severity = severity
      if (finalScreenshot) payload.screenshotBase64 = finalScreenshot
      if (typeof window !== 'undefined') {
        payload.pageUrl = pageUrlProp || window.location.href
        payload.userAgent = navigator.userAgent
      }

      await api.feedbacks.submit(payload)
      setSubmitted(true)
      setTimeout(() => {
        onClose()
      }, 2500)
    } catch (err: any) {
      setSubmitError(err.message || 'Erro ao enviar feedback.')
    } finally {
      setSubmitting(false)
    }
  }

  // Shared styles matching embed CSS exactly
  const S = {
    font: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
    label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 } as React.CSSProperties,
    input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none', color: '#111827', fontFamily: 'inherit' } as React.CSSProperties,
    select: { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: 'white', outline: 'none', color: '#111827', cursor: 'pointer', fontFamily: 'inherit' } as React.CSSProperties,
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.4)', ...S.font }}
        onClick={onClose}
      />

      {/* Slide-over panel — matching embed exactly */}
      <div
        className="fixed top-0 h-full flex flex-col"
        style={{
          ...S.font,
          [panelSide === 'left' ? 'left' : 'right']: 0,
          width: 520,
          maxWidth: '100vw',
          background: '#fff',
          zIndex: 2147483647,
          boxShadow: `${panelSide === 'left' ? '4px' : '-4px'} 0 24px rgba(0,0,0,0.15)`,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>Reportar</h2>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {submitted ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 style={{ width: 28, height: 28, color: '#16a34a' }} />
            </div>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>Feedback enviado!</p>
            <p style={{ fontSize: 14, color: '#6b7280' }}>Obrigado pela contribuição.</p>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Screenshot section */}
            <div style={{ padding: 20, borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 12 }}>
                Screenshot{' '}
                <span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af' }}>
                  (arraste para destacar áreas)
                </span>
              </div>

              {capturing ? (
                <div style={{ height: 192, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#f3f4f6', borderRadius: 12, border: '1px solid #e5e7eb' }}>
                  <Loader2 style={{ width: 20, height: 20, color: '#9ca3af' }} className="animate-spin" />
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>Capturando screenshot...</span>
                </div>
              ) : (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#f3f4f6' }}>
                  {screenshotDataUrl ? (
                    <>
                      <canvas
                        ref={canvasRef}
                        style={{ width: '100%', display: 'block' }}
                      />
                      <canvas
                        ref={overlayCanvasRef}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'crosshair' }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                      />
                    </>
                  ) : (
                    <div style={{ height: 192, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 13, color: '#9ca3af' }}>Screenshot não disponível</span>
                    </div>
                  )}
                </div>
              )}
              {rects.length > 0 && (
                <button
                  onClick={() => { setRects([]); redrawOverlay([]) }}
                  style={{ marginTop: 8, background: 'none', border: 'none', fontSize: 12, color: '#ef4444', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                >
                  Limpar marcações ({rects.length})
                </button>
              )}
            </div>

            {/* Form fields */}
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Title */}
              <div>
                <label style={S.label}>Título</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Resumo breve do feedback"
                  style={S.input}
                  onFocus={(e) => { e.target.style.borderColor = widgetColor; e.target.style.boxShadow = `0 0 0 3px ${widgetColor}1a` }}
                  onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none' }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={S.label}>
                  Descrição <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="Descreva o problema ou sugestão em detalhes... (mínimo 10 caracteres)"
                  style={{ ...S.input, resize: 'none' as const }}
                  onFocus={(e) => { e.target.style.borderColor = widgetColor; e.target.style.boxShadow = `0 0 0 3px ${widgetColor}1a` }}
                  onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none' }}
                />
                {commentError && (
                  <p style={{ marginTop: 4, fontSize: 12, color: '#dc2626' }}>{commentError}</p>
                )}
              </div>

              {/* Type */}
              <div>
                <label style={S.label}>Tipo</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([['BUG', '🐛 Bug'], ['SUGGESTION', '💡 Sugestão'], ['QUESTION', '❓ Dúvida'], ['PRAISE', '👏 Elogio']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setType(val)}
                      style={{
                        flex: 1,
                        padding: '8px 4px',
                        borderRadius: 8,
                        border: type === val ? `2px solid ${widgetColor}` : '1px solid #d1d5db',
                        background: type === val ? `${widgetColor}0d` : '#fff',
                        color: type === val ? widgetColor : '#374151',
                        fontSize: 12,
                        fontWeight: type === val ? 600 : 400,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority (only for bugs) */}
              {type === 'BUG' && (
                <div>
                  <label style={S.label}>Prioridade</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {([['LOW', 'Baixa', '#22c55e'], ['MEDIUM', 'Média', '#f59e0b'], ['HIGH', 'Alta', '#f97316'], ['CRITICAL', 'Crítica', '#ef4444']] as const).map(([val, label, color]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSeverity(val)}
                        style={{
                          flex: 1,
                          padding: '8px 4px',
                          borderRadius: 8,
                          border: severity === val ? `2px solid ${color}` : '1px solid #d1d5db',
                          background: severity === val ? `${color}15` : '#fff',
                          color: severity === val ? color : '#374151',
                          fontSize: 12,
                          fontWeight: severity === val ? 600 : 400,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'all 0.15s',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              <div>
                <label style={S.label}>Anexos</label>
                <div
                  style={{ border: '2px dashed #d1d5db', borderRadius: 8, padding: '12px 16px', textAlign: 'center' as const, cursor: 'pointer', background: '#f9fafb', transition: 'border-color 0.2s' }}
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.multiple = true
                    input.accept = 'image/*,.pdf,.txt,.log,.json,.csv'
                    input.onchange = () => {
                      if (!input.files) return
                      const files = Array.from(input.files).slice(0, 5 - attachments.length)
                      files.forEach((file) => {
                        const reader = new FileReader()
                        reader.onload = () => {
                          setAttachments((prev) => {
                            if (prev.length >= 5) return prev
                            return [...prev, { name: file.name, type: file.type, data: reader.result as string }]
                          })
                        }
                        reader.readAsDataURL(file)
                      })
                    }
                    input.click()
                  }}
                >
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    Clique para anexar arquivos (máx. 5)
                  </span>
                </div>
                {attachments.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {attachments.map((att, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: '#f3f4f6', borderRadius: 6, fontSize: 12 }}>
                        <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flex: 1, minWidth: 0 }}>{att.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setAttachments((prev) => prev.filter((_, idx) => idx !== i)) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '0 4px', fontSize: 14, lineHeight: 1 }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Network Logs */}
              {networkLogs.length > 0 && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                  <button
                    onClick={() => setNetworkLogsOpen(!networkLogsOpen)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f9fafb', cursor: 'pointer', border: 'none', textAlign: 'left' as const, fontFamily: 'inherit' }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
                      Network Logs ({networkLogs.length})
                    </span>
                    <ChevronDown style={{ width: 16, height: 16, color: '#9ca3af', transition: 'transform 0.2s', transform: networkLogsOpen ? 'rotate(180deg)' : 'none' }} />
                  </button>
                  {networkLogsOpen && (
                    <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                      {networkLogs.map((log, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderTop: '1px solid #f3f4f6' }}>
                          <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, lineHeight: '16px', background: log.status && log.status >= 400 ? '#fee2e2' : '#dcfce7', color: log.status && log.status >= 400 ? '#b91c1c' : '#15803d' }}>
                            {log.status ?? '-'}
                          </span>
                          <span style={{ flexShrink: 0, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#374151' }}>{log.method}</span>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flex: 1, minWidth: 0 }} title={log.url}>{log.url}</span>
                          {log.duration != null && (
                            <span style={{ flexShrink: 0, fontFamily: 'monospace', fontSize: 11, color: '#9ca3af' }}>{log.duration}ms</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Console Logs */}
              {consoleLogs.length > 0 && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                  <button
                    onClick={() => setConsoleLogsOpen(!consoleLogsOpen)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f9fafb', cursor: 'pointer', border: 'none', textAlign: 'left' as const, fontFamily: 'inherit' }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
                      Console Logs ({consoleLogs.length})
                    </span>
                    <ChevronDown style={{ width: 16, height: 16, color: '#9ca3af', transition: 'transform 0.2s', transform: consoleLogsOpen ? 'rotate(180deg)' : 'none' }} />
                  </button>
                  {consoleLogsOpen && (
                    <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                      {consoleLogs.map((log, i) => {
                        const level = log.level?.toUpperCase() ?? 'LOG'
                        const tagBg = level === 'ERROR' ? '#fee2e2' : level === 'WARN' ? '#fef9c3' : '#dbeafe'
                        const tagColor = level === 'ERROR' ? '#b91c1c' : level === 'WARN' ? '#a16207' : '#1d4ed8'
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '5px 14px', borderTop: '1px solid #f3f4f6' }}>
                            <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, lineHeight: '16px', background: tagBg, color: tagColor }}>
                              {level}
                            </span>
                            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280', wordBreak: 'break-word' as const, flex: 1, minWidth: 0 }}>{log.message}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Session replay events summary */}
              {rrwebEvents.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6b7280', padding: '10px 14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, lineHeight: '16px', background: '#e0e7ff', color: '#4338ca' }}>{rrwebEvents.length}</span>
                  eventos de session replay capturados
                </div>
              )}

              {/* Submit error */}
              {submitError && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
                  {submitError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {!submitted && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb' }}>
            <button
              onClick={handleSubmit}
              disabled={submitting || capturing}
              style={{ width: '100%', padding: '10px 16px', background: widgetColor, color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: submitting || capturing ? 'not-allowed' : 'pointer', opacity: submitting || capturing ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}
            >
              {submitting ? (
                <>
                  <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar ' + (type === 'BUG' ? 'Bug' : type === 'SUGGESTION' ? 'Sugestão' : type === 'QUESTION' ? 'Dúvida' : 'Elogio')
              )}
            </button>
            <p style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#9ca3af' }}>
              Powered by{' '}
              <a href="https://feedbackview.com" target="_blank" rel="noopener noreferrer" style={{ color: '#6b7280', textDecoration: 'none' }}>
                QBugs
              </a>
            </p>
          </div>
        )}
      </div>
    </>
  )
}
