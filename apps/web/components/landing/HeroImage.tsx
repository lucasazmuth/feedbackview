'use client'

import { useRef, useEffect, useState, type ReactNode } from 'react'
import { useInView } from 'react-intersection-observer'
import clsx from 'clsx'
import { HeroReportsMockup } from './HeroReportsMockup'

function randomNumber(min: number, max: number) {
  return Math.floor(Math.random() * (max - min) + min)
}

type Line = {
  id: string
  direction: 'to-right' | 'to-bottom'
  size: number
  duration: string
}

export type HeroImageFrameProps = {
  children: ReactNode
  /** Quando true, preenche o pai (ex.: slot aspect da seção) e remove o `mt` do hero. */
  embedded?: boolean
  'aria-label'?: string
}

/**
 * Moldura 3D (perspectiva, gradiente, linhas, glow); reutilizável no hero ou em outras seções.
 */
export function HeroImageFrame({ children, embedded = false, 'aria-label': ariaLabel }: HeroImageFrameProps) {
  const { ref, inView } = useInView({ threshold: 0.4, triggerOnce: true })
  const [lines, setLines] = useState<Line[]>([])
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  useEffect(() => {
    if (!inView) return

    const addLine = () => {
      const direction = Math.random() > 0.5 ? 'to-right' : 'to-bottom'
      const newLine: Line = {
        id: Math.random().toString(36).slice(2, 9),
        direction,
        size: randomNumber(10, 30),
        duration: `${randomNumber(1200, 3500)}ms`,
      }
      setLines((prev) => [...prev, newLine])
      timeoutRef.current = setTimeout(addLine, randomNumber(800, 2500))
    }

    addLine()
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [inView])

  return (
    <div
      ref={ref}
      className={clsx('[perspective:2000px]', embedded ? 'h-full min-h-0 w-full' : 'mt-[12.8rem]')}
    >
      <div
        className={clsx(
          'relative rounded-[1.2rem] border border-transparent-white bg-background bg-hero-gradient',
          embedded && 'flex h-full min-h-0 flex-col overflow-hidden',
          inView ? 'animate-image-rotate' : '[transform:rotateX(25deg)]',
          'before:absolute before:inset-0 before:-z-10 before:rounded-[1.2rem]',
          'before:bg-hero-glow before:opacity-0 before:[filter:blur(120px)]',
          inView && 'before:animate-image-glow'
        )}
      >
        <svg
          className={clsx(
            'pointer-events-none absolute inset-0 h-full w-full',
            '[stroke-linecap:round] [stroke-width:2]',
            inView && '[&_line]:animate-sketch-lines'
          )}
          viewBox="0 0 1499 778"
          fill="none"
        >
          <line
            pathLength="1"
            x1="0"
            y1="1"
            x2="1499"
            y2="1"
            stroke="white"
            className="opacity-20 [stroke-dasharray:1] [stroke-dashoffset:1]"
          />
          <line
            pathLength="1"
            x1="1"
            y1="0"
            x2="1"
            y2="778"
            stroke="white"
            className="opacity-20 [stroke-dasharray:1] [stroke-dashoffset:1]"
          />
          <line
            pathLength="1"
            x1="1498"
            y1="0"
            x2="1498"
            y2="778"
            stroke="white"
            className="opacity-20 [stroke-dasharray:1] [stroke-dashoffset:1]"
          />
          <line
            pathLength="1"
            x1="0"
            y1="777"
            x2="1499"
            y2="777"
            stroke="white"
            className="opacity-20 [stroke-dasharray:1] [stroke-dashoffset:1]"
          />
        </svg>

        {lines.map((line) => (
          <span
            key={line.id}
            onAnimationEnd={() => removeLine(line.id)}
            style={
              {
                '--animation-duration': line.duration,
                '--direction': line.direction === 'to-right' ? '90deg' : '180deg',
                top: line.direction === 'to-right' ? `${randomNumber(0, 100)}%` : 0,
                left: line.direction === 'to-bottom' ? `${randomNumber(0, 100)}%` : 0,
                width: line.direction === 'to-right' ? `${line.size}rem` : '0.1rem',
                height: line.direction === 'to-bottom' ? `${line.size}rem` : '0.1rem',
              } as React.CSSProperties
            }
            className={clsx(
              'absolute block rounded-full bg-glow-lines opacity-0',
              line.direction === 'to-right'
                ? 'animate-glow-line-horizontal'
                : 'animate-glow-line-vertical'
            )}
          />
        ))}

        <div
          role="img"
          aria-label={ariaLabel ?? 'Buug'}
          className={clsx(
            'relative w-full overflow-hidden rounded-[inherit]',
            embedded && 'flex min-h-0 flex-1 flex-col',
            'transition-opacity delay-[680ms]',
            inView ? 'opacity-100' : 'opacity-0'
          )}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

/** Hero principal: moldura + mock da lista Reports (histórico). */
export function HeroImage() {
  return (
    <HeroImageFrame aria-label="Buug: prévia da tela de Reports">
      <HeroReportsMockup />
    </HeroImageFrame>
  )
}
