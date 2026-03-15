'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'

const FeedbackModal = dynamic(() => import('@/components/viewer/FeedbackModal'), { ssr: false })

const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || 'http://localhost:3002'

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

interface ViewerClientProps {
  projectId: string
  widgetColor?: string
  widgetPosition?: string
  widgetStyle?: string
  widgetText?: string
}

export default function ViewerClient({ projectId, widgetColor = '#4f46e5', widgetPosition = 'bottom-right', widgetStyle = 'text', widgetText = 'Reportar Bug' }: ViewerClientProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([])
  const [networkLogs, setNetworkLogs] = useState<NetworkLog[]>([])
  const [rrwebEvents, setRrwebEvents] = useState<RRWebEvent[]>([])
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null)
  const [realPageUrl, setRealPageUrl] = useState<string | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  // Listen to postMessage events from tracker
  const handleMessage = useCallback((event: MessageEvent) => {
    const { type, payload } = event.data || {}
    if (!type) return

    switch (type) {
      case 'CONSOLE_LOG': {
        const msg = Array.isArray(payload.args)
          ? payload.args.map((a: unknown) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
          : payload.message || ''
        const log: ConsoleLog = {
          level: payload.level || 'log',
          message: msg,
          timestamp: payload.timestamp,
        }
        setConsoleLogs((prev) => [...prev, log])
        break
      }
      case 'JS_ERROR': {
        const log: ConsoleLog = {
          level: 'error',
          message: payload.message || String(payload),
          timestamp: payload.timestamp,
        }
        setConsoleLogs((prev) => [...prev, log])
        break
      }
      case 'NETWORK_LOG': {
        const log: NetworkLog = {
          method: payload.method || 'GET',
          url: payload.url || '',
          status: payload.status,
          duration: payload.duration,
        }
        setNetworkLogs((prev) => [...prev, log])
        break
      }
      case 'RRWEB_EVENT': {
        setRrwebEvents((prev) => {
          const next = [...prev, payload]
          const MAX = 200
          if (next.length <= MAX) return next
          // Keep Meta(4)+Snapshot(2) pair + most recent incremental events
          let snapIdx = -1
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].type === 2) { snapIdx = i; break }
          }
          if (snapIdx < 0) return next.slice(-MAX)
          let metaIdx = snapIdx
          for (let i = snapIdx - 1; i >= 0; i--) {
            if (next[i].type === 4) { metaIdx = i; break }
          }
          const header = next.slice(metaIdx, snapIdx + 1)
          const tail = next.slice(snapIdx + 1)
          const maxTail = MAX - header.length
          const keptTail = tail.length > maxTail ? tail.slice(tail.length - maxTail) : tail
          // Normalize timestamps to close gap
          if (keptTail.length > 0) {
            const snapTs = header[header.length - 1].timestamp
            const firstTs = keptTail[0].timestamp
            const gap = firstTs - snapTs
            if (gap > 2000) {
              const offset = gap - 100
              for (const e of keptTail) e.timestamp -= offset
            }
          }
          return [...header, ...keptTail]
        })
        break
      }
      case 'SCREENSHOT_RESULT': {
        if (payload.dataUrl) {
          setScreenshotDataUrl(payload.dataUrl)
        }
        break
      }
      case 'PAGE_URL':
      case 'PAGE_CHANGE': {
        if (payload.url) {
          setRealPageUrl(payload.url)
        }
        break
      }
    }
  }, [])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  const proxyUrl = `${PROXY_URL}/proxy/${projectId}/`

  // Position styles for the floating button
  const positionStyle: React.CSSProperties = (() => {
    switch (widgetPosition) {
      case 'top-left': return { top: 24, left: 24 }
      case 'top-right': return { top: 24, right: 24 }
      case 'bottom-left': return { bottom: 24, left: 24 }
      default: return { bottom: 24, right: 24 }
    }
  })()

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* Full-screen iframe */}
      <iframe
        ref={iframeRef}
        src={proxyUrl}
        className="w-full h-full border-0"
        title="QA Viewer"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
      />

      {/* Floating report button */}
      {!modalOpen && (
        <button
          onClick={() => {
            iframeRef.current?.contentWindow?.postMessage({ type: 'CAPTURE_SCREENSHOT' }, '*')
            setModalOpen(true)
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          title="Enviar feedback"
          className="fixed z-[2147483646] flex items-center justify-center text-white border-none cursor-pointer transition-all duration-200"
          style={{
            ...positionStyle,
            ...(widgetStyle === 'icon'
              ? { width: 48, height: 48, borderRadius: '50%', padding: 0 }
              : { height: 40, paddingLeft: 14, paddingRight: 16, borderRadius: 20 }),
            background: widgetColor,
            boxShadow: isHovered
              ? `0 6px 20px ${widgetColor}80`
              : `0 4px 12px ${widgetColor}66`,
            transform: isHovered ? 'scale(1.04)' : 'scale(1)',
            gap: 6,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '-0.01em',
          }}
        >
          {widgetStyle === 'icon' ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="15" rx="5" ry="6" />
              <circle cx="12" cy="7" r="3" />
              <path d="M5 9L2 7M19 9l3-2M5 15H2M19 15h3M5 19l-2 2M19 19l2 2" strokeLinecap="round" />
            </svg>
          ) : widgetText}
        </button>
      )}

      {/* Feedback modal — same slide-over panel as embed */}
      {modalOpen && (
        <FeedbackModal
          projectId={projectId}
          iframeRef={iframeRef}
          consoleLogs={consoleLogs}
          networkLogs={networkLogs}
          rrwebEvents={rrwebEvents}
          screenshotFromTracker={screenshotDataUrl}
          pageUrl={realPageUrl}
          widgetColor={widgetColor}
          panelSide={widgetPosition.includes('left') ? 'left' : 'right'}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
