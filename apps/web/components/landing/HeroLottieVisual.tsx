'use client'

import { useEffect, useState } from 'react'
import Lottie from 'lottie-react'
import { landingHero } from '@/content/landing.pt-BR'
import { HeroCodeStream } from './HeroCodeStream'

export function HeroLottieVisual() {
  const [data, setData] = useState<unknown>(null)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
    const onChange = () => setReduceMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reduceMotion) return
    let cancelled = false
    fetch('/typing-animation.json')
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
    return () => {
      cancelled = true
    }
  }, [reduceMotion])

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      {/* Code stream behind */}
      <div
        className="absolute inset-0 z-0"
        style={{ opacity: reduceMotion ? 0.12 : 0.065 }}
      >
        <HeroCodeStream reduceMotion={reduceMotion} variant="behind" />
      </div>

      {/* Lottie: cartão quadrado — centraliza na área útil abaixo do badge */}
      {!reduceMotion && (
        <div className="relative z-[2] flex h-full min-h-0 w-full flex-col items-center justify-center px-2 pb-2 pt-11 sm:px-3 sm:pt-12">
          {data ? (
            <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center px-1">
              <Lottie
                animationData={data}
                loop
                className="max-h-full w-auto max-w-full flex-shrink-0"
                style={{ height: '100%', width: 'auto', maxWidth: '100%' }}
                aria-hidden
              />
            </div>
          ) : (
            <div
              className="mx-auto aspect-[744/512] h-full max-h-full w-auto max-w-full rounded-xl"
              style={{
                background: 'var(--neutral-alpha-weak)',
                border: '1px solid var(--neutral-border-medium)',
                animation: 'landing-hero-lottie-skel-pulse 1.2s ease-in-out infinite',
              }}
              aria-hidden
            />
          )}
        </div>
      )}

      {/* Live badge */}
      <div
        className="absolute top-3.5 left-3.5 z-[4] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wide backdrop-blur-lg"
        style={{
          color: 'var(--neutral-on-background-strong)',
          background: 'color-mix(in srgb, var(--surface-background) 86%, transparent)',
          border: '1px solid var(--neutral-border-medium)',
          boxShadow: '0 2px 14px color-mix(in srgb, var(--neutral-solid-strong) 8%, transparent)',
        }}
        aria-hidden="true"
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{
            background: 'var(--danger-solid-strong)',
            boxShadow: reduceMotion
              ? 'none'
              : '0 0 0 0 color-mix(in srgb, var(--danger-solid-strong) 45%, transparent)',
            animation: reduceMotion ? 'none' : 'landing-hero-live-dot-pulse 1.6s ease-in-out infinite',
          }}
        />
        <span className="leading-none">{landingHero.liveCaptureLabel}</span>
      </div>
    </div>
  )
}
