'use client'

import { useEffect, useRef, useState } from 'react'
import 'rrweb-player/dist/style.css'

interface SessionReplayProps {
  events: any[]
}

export default function SessionReplay({ events }: SessionReplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || events.length < 2) return

    let mounted = true

    async function initPlayer() {
      try {
        // Dynamic import for rrweb-player (client-only)
        const { default: rrwebPlayer } = await import('rrweb-player')

        if (!mounted || !containerRef.current) return

        // Clear previous player
        containerRef.current.innerHTML = ''

        const player = new rrwebPlayer({
          target: containerRef.current,
          props: {
            events,
            width: 460,
            height: 280,
            autoPlay: false,
            showController: true,
            speedOption: [1, 2, 4, 8],
          },
        })

        playerRef.current = player
        if (mounted) setReady(true)
      } catch (err: any) {
        console.error('rrweb-player init error:', err)
        if (mounted) setError('Erro ao carregar o player de replay.')
      }
    }

    initPlayer()

    return () => {
      mounted = false
      if (playerRef.current) {
        try { playerRef.current.$destroy?.() } catch {}
        playerRef.current = null
      }
    }
  }, [events])

  if (events.length < 2) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-400">Eventos insuficientes para replay.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-4 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="rounded-lg overflow-hidden border border-gray-200 bg-gray-900"
        style={{ minHeight: '280px' }}
      />
      <p className="text-xs text-gray-400 text-center">
        {events.length} eventos capturados
      </p>
    </div>
  )
}
