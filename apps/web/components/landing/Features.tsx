'use client'

import { useRef, type ReactNode } from 'react'
import { useInView } from 'react-intersection-observer'
import clsx from 'clsx'
import { Container } from '@/components/ui/Container'

type FeaturesProps = {
  children: ReactNode
  color: string
  colorDark: string
}

export function Features({ children, color, colorDark }: FeaturesProps) {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: false })

  return (
    <section
      ref={ref}
      className={clsx(
        'landing-section-pad relative after:pointer-events-none',
        'after:absolute after:inset-0 after:[background:radial-gradient(ellipse_100%_40%_at_50%_60%,var(--feature-color),transparent)]',
        'after:opacity-0 after:transition-opacity after:duration-700',
        inView && 'after:opacity-100'
      )}
      style={
        {
          '--feature-color': `rgba(${color},0.15)`,
          '--feature-color-dark': `rgba(${colorDark},0.25)`,
        } as React.CSSProperties
      }
    >
      <Container>{children}</Container>
    </section>
  )
}

const MAIN_IMAGE_ASPECT: Record<'16/9' | '16/10' | '16/11' | '16/12', string> = {
  '16/9': 'aspect-[16/9]',
  '16/10': 'aspect-[16/10]',
  '16/11': 'aspect-[16/11]',
  '16/12': 'aspect-[16/12]',
}

type MainProps = {
  title: ReactNode
  image?: ReactNode
  text: string
  imageSize?: 'small' | 'large'
  /** Sobrescreve a proporção do slot da imagem (útil para mocks altos, ex. modal embed). */
  imageAspect?: keyof typeof MAIN_IMAGE_ASPECT
}

function Main({ title, image, text, imageSize = 'large', imageAspect }: MainProps) {
  const aspect =
    imageAspect != null
      ? MAIN_IMAGE_ASPECT[imageAspect]
      : imageSize === 'large'
        ? MAIN_IMAGE_ASPECT['16/9']
        : MAIN_IMAGE_ASPECT['16/10']

  return (
    <div>
      <h2 className="text-gradient mb-6 text-4xl md:text-5xl font-bold tracking-tight">
        {title}
      </h2>
      <p className="text-primary-text text-lg md:text-xl mb-12 max-w-[68rem]">
        {text}
      </p>
      {image && (
        <div
          className={clsx(
            'relative rounded-[1.2rem] overflow-hidden border border-transparent-white',
            aspect
          )}
        >
          {image}
        </div>
      )}
    </div>
  )
}

type GridItem = {
  icon: ReactNode
  title: string
  text: string
}

function Grid({ items }: { items: GridItem[] }) {
  return (
    <div className="mt-16 grid grid-cols-1 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 gap-x-6">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-transparent-white"
              style={{ background: 'var(--feature-color-dark)' }}
            >
              <span className="text-off-white">{item.icon}</span>
            </span>
            <h3 className="text-off-white text-lg font-medium">{item.title}</h3>
          </div>
          <p className="text-primary-text text-md leading-relaxed">{item.text}</p>
        </div>
      ))}
    </div>
  )
}

type CardItem = {
  title: string
  badge?: string
  body: string
  tags?: string[]
  tagsExclude?: string[]
  image?: ReactNode
}

function Cards({ items }: { items: CardItem[] }) {
  return (
    <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
      {items.map((card, i) => (
        <div
          key={i}
          className={clsx(
            'relative rounded-[2.4rem] p-8 md:p-10 overflow-hidden',
            'bg-glass-gradient border border-transparent-white'
          )}
        >
          {card.badge && (
            <span className="inline-block mb-4 rounded-full bg-transparent-white px-3 py-1 text-xs text-primary-text uppercase tracking-wider">
              {card.badge}
            </span>
          )}
          <h3 className="text-off-white text-xl md:text-2xl font-medium mb-3">
            {card.title}
          </h3>
          <p className="text-primary-text text-md leading-relaxed mb-6">
            {card.body}
          </p>
          {card.tags && card.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {card.tags.map((tag, j) => (
                <span
                  key={j}
                  className="rounded-full bg-transparent-white px-3 py-1 text-xs text-off-white"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {card.tagsExclude && card.tagsExclude.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {card.tagsExclude.map((tag, j) => (
                <span
                  key={j}
                  className="rounded-full bg-transparent-white px-3 py-1 text-xs text-gray"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {card.image && (
            <div className="mt-6 rounded-[1.2rem] overflow-hidden border border-transparent-white">
              {card.image}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

Features.Main = Main
Features.Grid = Grid
Features.Cards = Cards
