'use client'

import Link from 'next/link'
import clsx from 'clsx'
import { Container } from '@/components/ui/Container'
import { landingPricingSection } from '@/content/landing.pt-BR'
import { usePrices } from '@/hooks/usePrices'

interface PricingSectionProps {
  isLoggedIn: boolean
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={clsx('h-4 w-4 shrink-0', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function PricingSection({ isLoggedIn }: PricingSectionProps) {
  const { prices } = usePrices()

  const plans = [
    {
      ...landingPricingSection.free,
      price: 'R$ 0',
      popular: false,
    },
    {
      ...landingPricingSection.pro,
      price: prices.PRO.monthlyFormatted,
      popular: true,
    },
    {
      ...landingPricingSection.business,
      price: prices.BUSINESS.monthlyFormatted,
      popular: false,
    },
  ]

  return (
    <section className="landing-section-pad" id="planos">
      <Container>
        {/* Section header */}
        <div className="landing-section-intro">
          <span className="mb-4 inline-flex items-center rounded-full border border-transparent-white px-4 py-1 text-xs text-primary-text uppercase tracking-wider">
            {landingPricingSection.tag}
          </span>
          <h2 className="text-gradient text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {landingPricingSection.title}
          </h2>
          <p className="text-primary-text text-lg leading-relaxed">
            {landingPricingSection.sub}
          </p>
        </div>

        {/* Cards */}
        <div className="mx-auto max-w-[96rem] grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={clsx(
                'relative flex flex-col gap-6 rounded-[2.4rem] p-8',
                plan.popular
                  ? 'border-2 border-[rgba(80,63,205,0.6)] shadow-primary bg-glass-gradient'
                  : 'border border-transparent-white bg-glass-gradient'
              )}
            >
              {/* Popular badge */}
              {plan.popular && 'popularLabel' in plan && (
                <span
                  className={clsx(
                    'absolute -top-3 left-1/2 -translate-x-1/2',
                    'rounded-full bg-primary-gradient px-4 py-1 text-xs font-bold text-off-white'
                  )}
                >
                  {(plan as typeof landingPricingSection.pro).popularLabel}
                </span>
              )}

              {/* Name + price */}
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-primary-text mb-2">
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-off-white text-4xl font-extrabold tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-gray text-sm">{landingPricingSection.period}</span>
                </div>
                <p className="text-primary-text text-sm mt-2">{plan.blurb}</p>
              </div>

              {/* CTA */}
              <Link
                href={
                  plan.popular || plan.name === 'Business'
                    ? isLoggedIn
                      ? '/plans'
                      : '/auth/register'
                    : '/auth/register'
                }
                className={clsx(
                  'inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90',
                  plan.popular
                    ? 'bg-primary-gradient text-off-white shadow-primary'
                    : 'border border-transparent-white text-off-white hover:bg-transparent-white'
                )}
              >
                {plan.cta}
              </Link>

              {/* Divider */}
              <div className="h-px bg-transparent-white" />

              {/* Bullets */}
              <ul className="flex flex-col gap-3 flex-1">
                {plan.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3 text-sm text-primary-text">
                    <CheckIcon className={plan.popular ? 'text-[#818cf8]' : 'text-gray'} />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
