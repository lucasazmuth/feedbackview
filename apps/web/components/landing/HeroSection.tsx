'use client'

import type { CSSProperties } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { Container } from '@/components/ui/Container'
import { landingHero, landingAuth } from '@/content/landing.pt-BR'
import { HeroImageFrame } from './HeroImage'
import { LandingEmbedReportModalPreview } from './LandingEmbedReportModalPreview'

interface HeroSectionProps {
  isLoggedIn: boolean
}

export function HeroSection({ isLoggedIn }: HeroSectionProps) {
  return (
    <section className="overflow-hidden pt-navigation-height pb-[6rem] md:pb-[10rem]">
      <Container className="pb-8 pt-12 text-center md:pb-12">
        {/* Tag pill */}
        <span
          className={clsx(
            'mb-8 inline-flex items-center rounded-full border border-transparent-white px-4 py-1.5',
            'text-xs text-primary-text opacity-0 animate-fade-in'
          )}
          style={{ '--animation-delay': '0ms' } as CSSProperties}
        >
          {landingHero.tag}
        </span>

        {/* Title */}
        <h1
          className={clsx(
            'text-gradient text-6xl md:text-8xl font-bold leading-[1.1] tracking-tight',
            'opacity-0 animate-fade-in'
          )}
          style={{ '--animation-delay': '180ms' } as CSSProperties}
        >
          {landingHero.h1Line1}
          <br />
          {landingHero.h1Line2}
        </h1>

        {/* Subtitle */}
        <p
          className={clsx(
            'mx-auto mt-8 max-w-[64rem] text-primary-text text-lg md:text-xl leading-relaxed',
            'opacity-0 animate-fade-in'
          )}
          style={{ '--animation-delay': '340ms' } as CSSProperties}
        >
          {landingHero.sub}
        </p>

        {/* CTAs */}
        <div
          className={clsx(
            'mt-10 flex flex-col sm:flex-row items-center justify-center gap-4',
            'opacity-0 animate-fade-in'
          )}
          style={{ '--animation-delay': '500ms' } as CSSProperties}
        >
          <Link
            href={isLoggedIn ? '/dashboard' : '/auth/register'}
            className={clsx(
              'inline-flex items-center justify-center rounded-full',
              'bg-primary-gradient px-6 py-3 text-md font-medium text-off-white',
              'shadow-primary transition-opacity hover:opacity-90'
            )}
          >
            {isLoggedIn ? landingAuth.accessPanel : landingAuth.signupFree}
          </Link>
          <a
            href="#como-funciona"
            className={clsx(
              'inline-flex items-center justify-center rounded-full',
              'border border-transparent-white px-6 py-3 text-md font-medium text-off-white',
              'transition-colors hover:bg-transparent-white'
            )}
          >
            {landingHero.ctaHow}
          </a>
        </div>

        {/* Proof items */}
        <div
          className={clsx(
            'mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2',
            'opacity-0 animate-fade-in'
          )}
          style={{ '--animation-delay': '620ms' } as CSSProperties}
        >
          {landingHero.proofItems.map((item) => (
            <span
              key={item}
              className="flex items-center gap-2 text-sm text-primary-text"
            >
              <svg
                className="h-4 w-4 text-success"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {item}
            </span>
          ))}
        </div>

        {/* Moldura 3D + modal de report (mesmo fluxo do embed no site) */}
        <div
          className="opacity-0 animate-fade-in"
          style={{ '--animation-delay': '760ms' } as CSSProperties}
        >
          <HeroImageFrame aria-label="Demonstração: modal de report do widget embed Buug">
            <div className="flex min-h-[28rem] w-full flex-col bg-background md:min-h-[32rem]">
              <LandingEmbedReportModalPreview />
            </div>
          </HeroImageFrame>
        </div>
      </Container>
    </section>
  )
}
