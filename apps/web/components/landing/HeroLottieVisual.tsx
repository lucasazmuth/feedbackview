'use client'

import { useEffect, useState } from 'react'
import Lottie from 'lottie-react'
import { landingHero } from '@/content/landing.pt-BR'
import { HeroCodeStream } from './HeroCodeStream'

/**
 * Hero visual — /typing-animation.json (“Typing”, 744×512).
 */
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
    <div className="landing-hero-lottie-root">
      <div className="landing-hero-gradient" />
      <div
        className={
          reduceMotion
            ? 'landing-hero-visual-layer landing-hero-visual-layer--reduced'
            : 'landing-hero-visual-layer'
        }
      >
        <HeroCodeStream reduceMotion={reduceMotion} variant="behind" />
        {!reduceMotion ? (
          <div className="landing-hero-lottie-slot">
            {data ? (
              <Lottie
                animationData={data}
                loop
                className="landing-hero-lottie"
                aria-hidden
              />
            ) : (
              <div className="landing-hero-lottie-skel" aria-hidden />
            )}
          </div>
        ) : null}
      </div>
      <div className="landing-hero-live-badge" aria-hidden="true">
        <span
          className={
            reduceMotion
              ? 'landing-hero-live-dot landing-hero-live-dot--static'
              : 'landing-hero-live-dot'
          }
        />
        <span className="landing-hero-live-badge-text">
          {landingHero.liveCaptureLabel}
        </span>
      </div>
    </div>
  )
}
