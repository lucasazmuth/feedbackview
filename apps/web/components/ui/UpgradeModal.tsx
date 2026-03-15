'use client'

import { useState } from 'react'
import { PRICE_IDS } from '@/lib/stripe-shared'

type PlanKey = 'FREE' | 'PRO' | 'BUSINESS'

const PLANS: {
  key: PlanKey
  name: string
  price: string
  period: string
  description: string
  monthlyPriceId: string
  recommended?: boolean
  features: string[]
}[] = [
  {
    key: 'FREE',
    name: 'Gratuito',
    price: 'R$ 0',
    period: '/mês',
    description: 'Para testar a plataforma e projetos pessoais.',
    monthlyPriceId: '',
    features: [
      '1 projeto',
      '50 reports/mês',
      'Screenshot automático',
      'Console & network logs',
      '1 membro',
      'Retenção de 7 dias',
    ],
  },
  {
    key: 'PRO',
    name: 'Pro',
    price: 'R$ 49',
    period: '/mês',
    description: 'Para equipes que precisam de QA profissional.',
    monthlyPriceId: PRICE_IDS.PRO_MONTHLY,
    recommended: true,
    features: [
      '5 projetos',
      'Reports ilimitados',
      'Screenshot + replay de sessão',
      'Console, network & custom logs',
      'Até 10 membros',
      'Retenção de 90 dias',
      'Integrações (Slack, Jira)',
      'Suporte por email',
    ],
  },
  {
    key: 'BUSINESS',
    name: 'Business',
    price: 'R$ 149',
    period: '/mês',
    description: 'Para softhouses e equipes grandes.',
    monthlyPriceId: PRICE_IDS.BUSINESS_MONTHLY,
    features: [
      'Projetos ilimitados',
      'Reports ilimitados',
      'Replay + white-label',
      'Todos os logs + API',
      'Até 50 membros',
      'Retenção de 1 ano',
      'Slack, Jira, Linear, Webhook',
      'Suporte prioritário',
    ],
  },
]

export default function UpgradeModal({
  currentPlan,
  onClose,
}: {
  currentPlan: PlanKey
  onClose: () => void
}) {
  const [selected, setSelected] = useState<PlanKey>(
    currentPlan === 'FREE' ? 'PRO' : currentPlan
  )
  const [upgradeLoading, setUpgradeLoading] = useState(false)

  const selectedPlan = PLANS.find((p) => p.key === selected)!

  const handleUpgrade = async () => {
    if (!selectedPlan.monthlyPriceId || selected === currentPlan) return
    setUpgradeLoading(true)
    try {
      const res = await fetch('/api/billing/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: selectedPlan.monthlyPriceId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      alert('Erro ao criar sessão de pagamento')
    } finally {
      setUpgradeLoading(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface-background)',
          borderRadius: '1rem',
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          position: 'relative',
          boxShadow: '0 24px 48px rgba(0,0,0,0.16)',
        }}
      >
        {/* Left: Plan selector */}
        <div
          style={{
            width: 260,
            flexShrink: 0,
            padding: '1.75rem 1.25rem',
            borderRight: '1px solid var(--neutral-border-medium)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            color: 'var(--neutral-on-background-strong)',
            margin: 0,
            lineHeight: 1.3,
          }}>
            Faça upgrade do seu plano
          </h2>
          <p style={{
            fontSize: '0.8125rem',
            color: 'var(--neutral-on-background-weak)',
            margin: '0 0 0.75rem 0',
            lineHeight: 1.4,
          }}>
            Mais projetos, membros e recursos avançados.
          </p>

          {PLANS.map((plan) => {
            const isSelected = plan.key === selected
            const isCurrent = plan.key === currentPlan

            return (
              <button
                key={plan.key}
                onClick={() => setSelected(plan.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0.875rem',
                  borderRadius: '0.625rem',
                  border: isSelected
                    ? '2px solid var(--brand-border-strong)'
                    : '1px solid var(--neutral-border-medium)',
                  background: isSelected
                    ? 'var(--brand-alpha-weak)'
                    : 'transparent',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  position: 'relative',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'var(--neutral-on-background-strong)',
                    }}>
                      {plan.name}
                    </span>
                    {plan.recommended && (
                      <span style={{
                        fontSize: '0.5625rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '0.125rem 0.375rem',
                        borderRadius: 4,
                        background: 'var(--brand-solid-strong)',
                        color: '#fff',
                      }}>
                        Recomendado
                      </span>
                    )}
                    {isCurrent && (
                      <span style={{
                        fontSize: '0.5625rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '0.125rem 0.375rem',
                        borderRadius: 4,
                        background: 'var(--success-solid-strong)',
                        color: '#fff',
                      }}>
                        Atual
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--neutral-on-background-weak)',
                  }}>
                    {plan.price}{plan.period}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Right: Plan details */}
        <div
          style={{
            flex: 1,
            padding: '1.75rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 32,
              height: 32,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--neutral-on-background-weak)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Plan name + price */}
          <div style={{ marginBottom: '0.25rem' }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--neutral-on-background-strong)',
              margin: 0,
            }}>
              {selectedPlan.name}
            </h3>
            <p style={{
              fontSize: '0.8125rem',
              color: 'var(--neutral-on-background-weak)',
              margin: '0.25rem 0 0',
            }}>
              {selectedPlan.description}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', margin: '1rem 0 0.25rem' }}>
            <span style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: 'var(--neutral-on-background-strong)',
              letterSpacing: '-0.02em',
            }}>
              {selectedPlan.price}
            </span>
            <span style={{
              fontSize: '0.875rem',
              color: 'var(--neutral-on-background-weak)',
            }}>
              {selectedPlan.period}
            </span>
          </div>

          <div style={{
            height: 1,
            background: 'var(--neutral-border-medium)',
            margin: '1rem 0',
          }} />

          {/* Features */}
          <p style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--neutral-on-background-strong)',
            margin: '0 0 0.75rem',
          }}>
            O que inclui
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.625rem 1rem',
            flex: 1,
          }}>
            {selectedPlan.features.map((feature) => (
              <div key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--brand-on-background-strong)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0, marginTop: 2 }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{
                  fontSize: '0.8125rem',
                  color: 'var(--neutral-on-background-strong)',
                  lineHeight: 1.4,
                }}>
                  {feature}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={handleUpgrade}
            disabled={upgradeLoading || selected === currentPlan || selected === 'FREE'}
            style={{
              marginTop: '1.25rem',
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: selected === currentPlan || selected === 'FREE'
                ? 'var(--neutral-alpha-weak)'
                : 'var(--brand-solid-strong)',
              color: selected === currentPlan || selected === 'FREE'
                ? 'var(--neutral-on-background-weak)'
                : '#fff',
              fontWeight: 600,
              fontSize: '0.9375rem',
              cursor: selected === currentPlan || selected === 'FREE' ? 'default' : 'pointer',
              transition: 'opacity 0.15s',
              opacity: upgradeLoading ? 0.7 : 1,
            }}
          >
            {selected === currentPlan
              ? 'Plano atual'
              : selected === 'FREE'
                ? 'Plano gratuito'
                : upgradeLoading
                  ? 'Redirecionando...'
                  : `Assinar ${selectedPlan.name}`}
          </button>
        </div>
      </div>
    </div>
  )
}
