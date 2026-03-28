'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ChevronDown, Loader2, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import 'rrweb-player/dist/style.css'

// Trim rrweb events: keep Meta+Snapshot + most recent incremental events,
// then normalize timestamps to close any time gap (prevents frozen replay).
function trimRrwebForSubmit(events: RRWebEvent[], max: number): RRWebEvent[] {
  if (events.length <= max) return events

  let lastSnapshotIdx = -1
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === 2) { lastSnapshotIdx = i; break }
  }

  if (lastSnapshotIdx < 0) return events.slice(-max)

  let metaIdx = lastSnapshotIdx
  for (let i = lastSnapshotIdx - 1; i >= 0; i--) {
    if (events[i].type === 4) { metaIdx = i; break }
  }

  const headerEvents = events.slice(metaIdx, lastSnapshotIdx + 1)
  const tailEvents = events.slice(lastSnapshotIdx + 1)
  const maxTail = max - headerEvents.length
  const keptTail = tailEvents.length > maxTail ? tailEvents.slice(tailEvents.length - maxTail) : tailEvents

  const result = [
    ...headerEvents.map(e => ({ ...e })),
    ...keptTail.map(e => ({ ...e })),
  ]

  if (result.length > headerEvents.length) {
    const snapshotTs = result[headerEvents.length - 1].timestamp
    const firstTailTs = result[headerEvents.length].timestamp
    const gap = firstTailTs - snapshotTs
    if (gap > 2000) {
      const offset = gap - 100
      for (let i = headerEvents.length; i < result.length; i++) {
        result[i].timestamp -= offset
      }
    }
  }

  return result
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
  /** @deprecated Layout is sempre modal centralizado */
  panelSide?: 'left' | 'right'
  /** Texto da linha "Origem" na sidebar (ex.: Widget embed, URL compartilhada) */
  sourceLabel?: string
  onClose: () => void
}

interface DrawRect {
  x: number
  y: number
  w: number
  h: number
}

const TYPE_STYLES: Record<string, { dot: string; bg: string; fg: string; label: string }> = {
  BUG: { dot: '#dc2626', bg: '#fef2f2', fg: '#dc2626', label: 'Bug' },
  SUGGESTION: { dot: '#d97706', bg: '#fffbeb', fg: '#d97706', label: 'Sugestão' },
  QUESTION: { dot: '#2563eb', bg: '#eff6ff', fg: '#2563eb', label: 'Dúvida' },
  PRAISE: { dot: '#16a34a', bg: '#f0fdf4', fg: '#16a34a', label: 'Elogio' },
}

function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.625rem 0' }}>
      <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: '#6b7280', width: 72, flexShrink: 0, paddingTop: 2 }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

export default function FeedbackModal({
  projectId,
  iframeRef: _iframeRef,
  consoleLogs,
  networkLogs,
  rrwebEvents,
  screenshotFromTracker,
  pageUrl: pageUrlProp,
  widgetColor = '#4f46e5',
  panelSide: _panelSide = 'right',
  sourceLabel = 'App viewer',
  onClose,
}: FeedbackModalProps) {
  void _iframeRef
  void _panelSide

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const replayContainerRef = useRef<HTMLDivElement>(null)
  const replayPlayerRef = useRef<any>(null)
  const openedAtRef = useRef(new Date())

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
  const [replayPlaying, setReplayPlaying] = useState(false)
  const [replayCurrentTime, setReplayCurrentTime] = useState(0)
  const [replayTotalTime, setReplayTotalTime] = useState(0)
  const [replaySpeed, setReplaySpeed] = useState(1)
  const replayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [stepsToReproduce, setStepsToReproduce] = useState('')
  const [expectedResult, setExpectedResult] = useState('')
  const [actualResult, setActualResult] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)

  const hasReplay = rrwebEvents.some(e => e.type === 2) && rrwebEvents.length >= 2
  const [mediaTab, setMediaTab] = useState<'replay' | 'screenshot'>(() =>
    hasReplay ? 'replay' : 'screenshot'
  )

  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null)
  const [rects, setRects] = useState<DrawRect[]>([])

  useEffect(() => {
    if (screenshotFromTracker) {
      setScreenshotDataUrl(screenshotFromTracker)
      setCapturing(false)
    } else {
      const timeout = setTimeout(() => setCapturing(false), 3000)
      return () => clearTimeout(timeout)
    }
  }, [screenshotFromTracker])

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
      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.width = img.naturalWidth
        overlayCanvasRef.current.height = img.naturalHeight
      }
    }
    img.src = screenshotDataUrl
  }, [screenshotDataUrl])

  useEffect(() => {
    const container = replayContainerRef.current
    if (!container || rrwebEvents.length < 2) return
    const hasSnapshot = rrwebEvents.some(e => e.type === 2)
    if (!hasSnapshot) return

    let player: any = null
    ;(async () => {
      try {
        const { default: rrwebPlayer } = await import('rrweb-player')
        container.innerHTML = ''
        const containerWidth = container.offsetWidth || 440
        const playerHeight = Math.round(containerWidth * 0.56)
        player = new rrwebPlayer({
          target: container,
          props: {
            events: rrwebEvents as any,
            width: containerWidth,
            height: playerHeight,
            autoPlay: false,
            showController: false,
            speedOption: [1, 2, 4, 8],
            skipInactive: true,
          },
        })
        player.goto(0)
        replayPlayerRef.current = player
        const meta = player.getMetaData()
        setReplayTotalTime(meta.totalTime)
      } catch (err) {
        console.warn('Failed to load rrweb-player:', err)
      }
    })()

    return () => {
      if (player && typeof player.$destroy === 'function') {
        player.$destroy()
      }
      replayPlayerRef.current = null
    }
  }, [rrwebEvents])

  useEffect(() => {
    if (replayPlaying) {
      replayTimerRef.current = setInterval(() => {
        const p = replayPlayerRef.current
        if (!p) return
        try {
          const current = p.getCurrentTime()
          const meta = p.getMetaData()
          setReplayCurrentTime(current)
          if (current >= meta.totalTime) {
            setReplayPlaying(false)
            p.pause()
          }
        } catch {}
      }, 100)
    }
    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current)
    }
  }, [replayPlaying])

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

  useEffect(() => {
    if (mediaTab === 'screenshot' && overlayCanvasRef.current && screenshotDataUrl) {
      redrawOverlay(rects)
    }
  }, [mediaTab, rects, screenshotDataUrl, redrawOverlay])

  function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null {
    const canvas = overlayCanvasRef.current
    if (!canvas) return null
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
    if (!pos) return
    setIsDrawing(true)
    setStartPos(pos)
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing || !startPos) return
    const pos = getCanvasPos(e)
    if (!pos) return
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
    if (!pos) return
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
      const metadata: Record<string, string> = {}
      if (stepsToReproduce.trim()) metadata.stepsToReproduce = stepsToReproduce.trim()
      if (expectedResult.trim()) metadata.expectedResult = expectedResult.trim()
      if (actualResult.trim()) metadata.actualResult = actualResult.trim()

      const payload: Record<string, unknown> = {
        projectId,
        type,
        title: title.trim() || undefined,
        comment: comment.trim(),
        consoleLogs,
        networkLogs,
        rrwebEvents: trimRrwebForSubmit(rrwebEvents, 200),
        attachments: attachments.length > 0 ? attachments : undefined,
        ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
      }
      if (type === 'BUG') payload.severity = severity
      if (finalScreenshot) payload.screenshotBase64 = finalScreenshot
      if (typeof window !== 'undefined') {
        payload.pageUrl = pageUrlProp || window.location.href
        payload.userAgent = navigator.userAgent
      }

      await api.feedbacks.submit(payload as any)
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

  function parseEnvironment() {
    if (typeof navigator === 'undefined') return { os: '', browser: '', viewport: '' }
    const ua = navigator.userAgent
    let os = 'Unknown OS'
    if (ua.includes('Mac OS X')) {
      const v = ua.match(/Mac OS X ([\d_]+)/)
      os = 'macOS' + (v ? ' ' + v[1].replace(/_/g, '.') : '')
    } else if (ua.includes('Windows NT')) {
      const v = ua.match(/Windows NT ([\d.]+)/)
      const map: Record<string, string> = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' }
      os = 'Windows' + (v ? ' ' + (map[v[1]] || v[1]) : '')
    } else if (ua.includes('Linux')) os = 'Linux'
    else if (ua.includes('Android')) os = 'Android'
    else if (ua.includes('iOS') || ua.includes('iPhone')) os = 'iOS'

    let browser = 'Unknown Browser'
    if (ua.includes('Edg/')) { const v = ua.match(/Edg\/([\d.]+)/); browser = 'Edge' + (v ? ' ' + v[1] : '') }
    else if (ua.includes('Chrome/')) { const v = ua.match(/Chrome\/([\d.]+)/); browser = 'Chrome' + (v ? ' ' + v[1] : '') }
    else if (ua.includes('Firefox/')) { const v = ua.match(/Firefox\/([\d.]+)/); browser = 'Firefox' + (v ? ' ' + v[1] : '') }
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) { const v = ua.match(/Version\/([\d.]+)/); browser = 'Safari' + (v ? ' ' + v[1] : '') }

    const viewport = typeof window !== 'undefined' ? `${window.innerWidth} × ${window.innerHeight}` : ''
    return { os, browser, viewport }
  }

  const env = parseEnvironment()

  function fmtReplayTime(ms: number) {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    const rem = s % 60
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`
  }

  function handleReplayPlayPause() {
    const p = replayPlayerRef.current
    if (!p) return
    if (replayPlaying) {
      p.pause()
      setReplayPlaying(false)
    } else {
      const meta = p.getMetaData()
      const current = p.getCurrentTime() || 0
      if (current >= meta.totalTime - 100) {
        p.play(0)
        setReplayCurrentTime(0)
      } else {
        p.play(current)
      }
      setReplayPlaying(true)
    }
  }

  function handleReplaySeek(e: React.MouseEvent<HTMLDivElement>) {
    const p = replayPlayerRef.current
    if (!p) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const targetMs = Math.round(pct * replayTotalTime)
    p.play(targetMs)
    setReplayCurrentTime(targetMs)
    if (!replayPlaying) {
      requestAnimationFrame(() => p.pause())
    }
  }

  function handleReplaySpeed(s: number) {
    setReplaySpeed(s)
    replayPlayerRef.current?.setConfig?.({ speed: s })
  }

  const replayProgress = replayTotalTime > 0 ? (replayCurrentTime / replayTotalTime) * 100 : 0

  const typeLabels: Record<string, string> = { BUG: 'Bug', SUGGESTION: 'Sugestão', QUESTION: 'Dúvida', PRAISE: 'Elogio' }
  const typeIcons: Record<string, React.ReactNode> = {
    BUG: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2l1.88 1.88"/><path d="M14.12 3.88L16 2"/><path d="M9 7.13v-1a3.003 3.003 0 116 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>,
    SUGGESTION: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 006 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>,
    QUESTION: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>,
    PRAISE: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88L14 10h5.83a2 2 0 011.92 2.56l-2.33 8A2 2 0 0117.5 22H4a2 2 0 01-2-2v-8a2 2 0 012-2h2.76a2 2 0 001.79-1.11L12 2a3.13 3.13 0 013 3.88z"/></svg>,
  }
  const severityOpts = [
    ['LOW', 'Baixa', '#22c55e'],
    ['MEDIUM', 'Média', '#f59e0b'],
    ['HIGH', 'Alta', '#f97316'],
    ['CRITICAL', 'Crítica', '#ef4444'],
  ] as const

  const ts = TYPE_STYLES[type] || TYPE_STYLES.BUG
  const pageUrl = pageUrlProp || (typeof window !== 'undefined' ? window.location.href : '')
  const consoleErrs = consoleLogs.filter(l => (l.level || '').toUpperCase() === 'ERROR').length
  const netFails = networkLogs.filter(l => l.status != null && l.status >= 400).length
  const headerTitleText = title.trim() || 'Novo report'
  const openedDisplay = openedAtRef.current.toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const S = {
    font: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" } as React.CSSProperties,
    label: { display: 'block', fontSize: 11, fontWeight: 500, color: '#6b7280', marginBottom: 6 } as React.CSSProperties,
    input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none', color: '#111827', fontFamily: 'inherit', boxSizing: 'border-box' as const } as React.CSSProperties,
  }

  const closeIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )

  return (
    <>
      <style>{`
        @media (max-width: 900px) {
          .fv-modal-body { flex-direction: column !important; }
          .fv-modal-sidebar { width: 100% !important; border-left: none !important; border-top: 1px solid #e5e7eb; max-height: 42vh; }
        }
      `}</style>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingTop: '3vh',
          overflowY: 'auto',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          ...S.font,
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '64rem',
            maxHeight: '92vh',
            background: '#fff',
            borderRadius: '1rem',
            boxShadow: '0 24px 48px rgba(0,0,0,0.15)',
            margin: '0 1rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Cabeçalho (padrão FeedbackDetailModal) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: ts.dot, flexShrink: 0 }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: ts.bg, color: ts.fg }}>
              {typeIcons[type]} {ts.label}
            </span>
            <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
              {headerTitleText}
            </span>
            <span style={{ fontSize: '0.6875rem', color: '#9ca3af', flexShrink: 0 }}>{openedDisplay}</span>
            <button
              type="button"
              onClick={onClose}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '0.375rem', border: 'none', background: 'transparent', color: '#9ca3af', cursor: 'pointer', flexShrink: 0 }}
            >
              {closeIcon}
            </button>
          </div>

          {submitted ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '3rem 1.5rem', minHeight: 280 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 style={{ width: 36, height: 36, color: '#16a34a' }} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: '#111827', margin: 0 }}>Feedback enviado!</h3>
              <p style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', maxWidth: 280, margin: 0 }}>Obrigado pela contribuição.</p>
            </div>
          ) : (
            <>
              <div className="fv-modal-body" style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
                {/* Coluna principal */}
                <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  {/* Mídia */}
                  <div style={{ background: '#f4f5f7', borderBottom: '1px solid #e5e7eb' }}>
                    {hasReplay && (
                      <div style={{ display: 'flex', gap: 0, padding: '0 1rem', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
                        <button
                          type="button"
                          onClick={() => setMediaTab('replay')}
                          style={{
                            padding: '8px 12px',
                            fontSize: 12,
                            fontWeight: mediaTab === 'replay' ? 600 : 500,
                            border: 'none',
                            cursor: 'pointer',
                            borderBottom: mediaTab === 'replay' ? '2px solid #111827' : '2px solid transparent',
                            color: mediaTab === 'replay' ? '#111827' : '#9ca3af',
                            background: 'transparent',
                            marginBottom: -1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                          Replay
                        </button>
                        <button
                          type="button"
                          onClick={() => setMediaTab('screenshot')}
                          style={{
                            padding: '8px 12px',
                            fontSize: 12,
                            fontWeight: mediaTab === 'screenshot' ? 600 : 500,
                            border: 'none',
                            cursor: 'pointer',
                            borderBottom: mediaTab === 'screenshot' ? '2px solid #111827' : '2px solid transparent',
                            color: mediaTab === 'screenshot' ? '#111827' : '#9ca3af',
                            background: 'transparent',
                            marginBottom: -1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                          Screenshot
                        </button>
                      </div>
                    )}
                    <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}>
                      {(hasReplay ? mediaTab === 'replay' : false) && (
                        <div style={{ width: '100%', maxWidth: '100%', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb', background: '#0f172a' }}>
                          <div ref={replayContainerRef} style={{ width: '100%', minHeight: 220 }} />
                          {rrwebEvents.length < 2 && (
                            <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Gravando sessão...</div>
                          )}
                          {hasReplay && replayTotalTime > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#fff', padding: '12px 16px', borderTop: '1px solid #e5e7eb' }}>
                              <div onClick={handleReplaySeek} style={{ cursor: 'pointer', height: 6, display: 'flex', alignItems: 'center', borderRadius: 3, background: '#e5e7eb', position: 'relative' }}>
                                <div style={{ height: '100%', width: `${replayProgress}%`, background: widgetColor, borderRadius: 3, transition: replayPlaying ? 'none' : 'width 0.1s linear' }} />
                                <div style={{ position: 'absolute', top: '50%', left: `${replayProgress}%`, width: 14, height: 14, background: widgetColor, borderRadius: '50%', transform: 'translate(-50%, -50%)', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', border: '2px solid #fff' }} />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <button type="button" onClick={handleReplayPlayPause} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', border: 'none', background: widgetColor, color: '#fff', cursor: 'pointer' }}>
                                    {replayPlaying ? (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                                    ) : (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11-7.36a1 1 0 0 0 0-1.72l-11-7.36A1 1 0 0 0 8 5.14z" /></svg>
                                    )}
                                  </button>
                                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#6b7280', whiteSpace: 'nowrap' }}>
                                    {fmtReplayTime(replayCurrentTime)} / {fmtReplayTime(replayTotalTime)}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  {[1, 2, 4, 8].map(s => (
                                    <button key={s} type="button" onClick={() => handleReplaySpeed(s)} style={{ border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, fontSize: 11, background: replaySpeed === s ? widgetColor : 'transparent', color: replaySpeed === s ? '#fff' : '#9ca3af', fontWeight: replaySpeed === s ? 600 : 400 }}>
                                      {s}x
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {(hasReplay ? mediaTab === 'screenshot' : true) && (
                        <div style={{ width: '100%', maxWidth: '100%' }}>
                          {!screenshotDataUrl && (
                            <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                              {capturing ? 'Capturando screenshot…' : 'Screenshot indisponível.'}
                            </div>
                          )}
                          {screenshotDataUrl && (
                            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#0f172a' }}>
                              <div style={{ position: 'relative', maxHeight: 360, overflow: 'hidden' }}>
                                <img src={screenshotDataUrl} alt="Screenshot" style={{ width: '100%', display: 'block', objectFit: 'contain', objectPosition: 'top', maxHeight: 360 }} />
                                <canvas
                                  ref={overlayCanvasRef}
                                  onMouseDown={handleMouseDown}
                                  onMouseMove={handleMouseMove}
                                  onMouseUp={handleMouseUp}
                                  onMouseLeave={() => { setIsDrawing(false); setStartPos(null); redrawOverlay(rects) }}
                                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'crosshair' }}
                                />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '8px 12px', borderTop: '1px solid #e5e7eb' }}>
                                <span style={{ fontSize: 11, color: '#9ca3af' }}>Clique e arraste para marcar a área</span>
                                {rects.length > 0 && (
                                  <button type="button" onClick={() => { setRects([]); redrawOverlay([]) }} style={{ fontSize: 11, color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 500 }}>
                                    Limpar marcações
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <canvas ref={canvasRef} style={{ display: 'none' }} aria-hidden />

                  {/* Descrição */}
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Descrição <span style={{ color: '#ef4444' }}>*</span></span>
                    </div>
                    <textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      rows={5}
                      placeholder="Descreva o problema ou sugestão em detalhes… (mínimo 10 caracteres)"
                      style={{ ...S.input, resize: 'none' as const }}
                      onFocus={e => { e.target.style.borderColor = widgetColor; e.target.style.boxShadow = `0 0 0 3px ${widgetColor}1a` }}
                      onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none' }}
                    />
                    {commentError && <p style={{ marginTop: 4, fontSize: 12, color: '#dc2626' }}>{commentError}</p>}
                  </div>

                  {/* Mais detalhes */}
                  <div style={{ padding: '0 1.5rem 1rem' }}>
                    <button
                      type="button"
                      onClick={() => setDetailsOpen(!detailsOpen)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 0', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#6b7280', border: 'none', background: 'none', width: '100%', textAlign: 'left' }}
                    >
                      <ChevronDown style={{ width: 14, height: 14, transform: detailsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      Mais detalhes
                    </button>
                    {detailsOpen && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
                        <div>
                          <label style={S.label}>Título</label>
                          <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Resumo breve do feedback"
                            style={S.input}
                            onFocus={e => { e.target.style.borderColor = widgetColor; e.target.style.boxShadow = `0 0 0 3px ${widgetColor}1a` }}
                            onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none' }}
                          />
                        </div>
                        {type === 'BUG' && (
                          <>
                            <div>
                              <label style={{ ...S.label, fontSize: 13, color: '#374151' }}>Passos para reproduzir</label>
                              <textarea value={stepsToReproduce} onChange={e => setStepsToReproduce(e.target.value)} rows={3} placeholder="1. …" style={{ ...S.input, resize: 'vertical' as const }} onFocus={e => { e.target.style.borderColor = widgetColor; e.target.style.boxShadow = `0 0 0 3px ${widgetColor}1a` }} onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                              <div style={{ flex: '1 1 200px' }}>
                                <label style={{ ...S.label, fontSize: 13, color: '#374151' }}>Resultado esperado</label>
                                <textarea value={expectedResult} onChange={e => setExpectedResult(e.target.value)} rows={3} style={{ ...S.input, resize: 'vertical' as const }} onFocus={e => { e.target.style.borderColor = widgetColor; e.target.style.boxShadow = `0 0 0 3px ${widgetColor}1a` }} onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none' }} />
                              </div>
                              <div style={{ flex: '1 1 200px' }}>
                                <label style={{ ...S.label, fontSize: 13, color: '#374151' }}>Resultado real</label>
                                <textarea value={actualResult} onChange={e => setActualResult(e.target.value)} rows={3} style={{ ...S.input, resize: 'vertical' as const }} onFocus={e => { e.target.style.borderColor = widgetColor; e.target.style.boxShadow = `0 0 0 3px ${widgetColor}1a` }} onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none' }} />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Anexos + logs */}
                  <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ ...S.label, fontSize: 13, color: '#374151' }}>Anexos</label>
                      <div
                        style={{ border: '2px dashed #d1d5db', borderRadius: 8, padding: '12px 16px', textAlign: 'center', cursor: 'pointer', background: '#f9fafb' }}
                        onClick={() => {
                          const input = document.createElement('input')
                          input.type = 'file'
                          input.multiple = true
                          input.accept = 'image/*,.pdf,.txt,.log,.json,.csv'
                          input.onchange = () => {
                            if (!input.files) return
                            const files = Array.from(input.files).slice(0, 5 - attachments.length)
                            files.forEach(file => {
                              const reader = new FileReader()
                              reader.onload = () => {
                                setAttachments(prev => (prev.length >= 5 ? prev : [...prev, { name: file.name, type: file.type, data: reader.result as string }]))
                              }
                              reader.readAsDataURL(file)
                            })
                          }
                          input.click()
                        }}
                      >
                        <span style={{ fontSize: 12, color: '#6b7280' }}>Clique para anexar arquivos (máx. 5)</span>
                      </div>
                      {attachments.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {attachments.map((att, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: '#f3f4f6', borderRadius: 6, fontSize: 12 }}>
                              <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{att.name}</span>
                              <button type="button" onClick={e => { e.stopPropagation(); setAttachments(prev => prev.filter((_, idx) => idx !== i)) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '0 4px', fontSize: 14 }}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {consoleLogs.length > 0 && (
                      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                        <button type="button" onClick={() => setConsoleLogsOpen(!consoleLogsOpen)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f9fafb', cursor: 'pointer', border: 'none', textAlign: 'left', fontFamily: 'inherit' }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Console Logs ({consoleLogs.length})</span>
                          <ChevronDown style={{ width: 16, height: 16, color: '#9ca3af', transform: consoleLogsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>
                        {consoleLogsOpen && (
                          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                            {consoleLogs.map((log, i) => {
                              const level = (log.level || 'log').toUpperCase()
                              const tagBg = level === 'ERROR' ? '#fee2e2' : level === 'WARN' ? '#fef9c3' : '#dbeafe'
                              const tagColor = level === 'ERROR' ? '#b91c1c' : level === 'WARN' ? '#a16207' : '#1d4ed8'
                              return (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '5px 14px', borderTop: '1px solid #f3f4f6' }}>
                                  <span style={{ flexShrink: 0, padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: tagBg, color: tagColor }}>{level}</span>
                                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280', wordBreak: 'break-word', flex: 1, minWidth: 0 }}>{log.message}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {networkLogs.length > 0 && (
                      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                        <button type="button" onClick={() => setNetworkLogsOpen(!networkLogsOpen)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f9fafb', cursor: 'pointer', border: 'none', textAlign: 'left', fontFamily: 'inherit' }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Network ({networkLogs.length})</span>
                          <ChevronDown style={{ width: 16, height: 16, color: '#9ca3af', transform: networkLogsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>
                        {networkLogsOpen && (
                          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                            {networkLogs.map((log, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderTop: '1px solid #f3f4f6' }}>
                                <span style={{ flexShrink: 0, padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: log.status != null && log.status >= 400 ? '#fee2e2' : '#dcfce7', color: log.status != null && log.status >= 400 ? '#b91c1c' : '#15803d' }}>{log.status ?? '-'}</span>
                                <span style={{ flexShrink: 0, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#374151' }}>{log.method}</span>
                                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }} title={log.url}>{log.url}</span>
                                {log.duration != null && <span style={{ flexShrink: 0, fontFamily: 'monospace', fontSize: 11, color: '#9ca3af' }}>{log.duration}ms</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {submitError && (
                      <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>{submitError}</div>
                    )}
                  </div>
                </div>

                {/* Sidebar */}
                <div className="fv-modal-sidebar" style={{ width: 320, flexShrink: 0, borderLeft: '1px solid #e5e7eb', overflowY: 'auto', padding: '12px 20px' }}>
                  <SidebarField label="Tipo">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(['BUG', 'SUGGESTION', 'QUESTION', 'PRAISE'] as const).map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setType(val)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: 8,
                            border: type === val ? `2px solid ${widgetColor}` : '1px solid #d1d5db',
                            background: type === val ? `${widgetColor}0d` : '#fff',
                            color: type === val ? widgetColor : '#374151',
                            fontSize: 11,
                            fontWeight: type === val ? 600 : 400,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {typeIcons[val]} {typeLabels[val]}
                        </button>
                      ))}
                    </div>
                  </SidebarField>

                  {type === 'BUG' && (
                    <SidebarField label="Prioridade">
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {severityOpts.map(([val, label, c]) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setSeverity(val)}
                            style={{
                              padding: '6px 8px',
                              borderRadius: 8,
                              border: severity === val ? `2px solid ${c}` : '1px solid #d1d5db',
                              background: severity === val ? `${c}15` : '#fff',
                              color: severity === val ? c : '#374151',
                              fontSize: 11,
                              fontWeight: severity === val ? 600 : 400,
                              cursor: 'pointer',
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </SidebarField>
                  )}

                  <div style={{ height: 1, background: '#e5e7eb', margin: '8px 0' }} />

                  <SidebarField label="Navegador"><span style={{ fontSize: 11, color: '#111827' }}>{env.browser}</span></SidebarField>
                  <SidebarField label="OS"><span style={{ fontSize: 11, color: '#111827' }}>{env.os}</span></SidebarField>
                  <SidebarField label="Viewport"><span style={{ fontSize: 11, color: '#111827' }}>{env.viewport}</span></SidebarField>
                  <SidebarField label="Origem"><span style={{ fontSize: 11, color: '#111827' }}>{sourceLabel}</span></SidebarField>
                  <SidebarField label="Página">
                    <a href={pageUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: widgetColor, fontWeight: 500, textDecoration: 'none', wordBreak: 'break-all' }}>Abrir ↗</a>
                  </SidebarField>
                  <SidebarField label="Console">
                    <span style={{ fontSize: 11, color: consoleErrs ? '#dc2626' : '#6b7280' }}>{consoleLogs.length} logs{consoleErrs > 0 ? ` (${consoleErrs} erros)` : ''}</span>
                  </SidebarField>
                  <SidebarField label="Network">
                    <span style={{ fontSize: 11, color: netFails ? '#dc2626' : '#6b7280' }}>{networkLogs.length} req.{netFails > 0 ? ` (${netFails} falhas)` : ''}</span>
                  </SidebarField>
                </div>
              </div>

              <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
                <button
                  type="button"
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
                    `Enviar ${typeLabels[type] || 'Bug'}`
                  )}
                </button>
                <p style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#9ca3af' }}>
                  Powered by{' '}
                  <a href="https://buug.io" target="_blank" rel="noopener noreferrer" style={{ color: '#6b7280', textDecoration: 'none' }}>Buug</a>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
