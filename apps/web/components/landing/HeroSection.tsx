import Link from 'next/link'
import {
  Flex,
  Column,
  Row,
  Heading,
  Text,
  Button,
} from '@once-ui-system/core'
import { landingHero, landingAuth } from '@/content/landing.pt-BR'
import { HeroLottieVisual } from './HeroLottieVisual'

interface HeroSectionProps {
  isLoggedIn: boolean
}

export function HeroSection({ isLoggedIn }: HeroSectionProps) {
  return (
    <section className="landing-hero landing-hero--overlap-how">
      <div className="landing-hero-inner">
        <div className="landing-hero-text">
          <span className="landing-hero-eyebrow">{landingHero.tag}</span>

          <h1 className="landing-hero-h1">
            {landingHero.h1}
          </h1>

          <p className="landing-hero-sub">
            {landingHero.sub}
          </p>

          <div className="landing-hero-ctas">
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button variant="primary" size="l" label={landingAuth.accessPanel} />
              </Link>
            ) : (
              <>
                <Link href="/auth/register">
                  <Button variant="primary" size="l" label={landingAuth.signupFree} />
                </Link>
                <a href="#como-funciona">
                  <Button variant="secondary" size="l" label={landingHero.ctaHow} />
                </a>
              </>
            )}
          </div>

          <div className="landing-hero-proof">
            {landingHero.proofItems.map((item, i) => (
              <span key={i} className="landing-hero-proof-item">
                <span className="landing-hero-proof-dot" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="landing-hero-visual" aria-hidden="true">
          <HeroLottieVisual />
        </div>
      </div>
    </section>
  )
}
