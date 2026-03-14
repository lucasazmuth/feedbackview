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
  onClose,
}: FeedbackModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(true)
  const [comment, setComment] = useState('')
  const [type, setType] = useState('BUG')
  const [severity, setSeverity] = useState('MEDIUM')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [networkLogsOpen, setNetworkLogsOpen] = useState(false)
  const [consoleLogsOpen, setConsoleLogsOpen] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)

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
      setCommentError('O comentário deve ter pelo menos 10 caracteres.')
      return
    }
    setCommentError(null)
    setSubmitting(true)

    try {
      const finalScreenshot = getFinalScreenshot()
      const payload: any = {
        projectId,
        type,
        comment: comment.trim(),
        consoleLogs,
        networkLogs,
        rrwebEvents: trimRrwebForSubmit(rrwebEvents, 200),
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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[520px] bg-white z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Enviar Feedback</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-3">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900">Feedback enviado!</p>
            <p className="text-sm text-gray-500">Obrigado pela contribuição.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Screenshot section */}
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Screenshot{' '}
                <span className="text-xs font-normal text-gray-400">
                  (arraste para destacar áreas)
                </span>
              </h3>

              {capturing ? (
                <div className="bg-gray-100 rounded-xl h-48 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  <span className="text-sm text-gray-400">Capturando screenshot...</span>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                  {screenshotDataUrl ? (
                    <>
                      <canvas
                        ref={canvasRef}
                        className="w-full"
                        style={{ display: 'block' }}
                      />
                      <canvas
                        ref={overlayCanvasRef}
                        className="absolute inset-0 w-full h-full cursor-crosshair"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                      />
                    </>
                  ) : (
                    <div className="h-32 flex items-center justify-center">
                      <p className="text-sm text-gray-400">Screenshot não disponível</p>
                    </div>
                  )}
                </div>
              )}
              {rects.length > 0 && (
                <button
                  onClick={() => {
                    setRects([])
                    redrawOverlay([])
                  }}
                  className="mt-2 text-xs text-red-500 hover:text-red-700"
                >
                  Limpar marcações ({rects.length})
                </button>
              )}
            </div>

            {/* Form fields */}
            <div className="p-5 space-y-4">
              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Comentário <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="Descreva o problema ou sugestão em detalhes... (mínimo 10 caracteres)"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                {commentError && (
                  <p className="mt-1 text-xs text-red-600">{commentError}</p>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="BUG">Bug</option>
                  <option value="SUGGESTION">Sugestão</option>
                  <option value="QUESTION">Dúvida</option>
                  <option value="PRAISE">Elogio</option>
                </select>
              </div>

              {/* Severity (only for bugs) */}
              {type === 'BUG' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Severidade</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                    <option value="CRITICAL">Crítica</option>
                  </select>
                </div>
              )}

              {/* Network Logs */}
              {networkLogs.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setNetworkLogsOpen(!networkLogsOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <span className="text-sm font-medium text-gray-700">
                      Network Logs ({networkLogs.length})
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${networkLogsOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {networkLogsOpen && (
                    <div className="max-h-48 overflow-y-auto">
                      {networkLogs.map((log, i) => (
                        <div key={i} className="flex items-center gap-2 px-4 py-1.5 border-t border-gray-100">
                          <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.status && log.status >= 400 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {log.status ?? '-'}
                          </span>
                          <span className="shrink-0 font-mono text-[11px] font-bold text-gray-700">{log.method}</span>
                          <span className="font-mono text-[11px] text-gray-500 truncate flex-1 min-w-0" title={log.url}>{log.url}</span>
                          {log.duration != null && (
                            <span className="shrink-0 font-mono text-[11px] text-gray-400">{log.duration}ms</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Console Logs */}
              {consoleLogs.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setConsoleLogsOpen(!consoleLogsOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <span className="text-sm font-medium text-gray-700">
                      Console Logs ({consoleLogs.length})
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${consoleLogsOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {consoleLogsOpen && (
                    <div className="max-h-48 overflow-y-auto">
                      {consoleLogs.map((log, i) => {
                        const level = log.level?.toUpperCase() ?? 'LOG'
                        const colors = level === 'ERROR' ? 'bg-red-100 text-red-700' : level === 'WARN' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                        return (
                          <div key={i} className="flex items-start gap-2 px-4 py-1.5 border-t border-gray-100">
                            <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${colors}`}>
                              {level}
                            </span>
                            <span className="font-mono text-[11px] text-gray-500 break-words flex-1 min-w-0">{log.message}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Session replay events summary */}
              {rrwebEvents.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">{rrwebEvents.length}</span>
                  <span className="text-xs text-gray-500">eventos de session replay capturados</span>
                </div>
              )}

              {/* Submit error */}
              {submitError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {submitError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {!submitted && (
          <div className="px-5 py-4 border-t border-gray-200">
            <button
              onClick={handleSubmit}
              disabled={submitting || capturing}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Feedback'
              )}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
