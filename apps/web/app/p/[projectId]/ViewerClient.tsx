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
}

export default function ViewerClient({ projectId, widgetColor = '#4f46e5', widgetPosition = 'bottom-right' }: ViewerClientProps) {
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
        setRrwebEvents((prev) => [...prev, payload])
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

  const bugIconSvg = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>
    </svg>
  )

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

      {/* Floating bug button — same as embed widget */}
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
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: widgetColor,
            boxShadow: isHovered
              ? `0 6px 20px ${widgetColor}80`
              : `0 4px 12px ${widgetColor}66`,
            transform: isHovered ? 'scale(1.08)' : 'scale(1)',
          }}
        >
          {bugIconSvg}
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
