'use client'

import Link from 'next/link'
import {
  Column,
  Row,
  Heading,
  Text,
  Button,
  Tag,
} from '@once-ui-system/core'
import { landingPricingSection } from '@/content/landing.pt-BR'
import { usePrices } from '@/hooks/usePrices'

interface PricingSectionProps {
  isLoggedIn: boolean
}

export function PricingSection({ isLoggedIn }: PricingSectionProps) {
  const { prices } = usePrices()

  return (
    <section className="landing-section" id="planos">
      <div className="landing-container">
        <div className="landing-section-intro">
          <span className="landing-eyebrow">{landingPricingSection.tag}</span>
          <h2 className="landing-h2">{landingPricingSection.title}</h2>
          <p className="landing-subtitle">{landingPricingSection.sub}</p>
        </div>

        <div className="landing-pricing-grid">
          {/* Free */}
          <div className="landing-pricing-card">
            <Column gap="m">
              <Column gap="xs">
                <Text variant="label-default-s" onBackground="neutral-medium">{landingPricingSection.free.name}</Text>
                <Row gap="xs" vertical="end">
                  <Heading variant="display-strong-s" as="span">R$ 0</Heading>
                  <Text variant="body-default-m" onBackground="neutral-medium" className="landing-pricing-period">{landingPricingSection.period}</Text>
                </Row>
                <Text variant="body-default-s" onBackground="neutral-medium">{landingPricingSection.free.blurb}</Text>
              </Column>
              <div className="landing-pricing-divider" />
              <Column gap="s">
                {landingPricingSection.free.bullets.map((item) => (
                  <Row key={item} gap="s" vertical="center">
                    <Text variant="body-default-m" onBackground="brand-strong" className="landing-pricing-check" aria-hidden="true">&#10003;</Text>
                    <Text variant="body-default-m" onBackground="neutral-strong">{item}</Text>
                  </Row>
                ))}
              </Column>
              <a href="/auth/register" className="landing-pricing-cta">
                <Button variant="secondary" size="l" label={landingPricingSection.free.cta} fillWidth />
              </a>
            </Column>
          </div>

          {/* Pro */}
          <div className="landing-pricing-card landing-pricing-card--popular">
            <div className="landing-pricing-highlight-bar" />
            <Column gap="m">
              <Column gap="xs">
                <Row gap="s" vertical="center">
                  <Text variant="label-default-s" onBackground="neutral-medium">{landingPricingSection.pro.name}</Text>
                  <Tag variant="brand" size="s" label={landingPricingSection.pro.popularLabel} />
                </Row>
                <Row gap="xs" vertical="end">
                  <Heading variant="display-strong-s" as="span">{prices.PRO.monthlyFormatted}</Heading>
                  <Text variant="body-default-m" onBackground="neutral-medium" className="landing-pricing-period">{landingPricingSection.period}</Text>
                </Row>
                <Text variant="body-default-s" onBackground="neutral-medium">{landingPricingSection.pro.blurb}</Text>
              </Column>
              <div className="landing-pricing-divider" />
              <Column gap="s">
                {landingPricingSection.pro.bullets.map((item) => (
                  <Row key={item} gap="s" vertical="center">
                    <Text variant="body-default-m" onBackground="brand-strong" className="landing-pricing-check" aria-hidden="true">&#10003;</Text>
                    <Text variant="body-default-m" onBackground="neutral-strong">{item}</Text>
                  </Row>
                ))}
              </Column>
              <Link href={isLoggedIn ? '/plans' : '/auth/register'} className="landing-pricing-cta">
                <Button variant="primary" size="l" label={landingPricingSection.pro.cta} fillWidth />
              </Link>
            </Column>
          </div>

          {/* Business */}
          <div className="landing-pricing-card">
            <Column gap="m">
              <Column gap="xs">
                <Text variant="label-default-s" onBackground="neutral-medium">{landingPricingSection.business.name}</Text>
                <Row gap="xs" vertical="end">
                  <Heading variant="display-strong-s" as="span">{prices.BUSINESS.monthlyFormatted}</Heading>
                  <Text variant="body-default-m" onBackground="neutral-medium" className="landing-pricing-period">{landingPricingSection.period}</Text>
                </Row>
                <Text variant="body-default-s" onBackground="neutral-medium">{landingPricingSection.business.blurb}</Text>
              </Column>
              <div className="landing-pricing-divider" />
              <Column gap="s">
                {landingPricingSection.business.bullets.map((item) => (
                  <Row key={item} gap="s" vertical="center">
                    <Text variant="body-default-m" onBackground="brand-strong" className="landing-pricing-check" aria-hidden="true">&#10003;</Text>
                    <Text variant="body-default-m" onBackground="neutral-strong">{item}</Text>
                  </Row>
                ))}
              </Column>
              <Link href={isLoggedIn ? '/plans' : '/auth/register'} className="landing-pricing-cta">
                <Button variant="secondary" size="l" label={landingPricingSection.business.cta} fillWidth />
              </Link>
            </Column>
          </div>
        </div>
      </div>
    </section>
  )
}
