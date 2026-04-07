'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useOrg } from '@/contexts/OrgContext'
import AppLayout from '@/components/ui/AppLayout'
import { PlansUpgradeLoadingContent } from '@/components/ui/LoadingSkeleton'
import { type Plan } from '@/lib/limits'
import { usePrices } from '@/hooks/usePrices'
import { Alert } from '@/components/ui/Alert'

const PLANS: {
  key: Plan
  name: string
  period: string
  description: string
  features: string[]
  highlight?: boolean
}[] = [
  {
    key: 'FREE',
    name: 'Gratuito',
    period: '/mês',
    description: 'Para testar a plataforma e projetos pessoais.',
    features: [
      '10 reports (total)',
      'Projetos ilimitados',
      'Membros ilimitados',
      'Screenshot + replay de sessão',
      'Console & network logs',
      'Sem API REST, webhooks, ClickUp e exportação CSV/Excel',
      'Retenção de 7 dias',
      'Suporte por email',
    ],
  },
  {
    key: 'PRO',
    name: 'Pro',
    period: '/mês',
    description: 'Para equipes que precisam de QA profissional.',
    highlight: true,
    features: [
      '2.000 reports/mês',
      'Projetos ilimitados',
      'Membros ilimitados',
      'Exportar reports filtrados (CSV e Excel) com assinatura ativa',
      'API REST, webhooks e ClickUp (com assinatura ativa)',
      'Screenshot + replay de sessão',
      'Console, network & custom logs',
      'Retenção de 90 dias',
      'Suporte por email',
    ],
  },
  {
    key: 'BUSINESS',
    name: 'Business',
    period: '/mês',
    description: 'Para softhouses e equipes grandes.',
    features: [
      '10.000 reports/mês',
      'Projetos ilimitados',
      'Membros ilimitados',
      'Exportar reports filtrados (CSV e Excel) com assinatura ativa',
      'API REST, webhooks e ClickUp (com assinatura ativa)',
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
  const { currentOrg } = useOrg()
  const { prices } = usePrices()
  const [loading, setLoading] = useState(true)
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<Plan>('FREE')
  const [stripeSubscriptionId, setStripeSubscriptionId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('MEMBER')

  const canceled = searchParams.get('canceled') === 'true'

  const fetchData = useCallback(async () => {
    if (!currentOrg?.id) return
    try {
      const res = await fetch(`/api/billing/subscription?orgId=${currentOrg.id}`)
      if (res.ok) {
        const data = await res.json()
        setCurrentPlan(data.organization.plan || 'FREE')
        setStripeSubscriptionId(data.organization.stripeSubscriptionId)
        setUserRole(data.role || 'MEMBER')
      }
    } catch {
      // defaults
    } finally {
      setLoading(false)
    }
  }, [currentOrg?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleUpgrade = async (planKey: string) => {
    setUpgradeLoading(planKey)
    try {
      const res = await fetch('/api/billing/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Erro ao criar sessão de pagamento')
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
        <div className="app-page">
          <PlansUpgradeLoadingContent />
        </div>
      </AppLayout>
    )
  }

  if (userRole !== 'OWNER') {
    return (
      <AppLayout>
        <div className="app-page app-page--narrow">
          <div style={{ textAlign: 'center', paddingTop: '4rem' }}>
            <h2>Acesso restrito</h2>
            <span>
              Apenas o proprietário da organização pode alterar o plano.
            </span>
            <button onClick={() => router.push('/plans')} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--neutral-border-medium)', background: 'var(--surface-background)', color: 'var(--neutral-on-background-strong)', fontSize: '1.4rem', fontWeight: 600, cursor: 'pointer' }}>Voltar para Planos</button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="app-page">
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button onClick={() => router.push('/plans')} className="app-btn-secondary" style={{ alignSelf: 'flex-start', padding: '0.375rem 0.75rem', fontSize: '1.4rem' }}>← Voltar para Planos</button>
          <div style={{ textAlign: 'center' }}>
            <h2 className="app-section-title" style={{ fontSize: '1.6rem' }}>Escolha seu plano</h2>
            <p className="app-section-sub" style={{ maxWidth: '42rem', margin: '0.5rem auto 0' }}>
              Faça upgrade ou downgrade a qualquer momento. Pro e Business liberam API, webhooks, integração ClickUp e exportação filtrada (CSV/Excel) enquanto a assinatura estiver ativa.
            </p>
          </div>
        </div>

        {canceled && (
          <Alert variant="warning">Pagamento cancelado. Nenhuma alteração foi feita no seu plano.</Alert>
        )}

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', width: '100%' }}>
          {PLANS.map((plan) => {
            const isCurrentPlan = plan.key === currentPlan
            const isFreePlan = plan.key === 'FREE'
            const planOrder = { FREE: 0, PRO: 1, BUSINESS: 2 } as Record<string, number>
            const isUpgrade = (planOrder[plan.key] || 0) > (planOrder[currentPlan] || 0)
            const isDowngrade = (planOrder[plan.key] || 0) < (planOrder[currentPlan] || 0) && !isFreePlan
            const canChange = !isCurrentPlan && !isFreePlan

            return (
              <div
                key={plan.key}
                style={{
                  padding: '1.75rem',
                  borderRadius: '1rem',
                  border: plan.highlight
                    ? '2px solid var(--brand-border-strong)'
                    : isCurrentPlan
                      ? '2px solid var(--success-border-strong)'
                      : '1px solid var(--neutral-border-medium)',
                  background: plan.highlight
                    ? 'linear-gradient(180deg, rgba(86,67,204,0.08) 0%, var(--surface-background) 40%)'
                    : 'var(--surface-background)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
              >
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--brand-solid-strong)' }} />
                )}

                {/* Plan name + badges */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--neutral-on-background-strong)' }}>{plan.name}</span>
                    {plan.highlight && <span className="app-badge" style={{ background: 'var(--brand-alpha-weak)', color: 'var(--brand-on-background-strong)' }}>Popular</span>}
                    {isCurrentPlan && <span className="app-badge" style={{ background: 'var(--success-alpha-weak)', color: 'var(--success-on-background-strong)' }}>Atual</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--neutral-on-background-strong)', lineHeight: 1 }}>{prices[plan.key].monthlyFormatted}</span>
                    <span style={{ fontSize: '1.4rem', color: 'var(--neutral-on-background-weak)' }}>{plan.period}</span>
                  </div>
                  <span style={{ fontSize: '1.4rem', color: 'var(--neutral-on-background-weak)', lineHeight: 1.4 }}>
                    {plan.description}
                  </span>
                </div>

                <div style={{ height: '1px', background: 'var(--neutral-border-medium)' }} />

                {/* Features */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {plan.features.map((feature) => (
                    <div key={feature} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <span style={{ flexShrink: 0, width: '1.125rem', height: '1.125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '1.2rem', fontWeight: 700, background: 'var(--brand-alpha-weak)', color: 'var(--brand-on-background-strong)', marginTop: '0.125rem' }}>✓</span>
                      <span style={{ fontSize: '1.4rem', color: 'var(--neutral-on-background-strong)', lineHeight: 1.4 }}>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                  {isCurrentPlan && stripeSubscriptionId ? (
                    <button onClick={handleManageSubscription} disabled={portalLoading} className="app-btn-secondary" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', fontSize: '1.4rem', textAlign: 'center' }}>
                      {portalLoading ? 'Abrindo...' : 'Gerenciar assinatura'}
                    </button>
                  ) : isCurrentPlan ? (
                    <div style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--success-border-strong)', background: 'var(--success-alpha-weak)', color: 'var(--success-on-background-strong)', textAlign: 'center', fontWeight: 600, fontSize: '1.4rem' }}>
                      Plano atual
                    </div>
                  ) : canChange ? (
                    <button onClick={() => handleUpgrade(plan.key)} disabled={!!upgradeLoading} className={isDowngrade ? 'app-btn-secondary' : 'app-btn-primary'} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', fontSize: '1.4rem', textAlign: 'center' }}>
                      {upgradeLoading === plan.key ? 'Processando...' : isUpgrade ? `Upgrade para ${plan.name}` : `Downgrade para ${plan.name}`}
                    </button>
                  ) : (
                    <div style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--neutral-border-medium)', background: 'transparent', color: 'var(--neutral-on-background-weak)', textAlign: 'center', fontWeight: 600, fontSize: '1.4rem' }}>
                      Plano gratuito
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Comparison table */}
        <div className="app-card" style={{ marginTop: '0.5rem' }}>
          <h3 className="app-section-title" style={{ fontSize: '1.6rem' }}>Comparativo de recursos</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.4rem' }}>
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
                  { feature: 'Exportar filtrado (CSV/Excel)', free: '—', pro: 'Com assinatura ativa', business: 'Com assinatura ativa' },
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
        </div>
      </div>
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
