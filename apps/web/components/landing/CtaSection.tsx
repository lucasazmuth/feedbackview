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

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className={clsx(
                'inline-flex items-center justify-center rounded-full',
                'bg-primary-gradient px-8 py-3 text-md font-medium text-white',
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
                  'bg-primary-gradient px-8 py-3 text-md font-medium text-white',
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
      </Container>
    </section>
  )
}
