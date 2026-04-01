'use client'

import Link from 'next/link'
import clsx from 'clsx'
import { Container } from '@/components/ui/Container'
import { landingCtaSection, landingAuth } from '@/content/landing.pt-BR'

interface CtaSectionProps {
  isLoggedIn: boolean
}

export function CtaSection({ isLoggedIn }: CtaSectionProps) {
  return (
    <section className="landing-section-pad--cta relative">
      <Container className="relative text-center">
        <h2 className="text-gradient text-4xl md:text-5xl font-bold tracking-tight mb-6">
          {landingCtaSection.title}
        </h2>
        <p className="mx-auto max-w-[48rem] text-primary-text text-lg md:text-xl leading-relaxed mb-10">
          {landingCtaSection.sub}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className={clsx(
                'inline-flex items-center justify-center rounded-full',
                'bg-primary-gradient px-8 py-3 text-md font-medium text-off-white',
                'shadow-primary transition-opacity hover:opacity-90'
              )}
            >
              {landingAuth.accessPanel}
            </Link>
          ) : (
            <>
              <Link
                href="/auth/register"
                className={clsx(
                  'inline-flex items-center justify-center rounded-full',
                  'bg-primary-gradient px-8 py-3 text-md font-medium text-off-white',
                  'shadow-primary transition-opacity hover:opacity-90'
                )}
              >
                {landingAuth.createFreeAccount}
              </Link>
              <Link
                href="/auth/login"
                className="text-sm text-gray transition-colors hover:text-off-white"
              >
                {landingAuth.alreadyHaveAccount}
              </Link>
            </>
          )}
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {landingCtaSection.trust.map((badge) => (
            <span
              key={badge}
              className="inline-flex items-center gap-2 rounded-full border border-transparent-white px-4 py-1.5 text-xs text-primary-text"
            >
              <svg
                className="h-3.5 w-3.5 text-success"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {badge}
            </span>
          ))}
        </div>
      </Container>
    </section>
  )
}
