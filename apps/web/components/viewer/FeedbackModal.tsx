'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ChevronDown, Loader2, CheckCircle2 } from 'lucide-react'
import { ICON_PX, LUCIDE_ICON_PX, ICON_STROKE } from '@/lib/icon-tokens'
import { AppIcon } from '@/components/ui/AppIcon'
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
  BUG: { dot: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', fg: '#f87171', label: 'Bug' },
  SUGGESTION: { dot: '#60a5fa', bg: 'rgba(59, 130, 246, 0.15)', fg: '#60a5fa', label: 'Sugestão' },
  QUESTION: { dot: '#facc15', bg: 'rgba(234, 179, 8, 0.15)', fg: '#facc15', label: 'Dúvida' },
  PRAISE: { dot: '#4ade80', bg: 'rgba(34, 197, 94, 0.15)', fg: '#4ade80', label: 'Elogio' },
}

function SidebarField({
  label,
  children,
  layout = 'row',
  sectionHeading = false,
}: {
  label: string
  children: React.ReactNode
  layout?: 'row' | 'stack'
  sectionHeading?: boolean
}) {
  if (layout === 'stack') {
    return (
      <div style={{ padding: sectionHeading ? '0.35rem 0 0.5rem' : '0.45rem 0' }}>
        <span
          style={{
            display: 'block',
            fontSize: sectionHeading ? 10 : 11,
            fontWeight: 600,
            color: '#64748b',
            marginBottom: sectionHeading ? 8 : 4,
            letterSpacing: sectionHeading ? '0.1em' : '0.02em',
            textTransform: sectionHeading ? 'uppercase' : 'none',
          }}
        >
          {label}
        </span>
        <div style={{ fontSize: 11, lineHeight: 1.45, wordBreak: 'break-word' }}>{children}</div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.625rem 0' }}>
      <span style={{ fontSize: '1.2rem', fontWeight: 500, color: '#64748b', width: 72, flexShrink: 0, paddingTop: 2 }}>{label}</span>
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
    BUG: <AppIcon size="sm" strokeWidth={ICON_STROKE.emphasis}><path d="M8 2l1.88 1.88"/><path d="M14.12 3.88L16 2"/><path d="M9 7.13v-1a3.003 3.003 0 116 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></AppIcon>,
    SUGGESTION: <AppIcon size="sm" strokeWidth={ICON_STROKE.emphasis}><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 006 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></AppIcon>,
    QUESTION: <AppIcon size="sm" strokeWidth={ICON_STROKE.emphasis}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></AppIcon>,
    PRAISE: <AppIcon size="sm" strokeWidth={ICON_STROKE.emphasis}><path d="M7 10v12"/><path d="M15 5.88L14 10h5.83a2 2 0 011.92 2.56l-2.33 8A2 2 0 0117.5 22H4a2 2 0 01-2-2v-8a2 2 0 012-2h2.76a2 2 0 001.79-1.11L12 2a3.13 3.13 0 013 3.88z"/></AppIcon>,
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
    font: { fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' } as React.CSSProperties,
    label: { display: 'block', fontSize: 11, fontWeight: 500, color: '#64748b', marginBottom: 6 } as React.CSSProperties,
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      fontSize: 13,
      outline: 'none',
      color: '#0f172a',
      background: 'rgba(0, 0, 0, 0.03)',
      fontFamily: 'inherit',
      boxSizing: 'border-box' as const,
    } as React.CSSProperties,
  }

  const closeIcon = (
    <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </AppIcon>
  )

  return (
    <>
      <style>{`
        @media (max-width: 900px) {
          .fv-modal-body { flex-direction: column !important; }
          .fv-modal-sidebar { width: 100% !important; border-left: none !important; border-top: 1px solid #e2e8f0; max-height: 42vh; }
        }
      `}</style>
      <div
        className="px-4 sm:px-6"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingTop: 'clamp(1rem, 4vh, 2.5rem)',
          paddingBottom: '1.5rem',
          overflowY: 'auto',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          ...S.font,
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          className="border border-transparent-white"
          style={{
            width: '100%',
            maxWidth: 'min(96vw, 140rem)',
            maxHeight: 'min(95vh, 120rem)',
            minHeight: 'clamp(28rem, 82vh, 100rem)',
            backgroundColor: '#ffffff',
            backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59, 130, 246, 0.08), transparent)',
            borderRadius: '1rem',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1), rgba(30, 41, 59, 0.08) 0px 1px 40px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Cabeçalho (padrão FeedbackDetailModal) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.125rem 1.75rem',
              borderBottom: '1px solid #e2e8f0',
              flexShrink: 0,
              background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.02) 0%, transparent 100%)',
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: ts.dot, flexShrink: 0 }} />
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 10px',
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 600,
                background: ts.bg,
                color: ts.fg,
              }}
            >
              {typeIcons[type]} {ts.label}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: '1.6rem',
                fontWeight: 600,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}
            >
              {headerTitleText}
            </span>
            <span className="text-sm text-gray" style={{ flexShrink: 0 }}>
              {openedDisplay}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-transparent-white bg-glass-gradient text-gray transition-colors hover:bg-transparent-white hover:text-off-white"
              style={{ width: 36, height: 36, cursor: 'pointer' }}
            >
              {closeIcon}
            </button>
          </div>

          {submitted ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '3rem 1.5rem', minHeight: 280 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={36} style={{ color: '#4ade80' }} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', margin: 0 }}>Feedback enviado!</h3>
              <p style={{ fontSize: 14, color: '#64748b', textAlign: 'center', maxWidth: 280, margin: 0 }}>Obrigado pela contribuição.</p>
            </div>
          ) : (
            <>
              <div className="fv-modal-body" style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
                {/* Coluna principal */}
                <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  {/* Mídia */}
                  <div style={{ background: 'rgba(0, 0, 0, 0.03)', borderBottom: '1px solid #e2e8f0' }}>
                    {hasReplay && (
                      <div style={{ display: 'flex', gap: 0, padding: '0 1.25rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                        <button
                          type="button"
                          onClick={() => setMediaTab('replay')}
                          style={{
                            padding: '0.625rem 1rem',
                            fontSize: '1.4rem',
                            fontWeight: mediaTab === 'replay' ? 600 : 500,
                            border: 'none',
                            cursor: 'pointer',
                            borderBottom: mediaTab === 'replay' ? '2px solid #1e40af' : '2px solid transparent',
                            color: mediaTab === 'replay' ? '#0f172a' : '#64748b',
                            background: 'transparent',
                            marginBottom: -1,
                            fontFamily: 'inherit',
                          }}
                        >
                          Replay
                        </button>
                        <button
                          type="button"
                          onClick={() => setMediaTab('screenshot')}
                          style={{
                            padding: '0.625rem 1rem',
                            fontSize: '1.4rem',
                            fontWeight: mediaTab === 'screenshot' ? 600 : 500,
                            border: 'none',
                            cursor: 'pointer',
                            borderBottom: mediaTab === 'screenshot' ? '2px solid #1e40af' : '2px solid transparent',
                            color: mediaTab === 'screenshot' ? '#0f172a' : '#64748b',
                            background: 'transparent',
                            marginBottom: -1,
                            fontFamily: 'inherit',
                          }}
                        >
                          Screenshot
                        </button>
                      </div>
                    )}
                    <div style={{ padding: '1.25rem 1.75rem', display: 'flex', justifyContent: 'center' }}>
                      {(hasReplay ? mediaTab === 'replay' : false) && (
                        <div
                          style={{
                            width: '100%',
                            maxWidth: '100%',
                            minHeight: 'min(44vh, 56rem)',
                            borderRadius: '0.75rem',
                            overflow: 'hidden',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                            background: '#f8fafc',
                          }}
                        >
                          <div ref={replayContainerRef} style={{ width: '100%', minHeight: 200 }} />
                          {rrwebEvents.length < 2 && (
                            <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Gravando sessão...</div>
                          )}
                          {hasReplay && replayTotalTime > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#f8fafc', padding: '12px 16px', borderTop: '1px solid #e2e8f0' }}>
                              <div onClick={handleReplaySeek} style={{ cursor: 'pointer', height: 6, display: 'flex', alignItems: 'center', borderRadius: 3, background: '#f1f5f9', position: 'relative' }}>
                                <div style={{ height: '100%', width: `${replayProgress}%`, background: widgetColor, borderRadius: 3, transition: replayPlaying ? 'none' : 'width 0.1s linear' }} />
                                <div style={{ position: 'absolute', top: '50%', left: `${replayProgress}%`, width: 14, height: 14, background: widgetColor, borderRadius: '50%', transform: 'translate(-50%, -50%)', boxShadow: '0 1px 8px rgba(0,0,0,0.15)', border: '2px solid #12121a' }} />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <button type="button" onClick={handleReplayPlayPause} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', border: 'none', background: widgetColor, color: '#fff', cursor: 'pointer' }}>
                                    {replayPlaying ? (
                                      <AppIcon size="sm"><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" /></AppIcon>
                                    ) : (
                                      <AppIcon size="sm"><path d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11-7.36a1 1 0 0 0 0-1.72l-11-7.36A1 1 0 0 0 8 5.14z" fill="currentColor" stroke="none" /></AppIcon>
                                    )}
                                  </button>
                                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#64748b', whiteSpace: 'nowrap' }}>
                                    {fmtReplayTime(replayCurrentTime)} / {fmtReplayTime(replayTotalTime)}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  {[1, 2, 4, 8].map(s => (
                                    <button key={s} type="button" onClick={() => handleReplaySpeed(s)} style={{ border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, fontSize: 11, background: replaySpeed === s ? widgetColor : 'transparent', color: replaySpeed === s ? '#fff' : '#64748b', fontWeight: replaySpeed === s ? 600 : 400 }}>
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
                            <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13, background: 'rgba(0, 0, 0, 0.03)', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                              {capturing ? 'Capturando screenshot…' : 'Screenshot indisponível.'}
                            </div>
                          )}
                          {screenshotDataUrl && (
                            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}>
                              <div style={{ position: 'relative', maxHeight: 'min(52vh, 72rem)', overflow: 'hidden' }}>
                                <img src={screenshotDataUrl} alt="Screenshot" style={{ width: '100%', display: 'block', objectFit: 'contain', objectPosition: 'top', maxHeight: 'min(52vh, 72rem)' }} />
                                <canvas
                                  ref={overlayCanvasRef}
                                  onMouseDown={handleMouseDown}
                                  onMouseMove={handleMouseMove}
                                  onMouseUp={handleMouseUp}
                                  onMouseLeave={() => { setIsDrawing(false); setStartPos(null); redrawOverlay(rects) }}
                                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'crosshair' }}
                                />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 12px', borderTop: '1px solid #e2e8f0' }}>
                                <span style={{ fontSize: 11, color: '#64748b' }}>Clique e arraste para marcar a área</span>
                                {rects.length > 0 && (
                                  <button type="button" onClick={() => { setRects([]); redrawOverlay([]) }} style={{ fontSize: 11, color: '#f87171', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 500 }}>
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
                  <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span className="text-md font-semibold text-off-white">
                        Descrição <span style={{ color: '#f87171' }}>*</span>
                      </span>
                    </div>
                    <textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      rows={5}
                      placeholder="Descreva o problema ou sugestão em detalhes… (mínimo 10 caracteres)"
                      style={{ ...S.input, resize: 'none' as const }}
                      onFocus={e => { e.target.style.borderColor = widgetColor; e.target.style.boxShadow = `0 0 0 3px ${widgetColor}33` }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                    />
                    {commentError && <p style={{ marginTop: 4, fontSize: 12, color: '#f87171' }}>{commentError}</p>}
                  </div>

                  {/* Mais detalhes */}
                  <div style={{ padding: '0 2rem 1rem' }}>
                    <button
                      type="button"
                      onClick={() => setDetailsOpen(!detailsOpen)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 0', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#64748b', border: 'none', background: 'none', width: '100%', textAlign: 'left' }}
                    >
                      <ChevronDown size={ICON_PX.sm} style={{ transform: detailsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
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
                            onFocus={e => { e.target.style.borderColor = widgetColor; e.target.style.boxShadow = `0 0 0 3px ${widgetColor}33` }}
                            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                          />
                        </div>
                        {type === 'BUG' && (
                          <>
                            <div>
                              <label style={{ ...S.label, fontSize: 13, color: '#475569' }}>Passos para reproduzir</label>
                              <textarea value={stepsToReproduce} onChange={e => setStepsToReproduce(e.target.value)} rows={3} placeholder="1. …" style={{ ...S.input, resize: 'vertical' as const }} onFocus={e => { e.target.style.borderColor = widgetColor; e.target.style.boxShadow = `0 0 0 3px ${widgetColor}33` }} onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                              <div style={{ flex: '1 1 200px' }}>
                                <label style={{ ...S.label, fontSize: 13, color: '#475569' }}>Resultado esperado</label>
                                <textarea value={expectedResult} onChange={e => setExpectedResult(e.target.value)} rows={3} style={{ ...S.input, resize: 'vertical' as const }} onFocus={e => { e.target.style.borderColor = widgetColor; e.target.style.boxShadow = `0 0 0 3px ${widgetColor}33` }} onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }} />
                              </div>
                              <div style={{ flex: '1 1 200px' }}>
                                <label style={{ ...S.label, fontSize: 13, color: '#475569' }}>Resultado real</label>
                                <textarea value={actualResult} onChange={e => setActualResult(e.target.value)} rows={3} style={{ ...S.input, resize: 'vertical' as const }} onFocus={e => { e.target.style.borderColor = widgetColor; e.target.style.boxShadow = `0 0 0 3px ${widgetColor}33` }} onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }} />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Anexos + logs */}
                  <div style={{ padding: '0 2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ ...S.label, fontSize: 13, color: '#475569' }}>Anexos</label>
                      <div
                        style={{ border: '2px dashed #e2e8f0', borderRadius: 8, padding: '12px 16px', textAlign: 'center', cursor: 'pointer', background: 'rgba(0, 0, 0, 0.03)' }}
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
                        <span style={{ fontSize: 12, color: '#64748b' }}>Clique para anexar arquivos (máx. 5)</span>
                      </div>
                      {attachments.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {attachments.map((att, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(0, 0, 0, 0.03)', borderRadius: 6, fontSize: 12 }}>
                              <span style={{ color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{att.name}</span>
                              <button type="button" onClick={e => { e.stopPropagation(); setAttachments(prev => prev.filter((_, idx) => idx !== i)) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0 4px', fontSize: 14 }}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {consoleLogs.length > 0 && (
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                        <button type="button" onClick={() => setConsoleLogsOpen(!consoleLogsOpen)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(0, 0, 0, 0.03)', cursor: 'pointer', border: 'none', textAlign: 'left', fontFamily: 'inherit' }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>Console Logs ({consoleLogs.length})</span>
                          <ChevronDown size={LUCIDE_ICON_PX} style={{ color: '#64748b', transform: consoleLogsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>
                        {consoleLogsOpen && (
                          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                            {consoleLogs.map((log, i) => {
                              const level = (log.level || 'log').toUpperCase()
                              const tagBg = level === 'ERROR' ? 'rgba(239, 68, 68, 0.15)' : level === 'WARN' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)'
                              const tagColor = level === 'ERROR' ? '#f87171' : level === 'WARN' ? '#fbbf24' : '#93c5fd'
                              return (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '5px 14px', borderTop: '1px solid #e2e8f0' }}>
                                  <span style={{ flexShrink: 0, padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: tagBg, color: tagColor }}>{level}</span>
                                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', wordBreak: 'break-word', flex: 1, minWidth: 0 }}>{log.message}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {networkLogs.length > 0 && (
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                        <button type="button" onClick={() => setNetworkLogsOpen(!networkLogsOpen)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(0, 0, 0, 0.03)', cursor: 'pointer', border: 'none', textAlign: 'left', fontFamily: 'inherit' }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>Network ({networkLogs.length})</span>
                          <ChevronDown size={LUCIDE_ICON_PX} style={{ color: '#64748b', transform: networkLogsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>
                        {networkLogsOpen && (
                          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                            {networkLogs.map((log, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderTop: '1px solid #e2e8f0' }}>
                                <span style={{ flexShrink: 0, padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: log.status != null && log.status >= 400 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.15)', color: log.status != null && log.status >= 400 ? '#f87171' : '#4ade80' }}>{log.status ?? '-'}</span>
                                <span style={{ flexShrink: 0, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#475569' }}>{log.method}</span>
                                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }} title={log.url}>{log.url}</span>
                                {log.duration != null && <span style={{ flexShrink: 0, fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>{log.duration}ms</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {submitError && (
                      <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.28)', borderRadius: 8, color: '#f87171', fontSize: 13 }}>{submitError}</div>
                    )}
                  </div>
                </div>

                {/* Sidebar */}
                <div
                  className="fv-modal-sidebar"
                  style={{
                    width: 'clamp(22rem, 28vw, 44rem)',
                    flexShrink: 0,
                    borderLeft: '1px solid #e2e8f0',
                    overflowY: 'auto',
                    padding: '1rem 1.5rem 1.5rem',
                    background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.03) 0%, transparent 40%)',
                  }}
                >
                  <SidebarField label="Tipo" layout="stack" sectionHeading>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {(['BUG', 'SUGGESTION', 'QUESTION', 'PRAISE'] as const).map(val => {
                        const on = type === val
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setType(val)}
                            style={{
                              padding: '8px 6px',
                              borderRadius: 8,
                              border: on ? `2px solid ${widgetColor}` : '1px solid #e2e8f0',
                              background: 'transparent',
                              color: on ? widgetColor : '#475569',
                              fontSize: 11,
                              fontWeight: on ? 600 : 500,
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                              textAlign: 'center',
                              lineHeight: 1.2,
                            }}
                          >
                            {typeLabels[val]}
                          </button>
                        )
                      })}
                    </div>
                  </SidebarField>

                  {type === 'BUG' && (
                    <SidebarField label="Prioridade" layout="stack" sectionHeading>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {severityOpts.map(([val, label, c]) => {
                          const on = severity === val
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setSeverity(val)}
                              style={{
                                padding: '8px 6px',
                                borderRadius: 8,
                                border: on ? `2px solid ${c}` : '1px solid #e2e8f0',
                                background: 'transparent',
                                color: on ? c : '#475569',
                                fontSize: 11,
                                fontWeight: on ? 600 : 500,
                                cursor: 'pointer',
                                boxSizing: 'border-box',
                                textAlign: 'center',
                                lineHeight: 1.2,
                              }}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </SidebarField>
                  )}

                  <div style={{ height: 1, background: '#e2e8f0', margin: '8px 0' }} />

                  <SidebarField label="Navegador" layout="stack">
                    <span style={{ color: '#0f172a' }}>{env.browser}</span>
                  </SidebarField>
                  <SidebarField label="OS" layout="stack">
                    <span style={{ color: '#0f172a' }}>{env.os}</span>
                  </SidebarField>
                  <SidebarField label="Viewport" layout="stack">
                    <span style={{ color: '#0f172a' }}>{env.viewport}</span>
                  </SidebarField>
                  <SidebarField label="Origem" layout="stack">
                    <span style={{ color: '#0f172a' }}>{sourceLabel}</span>
                  </SidebarField>
                  <SidebarField label="Página" layout="stack">
                    <a
                      href={pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#3b82f6', fontWeight: 500, textDecoration: 'none', wordBreak: 'break-all' }}
                    >
                      Abrir {'>'}
                    </a>
                  </SidebarField>
                  <SidebarField label="Console" layout="stack">
                    <span style={{ color: consoleErrs ? '#f87171' : '#64748b' }}>
                      {consoleLogs.length} logs{consoleErrs > 0 ? ` (${consoleErrs} erros)` : ''}
                    </span>
                  </SidebarField>
                  <SidebarField label="Network" layout="stack">
                    <span style={{ color: netFails ? '#f87171' : '#64748b' }}>
                      {networkLogs.length} req.{netFails > 0 ? ` (${netFails} falhas)` : ''}
                    </span>
                  </SidebarField>
                </div>
              </div>

              <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', flexShrink: 0, background: '#ffffff' }}>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || capturing}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    background: submitting || capturing ? 'rgba(0, 0, 0, 0.06)' : 'linear-gradient(92.88deg, #1e293b 9.16%, #1e40af 43.89%, #3b82f6 64.72%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 9999,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: submitting || capturing ? 'not-allowed' : 'pointer',
                    opacity: submitting || capturing ? 0.55 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontFamily: 'inherit',
                    boxShadow: submitting || capturing ? 'none' : 'rgba(30, 41, 59, 0.15) 0px 1px 40px',
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={LUCIDE_ICON_PX} className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    `Enviar ${typeLabels[type] || 'Bug'}`
                  )}
                </button>
                <p style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#64748b' }}>
                  Powered by{' '}
                  <a href="https://buug.io" target="_blank" rel="noopener noreferrer" className="text-primary-text hover:text-off-white transition-colors" style={{ textDecoration: 'none' }}>Buug</a>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
