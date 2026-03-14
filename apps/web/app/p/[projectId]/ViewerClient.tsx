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
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

export default function ViewerClient({ projectId }: ViewerClientProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([])
  const [networkLogs, setNetworkLogs] = useState<NetworkLog[]>([])
  const [rrwebEvents, setRrwebEvents] = useState<RRWebEvent[]>([])
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null)
  const [realPageUrl, setRealPageUrl] = useState<string | null>(null)

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Listen to postMessage events from tracker
  const handleMessage = useCallback((event: MessageEvent) => {
    const { type, payload } = event.data || {}
    if (!type) return

    switch (type) {
      case 'CONSOLE_LOG': {
        // Tracker sends payload.args (array), convert to string message
        const msg = Array.isArray(payload.args)
          ? payload.args.map((a: unknown) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
          : payload.message || ''
        const log: ConsoleLog = {
          level: payload.level || 'log',
          message: msg,
          timestamp: payload.timestamp,
        }
        setConsoleLogs((prev) => [...prev, log])
        if (log.level === 'error') {
          setErrorCount((c) => c + 1)
        }
        break
      }
      case 'JS_ERROR': {
        const log: ConsoleLog = {
          level: 'error',
          message: payload.message || String(payload),
          timestamp: payload.timestamp,
        }
        setConsoleLogs((prev) => [...prev, log])
        setErrorCount((c) => c + 1)
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

  return (
    <div className="flex flex-col h-screen bg-gray-950 overflow-hidden">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 bg-gray-900 border-b border-gray-800 flex-shrink-0"
        style={{ height: '48px' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center">
            <span className="text-white font-bold text-xs">Q</span>
          </div>
          <span className="text-white font-semibold text-sm hidden sm:block">Qbug</span>
        </div>

        {/* Center: timer + status */}
        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs font-mono">{formatTime(elapsedSeconds)}</span>
          </div>

          {/* Capturing indicator */}
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-green-400 text-xs font-medium">Capturando</span>
          </div>

          {/* Error counter */}
          {errorCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-red-900/50 border border-red-700 rounded-full">
              <span className="text-red-400 text-xs font-bold">{errorCount}</span>
              <span className="text-red-400 text-xs">erro{errorCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Right: Send feedback button */}
        <button
          onClick={() => {
            // Request screenshot from tracker inside iframe before opening modal
            iframeRef.current?.contentWindow?.postMessage({ type: 'CAPTURE_SCREENSHOT' }, '*')
            setModalOpen(true)
          }}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Enviar Feedback
        </button>
      </div>

      {/* iframe */}
      <div className="flex-1 relative overflow-hidden">
        <iframe
          ref={iframeRef}
          src={proxyUrl}
          className="w-full h-full border-0"
          style={{
            outline: '2px solid rgba(99, 102, 241, 0.4)',
            outlineOffset: '-2px',
          }}
          title="QA Viewer"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
        {/* Animated border overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, rgba(99,102,241,0.15) 0%, transparent 30%, transparent 70%, rgba(99,102,241,0.15) 100%)',
          }}
        />
      </div>

      {/* Feedback modal */}
      {modalOpen && (
        <FeedbackModal
          projectId={projectId}
          iframeRef={iframeRef}
          consoleLogs={consoleLogs}
          networkLogs={networkLogs}
          rrwebEvents={rrwebEvents}
          screenshotFromTracker={screenshotDataUrl}
          pageUrl={realPageUrl}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
