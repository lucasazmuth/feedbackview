'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Column,
  Row,
  Heading,
  Text,
  Button,
  Tag,
  Feedback,
} from '@once-ui-system/core'
import AppLayout from '@/components/ui/AppLayout'
import { type Plan } from '@/lib/limits'
import { PRICE_IDS } from '@/lib/stripe-shared'

const PLANS: {
  key: Plan
  name: string
  price: string
  period: string
  description: string
  monthlyPriceId: string
  features: string[]
  highlight?: boolean
}[] = [
  {
    key: 'FREE',
    name: 'Gratuito',
    price: 'R$ 0',
    period: '/mês',
    description: 'Para testar a plataforma e projetos pessoais.',
    monthlyPriceId: '',
    features: [
      '10 reports (total)',
      'Projetos ilimitados',
      'Membros ilimitados',
      'Screenshot + replay de sessão',
      'Console & network logs',
      'Retenção de 7 dias',
      'Suporte por email',
    ],
  },
  {
    key: 'PRO',
    name: 'Pro',
    price: 'R$ 49',
    period: '/mês',
    description: 'Para equipes que precisam de QA profissional.',
    monthlyPriceId: PRICE_IDS.PRO_MONTHLY,
    highlight: true,
    features: [
      '2.000 reports/mês',
      'Projetos ilimitados',
      'Membros ilimitados',
      'Screenshot + replay de sessão',
      'Console, network & custom logs',
      'Retenção de 90 dias',
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
      '10.000 reports/mês',
      'Projetos ilimitados',
      'Membros ilimitados',
      'Screenshot + replay de sessão',
      'Console, network & custom logs',
      'Retenção de 1 ano',
      'Suporte prioritário',
    ],
  },
]

function UpgradeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<Plan>('FREE')
  const [stripeSubscriptionId, setStripeSubscriptionId] = useState<string | null>(null)

  const success = searchParams.get('success') === 'true'
  const canceled = searchParams.get('canceled') === 'true'

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/subscription')
      if (res.ok) {
        const data = await res.json()
        setCurrentPlan(data.organization.plan || 'FREE')
        setStripeSubscriptionId(data.organization.stripeSubscriptionId)
      }
    } catch {
      // defaults
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleUpgrade = async (priceId: string) => {
    setUpgradeLoading(priceId)
    try {
      const res = await fetch('/api/billing/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      alert('Erro ao criar sessão de pagamento')
    } finally {
      setUpgradeLoading(null)
    }
  }

  const handleManageSubscription = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      alert('Erro ao abrir portal de assinatura')
    } finally {
      setPortalLoading(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <Column as="main" fillWidth paddingX="xl" paddingY="l" gap="l" style={{ margin: '0 auto', maxWidth: '72rem' }}>
          <Text variant="body-default-m" onBackground="neutral-weak">Carregando...</Text>
        </Column>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Column as="main" fillWidth paddingX="xl" paddingY="l" gap="xl" style={{ margin: '0 auto', maxWidth: '72rem' }}>
        <Column gap="s">
          <Button variant="tertiary" size="s" label="← Voltar para Planos" onClick={() => router.push('/plans')} />
          <Column gap="xs" horizontal="center" style={{ textAlign: 'center' }}>
            <Heading variant="heading-strong-l">Escolha seu plano</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Faça upgrade ou downgrade a qualquer momento.
            </Text>
          </Column>
        </Column>

        {success && (
          <Feedback variant="success">Assinatura ativada com sucesso! Seus limites foram atualizados.</Feedback>
        )}
        {canceled && (
          <Feedback variant="warning">Pagamento cancelado. Nenhuma alteração foi feita no seu plano.</Feedback>
        )}

        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
          {PLANS.map((plan) => {
            const isCurrentPlan = plan.key === currentPlan
            const isFreePlan = plan.key === 'FREE'
            const canUpgrade = !isCurrentPlan && !isFreePlan && plan.monthlyPriceId

            return (
              <div
                key={plan.key}
                style={{
                  flex: '1 1 280px',
                  maxWidth: '22rem',
                  padding: '2rem',
                  borderRadius: '1rem',
                  border: plan.highlight
                    ? '2px solid var(--brand-border-strong)'
                    : isCurrentPlan
                      ? '2px solid var(--success-border-strong)'
                      : '1px solid var(--neutral-border-medium)',
                  background: 'var(--surface-background)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--brand-solid-strong)' }} />
                )}

                <Column gap="m" style={{ flex: 1 }}>
                  <Column gap="xs">
                    <Row gap="s" vertical="center">
                      <Text variant="label-default-s" onBackground="neutral-medium">{plan.name}</Text>
                      {plan.highlight && <Tag variant="brand" size="s" label="Popular" />}
                      {isCurrentPlan && <Tag variant="success" size="s" label="Atual" />}
                    </Row>
                    <Row gap="xs" vertical="end">
                      <Heading variant="display-strong-s" as="span">{plan.price}</Heading>
                      <Text variant="body-default-m" onBackground="neutral-medium" style={{ paddingBottom: '4px' }}>{plan.period}</Text>
                    </Row>
                    <Text variant="body-default-s" onBackground="neutral-medium">
                      {plan.description}
                    </Text>
                  </Column>

                  <div style={{ height: '1px', background: 'var(--neutral-border-medium)' }} />

                  <Column gap="s" style={{ flex: 1 }}>
                    {plan.features.map((feature) => (
                      <Row key={feature} gap="s" vertical="center">
                        <Text variant="body-default-m" onBackground="brand-strong" style={{ flexShrink: 0 }}>✓</Text>
                        <Text variant="body-default-m" onBackground="neutral-strong">{feature}</Text>
                      </Row>
                    ))}
                  </Column>

                  <div style={{ marginTop: '0.5rem' }}>
                    {isCurrentPlan && stripeSubscriptionId ? (
                      <button
                        onClick={handleManageSubscription}
                        disabled={portalLoading}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '0.75rem',
                          border: '1px solid var(--neutral-border-medium)',
                          background: 'transparent',
                          color: 'var(--neutral-on-background-strong)',
                          fontWeight: 600,
                          fontSize: '0.95rem',
                          cursor: portalLoading ? 'wait' : 'pointer',
                        }}
                      >
                        {portalLoading ? 'Abrindo...' : 'Gerenciar assinatura'}
                      </button>
                    ) : isCurrentPlan ? (
                      <div
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '0.75rem',
                          border: '1px solid var(--success-border-strong)',
                          background: 'var(--success-alpha-weak)',
                          color: 'var(--success-on-background-strong)',
                          textAlign: 'center',
                          fontWeight: 600,
                          fontSize: '0.95rem',
                        }}
                      >
                        Plano atual
                      </div>
                    ) : canUpgrade ? (
                      <button
                        onClick={() => handleUpgrade(plan.monthlyPriceId)}
                        disabled={!!upgradeLoading}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '0.75rem',
                          border: 'none',
                          background: plan.highlight ? 'var(--brand-solid-strong)' : 'var(--neutral-on-background-strong)',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.95rem',
                          cursor: upgradeLoading ? 'wait' : 'pointer',
                          opacity: upgradeLoading ? 0.7 : 1,
                        }}
                      >
                        {upgradeLoading === plan.monthlyPriceId ? 'Redirecionando...' : `Assinar ${plan.name}`}
                      </button>
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '0.75rem',
                          border: '1px solid var(--neutral-border-medium)',
                          background: 'transparent',
                          color: 'var(--neutral-on-background-weak)',
                          textAlign: 'center',
                          fontWeight: 600,
                          fontSize: '0.95rem',
                        }}
                      >
                        Plano atual
                      </div>
                    )}
                  </div>
                </Column>
              </div>
            )
          })}
        </div>

        {/* Comparison table */}
        <Column fillWidth padding="l" gap="m" radius="l" border="neutral-medium" background="surface">
          <Heading variant="heading-strong-m">Comparativo de recursos</Heading>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--neutral-border-medium)' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--neutral-on-background-strong)' }}>Recurso</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: 'var(--neutral-on-background-strong)' }}>Gratuito</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: 'var(--neutral-on-background-strong)' }}>Pro</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: 'var(--neutral-on-background-strong)' }}>Business</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Reports', free: '10 (total)', pro: '2.000/mês', business: '10.000/mês' },
                  { feature: 'Projetos', free: 'Ilimitados', pro: 'Ilimitados', business: 'Ilimitados' },
                  { feature: 'Membros', free: 'Ilimitados', pro: 'Ilimitados', business: 'Ilimitados' },
                  { feature: 'Retenção', free: '7 dias', pro: '90 dias', business: '1 ano' },
                  { feature: 'Screenshot', free: '✓', pro: '✓', business: '✓' },
                  { feature: 'Console & network logs', free: '✓', pro: '✓', business: '✓' },
                  { feature: 'Replay de sessão', free: '✓', pro: '✓', business: '✓' },
                  { feature: 'Suporte', free: 'Email', pro: 'Email', business: 'Prioritário' },
                ].map((row, i) => (
                  <tr key={row.feature} style={{ borderBottom: i < 10 ? '1px solid var(--neutral-border-medium)' : 'none' }}>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--neutral-on-background-strong)', fontWeight: 500 }}>{row.feature}</td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--neutral-on-background-medium)' }}>{row.free}</td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--neutral-on-background-medium)' }}>{row.pro}</td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--neutral-on-background-medium)' }}>{row.business}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Column>
      </Column>
    </AppLayout>
  )
}

export default function UpgradePage() {
  return (
    <Suspense>
      <UpgradeContent />
    </Suspense>
  )
}
