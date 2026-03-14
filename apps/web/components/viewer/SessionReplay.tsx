'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface SessionReplayProps {
  events: any[]
}

const SPEEDS = [1, 2, 4, 8]

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function SessionReplay({ events }: SessionReplayProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const replayerRef = useRef<any>(null)
  const rafRef = useRef<number | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Tick loop to update progress
  const tick = useCallback(() => {
    if (replayerRef.current) {
      const meta = replayerRef.current.getMetaData()
      const current = replayerRef.current.getCurrentTime()
      setCurrentTime(current)

      // Check if replay ended
      if (current >= meta.totalTime) {
        setPlaying(false)
        return
      }
    }
    if (playing) {
      rafRef.current = requestAnimationFrame(tick)
    }
  }, [playing])

  useEffect(() => {
    if (playing) {
      rafRef.current = requestAnimationFrame(tick)
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playing, tick])

  // Scale the replayer to fit the container
  const applyScale = useCallback(() => {
    if (!frameRef.current) return
    const wrapper = frameRef.current.querySelector('.replayer-wrapper') as HTMLElement
    const iframe = frameRef.current.querySelector('iframe') as HTMLIFrameElement
    if (!wrapper || !iframe) return

    const containerWidth = frameRef.current.clientWidth
    const iframeWidth = iframe.width ? parseInt(iframe.width as string, 10) : iframe.offsetWidth
    if (iframeWidth > 0 && containerWidth > 0) {
      const scale = containerWidth / iframeWidth
      wrapper.style.transform = `scale(${scale})`
      wrapper.style.transformOrigin = 'top left'
    }
  }, [])

  useEffect(() => {
    if (!frameRef.current || !wrapperRef.current || events.length < 2) return

    let mounted = true

    async function init() {
      try {
        const rrweb = await import('rrweb')
        const Replayer = rrweb.Replayer

        if (!mounted || !frameRef.current || !wrapperRef.current) return

        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
        if (!mounted || !frameRef.current || !wrapperRef.current) return

        frameRef.current.innerHTML = ''

        const replayer = new Replayer(events, {
          root: frameRef.current,
          skipInactive: true,
          showWarning: false,
          showDebug: false,
          blockClass: 'rr-block',
          liveMode: false,
          insertStyleRules: [
            'iframe { border: none !important; }',
          ],
        })

        replayerRef.current = replayer
        const meta = replayer.getMetaData()
        setTotalTime(meta.totalTime)
        setReady(true)

        // Apply scaling after replayer renders
        requestAnimationFrame(() => {
          if (mounted) applyScale()
        })
      } catch (err: any) {
        console.error('Replayer init error:', err)
        if (mounted) setError('Erro ao carregar o replay.')
      }
    }

    init()

    return () => {
      mounted = false
      if (replayerRef.current) {
        try { replayerRef.current.pause() } catch {}
        replayerRef.current = null
      }
    }
  }, [events, applyScale])

  // Re-scale on window resize
  useEffect(() => {
    const handleResize = () => applyScale()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [applyScale])

  function handlePlayPause() {
    if (!replayerRef.current) return
    if (playing) {
      replayerRef.current.pause()
      setPlaying(false)
    } else {
      const meta = replayerRef.current.getMetaData()
      if (currentTime >= meta.totalTime) {
        replayerRef.current.play(0)
        setCurrentTime(0)
      } else {
        replayerRef.current.resume(currentTime)
      }
      setPlaying(true)
    }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!replayerRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const time = Math.floor(ratio * totalTime)
    replayerRef.current.play(time)
    setCurrentTime(time)
    if (!playing) {
      // Pause at the seeked position
      setTimeout(() => replayerRef.current?.pause(time), 50)
    }
  }

  function handleSpeed(newSpeed: number) {
    setSpeed(newSpeed)
    if (replayerRef.current) {
      replayerRef.current.setConfig({ speed: newSpeed })
    }
  }

  function handleFullscreen() {
    if (!wrapperRef.current) return
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const progress = totalTime > 0 ? (currentTime / totalTime) * 100 : 0

  if (events.length < 2) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-on-background-weak)', fontSize: '0.875rem' }}>
        Eventos insuficientes para replay.
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--danger-on-background-strong)', fontSize: '0.875rem' }}>
        {error}
      </div>
    )
  }

  return (
    <div
      ref={wrapperRef}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: isFullscreen ? '#000' : 'var(--neutral-alpha-weak)',
        borderRadius: isFullscreen ? 0 : undefined,
        overflow: 'hidden',
      }}
    >
      <style>{`
        .replayer-wrapper { position: relative !important; }
        .replayer-wrapper iframe { border: none !important; }
        .replayer-mouse {
          position: absolute;
          width: 20px;
          height: 20px;
          transition: left 0.05s linear, top 0.05s linear;
          background-size: contain;
          background-repeat: no-repeat;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' stroke='%23fff' stroke-width='1' d='M5.5 3.21V20.8l4.86-4.86h6.78L5.5 3.21z'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 999;
        }
        .replayer-mouse::after {
          content: '';
          display: block;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(255, 68, 68, 0.4);
          position: absolute;
          top: -2px;
          left: -2px;
          opacity: 0;
          pointer-events: none;
        }
        .replayer-mouse.active::after {
          opacity: 1;
          animation: click-ripple 0.4s ease-out;
        }
        @keyframes click-ripple {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .replayer-mouse-tail {
          position: absolute !important;
          top: 0;
          left: 0;
          pointer-events: none;
        }
      `}</style>

      {/* Replay frame */}
      <div
        ref={frameRef}
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          overflow: 'hidden',
          position: 'relative',
          cursor: 'pointer',
        }}
        onClick={handlePlayPause}
      />

      {/* Custom controls */}
      {ready && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            background: isFullscreen ? 'rgba(0,0,0,0.8)' : 'var(--surface-background)',
          }}
        >
          {/* Progress bar */}
          <div
            onClick={handleSeek}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: 'var(--neutral-alpha-weak)',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                borderRadius: '3px',
                background: 'var(--brand-solid-strong)',
                transition: playing ? 'none' : 'width 0.1s ease',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `${progress}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: 'var(--brand-solid-strong)',
                border: '2px solid var(--surface-background)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }}
            />
          </div>

          {/* Controls row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Left: play + time */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={handlePlayPause}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'var(--brand-solid-strong)',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
              >
                {playing ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11-7.36a1 1 0 0 0 0-1.72l-11-7.36A1 1 0 0 0 8 5.14z" />
                  </svg>
                )}
              </button>
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: isFullscreen ? '#fff' : 'var(--neutral-on-background-weak)', whiteSpace: 'nowrap' }}>
                {formatTime(currentTime)} / {formatTime(totalTime)}
              </span>
            </div>

            {/* Right: speed + fullscreen */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeed(s)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    background: speed === s ? 'var(--brand-solid-strong)' : 'transparent',
                    color: speed === s ? '#fff' : (isFullscreen ? '#aaa' : 'var(--neutral-on-background-weak)'),
                    fontSize: '0.6875rem',
                    fontWeight: speed === s ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {s}x
                </button>
              ))}
              <div style={{ width: '1px', height: '1rem', background: 'var(--neutral-border-medium)', margin: '0 0.25rem' }} />
              <button
                onClick={handleFullscreen}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '1.75rem',
                  height: '1.75rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  background: 'transparent',
                  color: isFullscreen ? '#fff' : 'var(--neutral-on-background-weak)',
                  cursor: 'pointer',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isFullscreen ? (
                    <>
                      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                    </>
                  ) : (
                    <>
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
