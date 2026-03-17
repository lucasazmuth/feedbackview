'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, ChevronDown, Loader2, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import 'rrweb-player/dist/style.css'

// Trim rrweb events: keep Meta+Snapshot + most recent incremental events,
// then normalize timestamps to close any time gap (prevents frozen replay).
function trimRrwebForSubmit(events: RRWebEvent[], max: number): RRWebEvent[] {
  if (events.length <= max) return events

  // Find the last full snapshot (type 2)
  let lastSnapshotIdx = -1
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === 2) { lastSnapshotIdx = i; break }
  }

  if (lastSnapshotIdx < 0) return events.slice(-max)

  // Find Meta event (type 4) before snapshot
  let metaIdx = lastSnapshotIdx
  for (let i = lastSnapshotIdx - 1; i >= 0; i--) {
    if (events[i].type === 4) { metaIdx = i; break }
  }

  const headerEvents = events.slice(metaIdx, lastSnapshotIdx + 1)
  const tailEvents = events.slice(lastSnapshotIdx + 1)
  const maxTail = max - headerEvents.length
  const keptTail = tailEvents.length > maxTail ? tailEvents.slice(tailEvents.length - maxTail) : tailEvents

  // Deep copy to avoid mutating original state
  const result = [
    ...headerEvents.map(e => ({ ...e })),
    ...keptTail.map(e => ({ ...e })),
  ]

  // Normalize timestamps: close gap between snapshot and first incremental event
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
  const replayContainerRef = useRef<HTMLDivElement>(null)
  const replayPlayerRef = useRef<any>(null)
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

  // Mount rrweb player for session replay video
  useEffect(() => {
    const container = replayContainerRef.current
    if (!container || rrwebEvents.length < 2) return
    // Need at least one full snapshot (type 2) for the player to work
    const hasSnapshot = rrwebEvents.some(e => e.type === 2)
    if (!hasSnapshot) return

    let player: any = null
    ;(async () => {
      try {
        const { default: rrwebPlayer } = await import('rrweb-player')

        // Clear container before mounting
        container.innerHTML = ''

        const containerWidth = container.offsetWidth || 440
        const playerHeight = Math.round(containerWidth * 0.56) // ~16:9

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
        // Render first frame so the iframe becomes visible
        player.goto(0)
        replayPlayerRef.current = player

        // Set total time for custom controls
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

  // Track replay playback progress
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
      const metadata: any = {}
      if (stepsToReproduce.trim()) metadata.stepsToReproduce = stepsToReproduce.trim()
      if (expectedResult.trim()) metadata.expectedResult = expectedResult.trim()
      if (actualResult.trim()) metadata.actualResult = actualResult.trim()

      const payload: any = {
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

  // Parse user agent for environment info
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
    if (replayPlayerRef.current) {
      replayPlayerRef.current.setConfig?.({ speed: s })
    }
  }

  const replayProgress = replayTotalTime > 0 ? (replayCurrentTime / replayTotalTime) * 100 : 0

  const typeLabels: Record<string, string> = { BUG: 'Bug', SUGGESTION: 'Sugestão', QUESTION: 'Dúvida', PRAISE: 'Elogio' }
  const typeIcons: Record<string, React.ReactNode> = {
    BUG: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2l1.88 1.88"/><path d="M14.12 3.88L16 2"/><path d="M9 7.13v-1a3.003 3.003 0 116 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>,
    SUGGESTION: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 006 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>,
    QUESTION: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>,
    PRAISE: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88L14 10h5.83a2 2 0 011.92 2.56l-2.33 8A2 2 0 0117.5 22H4a2 2 0 01-2-2v-8a2 2 0 012-2h2.76a2 2 0 001.79-1.11L12 2a3.13 3.13 0 013 3.88z"/></svg>,
  }
  const severityLabels: Record<string, { label: string; color: string }> = {
    LOW: { label: 'Baixa', color: '#22c55e' },
    MEDIUM: { label: 'Média', color: '#f59e0b' },
    HIGH: { label: 'Alta', color: '#f97316' },
    CRITICAL: { label: 'Crítica', color: '#ef4444' },
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
      <style>{`@media (max-width: 768px) { .preview-panel { display: none !important; } }`}</style>
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
          width: 920,
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
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Form column */}
          <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
            {/* Session Replay section */}
            <div style={{ padding: 20, borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'fv-pulse-dot 1.5s ease-in-out infinite', flexShrink: 0 }} />
                Session Replay{' '}
                <span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af' }}>
                  (gravação automática)
                </span>
              </div>
              <style>{`@keyframes fv-pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>

              <div style={{ borderRadius: 12, border: '1px solid #e5e7eb', background: '#0f172a', overflow: 'hidden' }}>
                {/* rrweb Player */}
                <div
                  ref={replayContainerRef}
                  style={{ width: '100%', minHeight: 220 }}
                />
                {rrwebEvents.length < 2 && (
                  <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                    Gravando sessão...
                  </div>
                )}
                {/* Custom replay controls (matching embed exactly) */}
                {rrwebEvents.length >= 2 && replayTotalTime > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#fff', padding: '12px 16px', borderTop: '1px solid #e5e7eb' }}>
                    {/* Timeline */}
                    <div
                      onClick={handleReplaySeek}
                      style={{ cursor: 'pointer', height: 6, display: 'flex', alignItems: 'center', borderRadius: 3, background: '#e5e7eb', position: 'relative' }}
                    >
                      <div style={{ height: '100%', width: `${replayProgress}%`, background: widgetColor, borderRadius: 3, transition: replayPlaying ? 'none' : 'width 0.1s linear' }} />
                      <div style={{ position: 'absolute', top: '50%', left: `${replayProgress}%`, width: 14, height: 14, background: widgetColor, borderRadius: '50%', transform: 'translate(-50%, -50%)', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', border: '2px solid #fff' }} />
                    </div>
                    {/* Bottom row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                          onClick={handleReplayPlayPause}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', border: 'none', background: widgetColor, color: '#fff', cursor: 'pointer', transition: 'opacity 0.15s' }}
                        >
                          {replayPlaying ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11-7.36a1 1 0 0 0 0-1.72l-11-7.36A1 1 0 0 0 8 5.14z"/></svg>
                          )}
                        </button>
                        <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {fmtReplayTime(replayCurrentTime)} / {fmtReplayTime(replayTotalTime)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {[1, 2, 4, 8].map((s) => (
                          <button
                            key={s}
                            onClick={() => handleReplaySpeed(s)}
                            style={{
                              border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, fontSize: 11, transition: 'all 0.15s',
                              background: replaySpeed === s ? widgetColor : 'transparent',
                              color: replaySpeed === s ? '#fff' : '#9ca3af',
                              fontWeight: replaySpeed === s ? 600 : 400,
                            }}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {/* Stats bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#1e293b', fontSize: 11, color: '#94a3b8' }}>
                  <span>{rrwebEvents.length} eventos</span>
                  <span>
                    {(() => {
                      const ec = rrwebEvents.length
                      if (ec < 2) return '0s'
                      const sec = Math.round((rrwebEvents[ec - 1].timestamp - rrwebEvents[0].timestamp) / 1000)
                      return sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : `${sec}s`
                    })()}
                  </span>
                  <span style={{ color: '#dcfce7' }}>Será enviado com o report</span>
                </div>
              </div>
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
                  {(['BUG', 'SUGGESTION', 'QUESTION', 'PRAISE'] as const).map((val) => (
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
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                    >
                      {typeIcons[val]} {typeLabels[val]}
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

              {/* Steps to reproduce (BUG only) */}
              {type === 'BUG' && (
                <div>
                  <label style={S.label}>Passos para reproduzir</label>
                  <textarea
                    value={stepsToReproduce}
                    onChange={(e) => setStepsToReproduce(e.target.value)}
                    rows={3}
                    placeholder={"1. Abra a página X\n2. Clique em Y\n3. Observe o erro Z"}
                    style={{ ...S.input, resize: 'vertical' as const }}
                    onFocus={(e) => { e.target.style.borderColor = widgetColor; e.target.style.boxShadow = `0 0 0 3px ${widgetColor}1a` }}
                    onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
              )}

              {/* Expected vs Actual (BUG only) */}
              {type === 'BUG' && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={S.label}>Resultado esperado</label>
                    <textarea
                      value={expectedResult}
                      onChange={(e) => setExpectedResult(e.target.value)}
                      rows={3}
                      placeholder="O que deveria acontecer..."
                      style={{ ...S.input, resize: 'vertical' as const }}
                      onFocus={(e) => { e.target.style.borderColor = widgetColor; e.target.style.boxShadow = `0 0 0 3px ${widgetColor}1a` }}
                      onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={S.label}>Resultado real</label>
                    <textarea
                      value={actualResult}
                      onChange={(e) => setActualResult(e.target.value)}
                      rows={3}
                      placeholder="O que realmente aconteceu..."
                      style={{ ...S.input, resize: 'vertical' as const }}
                      onFocus={(e) => { e.target.style.borderColor = widgetColor; e.target.style.boxShadow = `0 0 0 3px ${widgetColor}1a` }}
                      onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none' }}
                    />
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

              {/* Submit error */}
              {submitError && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
                  {submitError}
                </div>
              )}
            </div>
          </div>

          {/* Live Preview Panel */}
          <div style={{ width: 380, flexShrink: 0, borderLeft: '1px solid #e5e7eb', background: '#f9fafb', overflowY: 'auto', padding: 20 }}
            className="preview-panel"
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 16 }}>Preview</div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Type badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: type === 'BUG' ? '#fef2f2' : type === 'SUGGESTION' ? '#fffbeb' : type === 'QUESTION' ? '#eff6ff' : '#f0fdf4',
                  color: type === 'BUG' ? '#dc2626' : type === 'SUGGESTION' ? '#d97706' : type === 'QUESTION' ? '#2563eb' : '#16a34a',
                }}>
                  {typeIcons[type]} {typeLabels[type]}
                </span>
              </div>

              {/* Title */}
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.3 }}>
                {title.trim() || <span style={{ color: '#d1d5db', fontStyle: 'italic', fontWeight: 400, fontSize: 14 }}>Sem título</span>}
              </h3>

              {/* Description */}
              {comment.trim() ? (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Descrição</div>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' as const }}>{comment}</p>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: '#d1d5db', fontStyle: 'italic', margin: 0 }}>Aguardando descrição...</p>
              )}

              {/* Steps to reproduce */}
              {type === 'BUG' && stepsToReproduce.trim() && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Passos para reproduzir</div>
                  <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                    {stepsToReproduce.split('\n').filter(l => l.trim()).map((line, i) => (
                      <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
                        <span style={{ color: '#9ca3af', fontWeight: 500, flexShrink: 0 }}>{i + 1}.</span>
                        <span>{line.replace(/^\d+[\.\)]\s*/, '')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expected result */}
              {type === 'BUG' && expectedResult.trim() && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', marginBottom: 4 }}>Resultado esperado</div>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' as const }}>{expectedResult}</p>
                </div>
              )}

              {/* Actual result */}
              {type === 'BUG' && actualResult.trim() && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>Resultado real</div>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' as const }}>{actualResult}</p>
                </div>
              )}

              {/* Screenshot thumbnail */}
              {screenshotDataUrl && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Screenshot</div>
                  <img src={screenshotDataUrl} alt="Screenshot" style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                </div>
              )}

              {/* Priority */}
              {type === 'BUG' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Prioridade</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                    background: `${severityLabels[severity].color}15`,
                    color: severityLabels[severity].color,
                  }}>
                    ⚡ {severityLabels[severity].label}
                  </span>
                </div>
              )}

              {/* Metadata section */}
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Source URL */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ color: '#9ca3af', flexShrink: 0 }}>🔗</span>
                  <span style={{ color: '#2563eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {pageUrlProp || (typeof window !== 'undefined' ? window.location.href : '')}
                  </span>
                </div>

                {/* OS */}
                {env.os && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ color: '#9ca3af', flexShrink: 0 }}>🖥️</span>
                    <span style={{ color: '#374151' }}>{env.os} • {env.browser}</span>
                  </div>
                )}

                {/* Viewport */}
                {env.viewport && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ color: '#9ca3af', flexShrink: 0 }}>📐</span>
                    <span style={{ color: '#374151' }}>{env.viewport}</span>
                  </div>
                )}

                {/* Console logs summary */}
                {consoleLogs.length > 0 && (() => {
                  const errors = consoleLogs.filter(l => l.level?.toLowerCase() === 'error').length
                  const warnings = consoleLogs.filter(l => l.level?.toLowerCase() === 'warn').length
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ color: '#9ca3af', flexShrink: 0 }}>⚠️</span>
                      <span style={{ display: 'flex', gap: 8 }}>
                        {errors > 0 && <span style={{ color: '#dc2626', fontWeight: 500 }}>{errors} error{errors !== 1 ? 's' : ''}</span>}
                        {warnings > 0 && <span style={{ color: '#d97706', fontWeight: 500 }}>{warnings} warning{warnings !== 1 ? 's' : ''}</span>}
                        {errors === 0 && warnings === 0 && <span style={{ color: '#374151' }}>{consoleLogs.length} log{consoleLogs.length !== 1 ? 's' : ''}</span>}
                      </span>
                    </div>
                  )
                })()}

                {/* Network logs summary */}
                {networkLogs.length > 0 && (() => {
                  const failedReqs = networkLogs.filter(l => l.status && l.status >= 400).length
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ color: '#9ca3af', flexShrink: 0 }}>🌐</span>
                      <span style={{ color: '#374151' }}>
                        {networkLogs.length} request{networkLogs.length !== 1 ? 's' : ''}
                        {failedReqs > 0 && <span style={{ color: '#dc2626', marginLeft: 4 }}>({failedReqs} failed)</span>}
                      </span>
                    </div>
                  )
                })()}
              </div>
            </div>
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
              <a href="https://buug.io" target="_blank" rel="noopener noreferrer" style={{ color: '#6b7280', textDecoration: 'none' }}>
                Buug
              </a>
            </p>
          </div>
        )}
      </div>
    </>
  )
}
