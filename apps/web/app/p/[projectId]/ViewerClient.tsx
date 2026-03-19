'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'

const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || 'https://feedbackview-proxy.onrender.com'

interface ViewerClientProps {
  projectId: string
  widgetColor?: string
  widgetPosition?: string
  widgetStyle?: string
  widgetText?: string
}

export default function ViewerClient({ projectId, widgetColor = '#4f46e5', widgetPosition = 'bottom-right', widgetStyle = 'text', widgetText = 'Reportar Bug' }: ViewerClientProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const proxyUrl = `${PROXY_URL}/proxy/${projectId}/`

  // Forward rrweb/tracker data from iframe to the embed widget via custom events
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const { source, type, payload } = event.data || {}
      if (source !== 'feedbackview-tracker' || !type || !payload) return

      // Forward tracker messages as custom events so embed.js can pick them up
      // Note: SCREENSHOT_RESULT is handled directly by embed.js via message listener
      if (['CONSOLE_LOG', 'JS_ERROR', 'NETWORK_LOG', 'RRWEB_EVENT', 'PAGE_URL', 'PAGE_CHANGE'].includes(type)) {
        window.dispatchEvent(new CustomEvent('feedbackview:tracker-data', { detail: { type, payload } }))
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

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

      {/* Load embed.js — same widget as DEMO and shared links */}
      <Script
        src={`/embed.js?v=${Date.now()}`}
        data-project={projectId}
        strategy="afterInteractive"
      />
    </div>
  )
}
