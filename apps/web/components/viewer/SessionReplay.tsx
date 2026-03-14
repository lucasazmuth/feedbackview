'use client'

import { useEffect, useRef, useState } from 'react'
import 'rrweb-player/dist/style.css'

interface SessionReplayProps {
  events: any[]
}

export default function SessionReplay({ events }: SessionReplayProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || !wrapperRef.current || events.length < 2) return

    let mounted = true

    async function initPlayer() {
      try {
        const { default: rrwebPlayer } = await import('rrweb-player')

        if (!mounted || !containerRef.current || !wrapperRef.current) return

        // Use container's actual width for responsive sizing
        const width = wrapperRef.current.clientWidth
        const height = Math.round(width * 9 / 16) // 16:9 aspect ratio

        // Clear previous player
        containerRef.current.innerHTML = ''

        const player = new rrwebPlayer({
          target: containerRef.current,
          props: {
            events,
            width,
            height,
            autoPlay: false,
            showController: true,
            speedOption: [1, 2, 4, 8],
          },
        })

        playerRef.current = player
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
    <div ref={wrapperRef} className="space-y-2">
      <div
        ref={containerRef}
        className="rounded-lg overflow-hidden border border-gray-200 [&_.rr-player]:!w-full [&_.rr-player__frame]:!w-full"
      />
      <p className="text-xs text-gray-400 text-center">
        {events.length} eventos capturados
      </p>
    </div>
  )
}
