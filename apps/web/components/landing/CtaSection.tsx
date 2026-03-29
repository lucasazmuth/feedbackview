'use client'

import Link from 'next/link'
import {
  Flex,
  Column,
  Row,
  Button,
} from '@once-ui-system/core'
import { landingCtaSection, landingAuth } from '@/content/landing.pt-BR'

interface CtaSectionProps {
  isLoggedIn: boolean
}

export function CtaSection({ isLoggedIn }: CtaSectionProps) {
  return (
    <section className="landing-cta">
      <div className="landing-cta-inner">
        <h2 className="landing-cta-title">{landingCtaSection.title}</h2>
        <p className="landing-cta-desc">{landingCtaSection.sub}</p>

        <div className="landing-hero-ctas">
          {isLoggedIn ? (
            <Link href="/dashboard">
              <Button variant="primary" size="l" label={landingAuth.accessPanel} />
            </Link>
          ) : (
            <>
              <Link href="/auth/register">
                <Button variant="primary" size="l" label={landingAuth.createFreeAccount} />
              </Link>
              <Link href="/auth/login">
                <Button variant="tertiary" size="l" label={landingAuth.alreadyHaveAccount} />
              </Link>
            </>
          )}
        </div>

        <div className="landing-cta-trust">
          {landingCtaSection.trust.map((item, i) => (
            <span key={i} className="landing-hero-proof-item">
              <span className="landing-hero-proof-dot" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
