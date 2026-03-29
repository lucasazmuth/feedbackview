'use client'

import { useState, useEffect } from 'react'
import { landingFlow } from '@/content/landing.pt-BR'
import { StepVisuals } from './StepVisuals'

const STEP_COUNT = 4
/** Ritmo tipo “GIF”: troca automática, sem paginação clicável */
const STEP_MS = 5200

export function HowItWorksSection() {
  const [heroStep, setHeroStep] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)

  const heroLabels = [...landingFlow.stepLabels]
  const heroUrls = [...landingFlow.browserUrls]
  const heroTitles = [...landingFlow.titles]
  const heroDescs = [...landingFlow.descriptions]

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
    const onChange = () => setReduceMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reduceMotion) return
    const id = window.setInterval(() => {
      setHeroStep(s => (s + 1) % STEP_COUNT)
    }, STEP_MS)
    return () => window.clearInterval(id)
  }, [reduceMotion])

  const visualStep = reduceMotion ? 0 : heroStep

  return (
    <section
      id="como-funciona"
      className="landing-how-section landing-section--alt"
    >
      <div
        className="landing-how-inner"
        role="region"
        aria-label={landingFlow.sectionTag}
        style={{ ['--landing-how-step-ms' as string]: `${STEP_MS}ms` }}
      >
        <div className="landing-how-visual">
          <div className="landing-browser-frame landing-how-browser-frame">
            <div className="landing-browser-chrome">
              <div className="landing-browser-dots">
                <span className="landing-browser-dot landing-browser-dot--red" />
                <span className="landing-browser-dot landing-browser-dot--yellow" />
                <span className="landing-browser-dot landing-browser-dot--green" />
              </div>
              <div className="landing-browser-url">
                {heroUrls[visualStep]}
              </div>
              {!reduceMotion && visualStep >= 1 && visualStep <= 2 && (
                <div className="landing-rec-badge">
                  <span className="hero-recording-dot" />
                  <span className="landing-rec-text">REC</span>
                </div>
              )}
            </div>

            <div className="landing-browser-screen landing-how-browser-screen">
              <div key={visualStep} className="landing-how-step-layer hero-step-visual">
                <StepVisuals step={visualStep} />
              </div>
            </div>

            {!reduceMotion && (
              <div className="landing-how-timer-track" aria-hidden="true">
                <div key={heroStep} className="landing-how-timer-bar" />
              </div>
            )}
          </div>
        </div>

        <div
          className="landing-how-copy"
          {...(!reduceMotion ? { 'aria-live': 'polite' as const, 'aria-atomic': true } : {})}
        >
          <p className="landing-how-kicker">
            <span className="landing-how-kicker-line" aria-hidden="true" />
            <span className="landing-how-kicker-text">{landingFlow.sectionTag}</span>
            <span className="landing-how-kicker-line" aria-hidden="true" />
          </p>

          {reduceMotion ? (
            <ol className="landing-how-static-steps">
              {heroTitles.map((title, i) => (
                <li key={title} className="landing-how-static-steps-item">
                  <span className="landing-how-static-steps-label">
                    {i + 1}. {heroLabels[i]}
                  </span>
                  <h3 className="landing-how-static-steps-heading">{title}</h3>
                  <p className="landing-subtitle landing-how-caption-desc">{heroDescs[i]}</p>
                </li>
              ))}
            </ol>
          ) : (
            <>
              <div key={heroStep} className="landing-how-caption hero-step-visual">
                <h2 className="landing-h2 landing-how-caption-title">{heroTitles[heroStep]}</h2>
                <p className="landing-subtitle landing-how-caption-desc">{heroDescs[heroStep]}</p>
              </div>

              <div className="landing-how-passive-dots" aria-hidden="true">
                {heroLabels.map((label, i) => (
                  <span
                    key={label}
                    className={`landing-how-passive-dot ${i === heroStep ? 'landing-how-passive-dot--active' : ''}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
