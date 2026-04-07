'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useOrg } from '@/contexts/OrgContext'
import AppLayout from '@/components/ui/AppLayout'
import { getPlanLimits, type Plan } from '@/lib/limits'
import { PlansPageLoadingContent } from '@/components/ui/LoadingSkeleton'
import { usePrices } from '@/hooks/usePrices'
import { Alert } from '@/components/ui/Alert'

function UsageBar({ label, current, max }: { label: string; current: number; max: number }) {
  const isUnlimited = max <= 0
  const percentage = isUnlimited ? 0 : Math.min((current / max) * 100, 100)
  const isNearLimit = !isUnlimited && percentage >= 80
  const isAtLimit = !isUnlimited && percentage >= 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '1.4rem', color: 'var(--neutral-on-background-strong)' }}>{label}</span>
        <span style={{ fontSize: '1.4rem', fontWeight: 600, color: isAtLimit ? 'var(--danger-on-background-strong)' : isNearLimit ? 'var(--warning-on-background-strong)' : 'var(--neutral-on-background-medium)' }}>
          {isUnlimited ? `${current} / Ilimitado` : `${current} / ${max}`}
        </span>
      </div>
      <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'var(--neutral-alpha-weak)' }}>
        {!isUnlimited && (
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              borderRadius: 3,
              background: isAtLimit
                ? 'var(--danger-solid-strong)'
                : isNearLimit
                  ? 'var(--warning-solid-strong)'
                  : 'var(--brand-solid-strong)',
              transition: 'width 0.3s ease',
            }}
          />
        )}
      </div>
    </div>
  )
}

const PLAN_NAMES: Record<Plan, string> = {
  FREE: 'Gratuito',
  PRO: 'Pro',
  BUSINESS: 'Business',
}

const PLAN_BADGE_COLORS: Record<Plan, { bg: string; color: string }> = {
  FREE: { bg: 'var(--neutral-alpha-weak)', color: 'var(--neutral-on-background-weak)' },
  PRO: { bg: 'var(--brand-alpha-weak)', color: 'var(--brand-on-background-strong)' },
  BUSINESS: { bg: 'var(--success-alpha-weak)', color: 'var(--success-on-background-strong)' },
}

interface OrgData {
  plan: Plan
  maxReports: number
  isLifetimeLimit: boolean
  stripeSubscriptionId: string | null
}

interface UsageData {
  reportsUsed: number
}

function PlansContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentOrg } = useOrg()
  const { prices } = usePrices()
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)

  const [org, setOrg] = useState<OrgData>({
    plan: 'FREE',
    maxReports: 10,
    isLifetimeLimit: true,
    stripeSubscriptionId: null,
  })
  const [usage, setUsage] = useState<UsageData>({
    reportsUsed: 0,
  })
  const [userRole, setUserRole] = useState<string>('MEMBER')

  const success = searchParams.get('success') === 'true'
  const canceled = searchParams.get('canceled') === 'true'

  const fetchData = useCallback(async () => {
    if (!currentOrg?.id) return
    try {
      const res = await fetch(`/api/billing/subscription?orgId=${currentOrg.id}`)
      if (res.ok) {
        const data = await res.json()
        const plan = data.organization.plan || 'FREE'
        const limits = getPlanLimits(plan)
        setOrg({
          plan,
          maxReports: limits.maxReports,
          isLifetimeLimit: limits.isLifetimeLimit,
          stripeSubscriptionId: data.organization.stripeSubscriptionId,
        })
        setUsage({ reportsUsed: data.usage?.reportsUsed ?? 0 })
        setUserRole(data.role || 'MEMBER')
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false)
    }
  }, [currentOrg?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const currentPlan = org.plan
  const limits = getPlanLimits(currentPlan)
  const hasPaidPlan = currentPlan !== 'FREE'
  const isOwner = userRole === 'OWNER'

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
          <PlansPageLoadingContent />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="app-page">
        {/* Page header */}
        <div>
          <h2 className="app-section-title">Planos</h2>
          <p className="app-section-sub">
            {isOwner
              ? 'Gerencie seu plano e o consumo. Pro e Business incluem integrações (API, webhooks, ClickUp) e exportação filtrada (CSV/Excel) com assinatura ativa.'
              : 'Visualize o plano e o consumo da organização.'}
          </p>
        </div>

        {!isOwner && (
          <Alert variant="warning">
            Apenas o proprietário da organização pode gerenciar o plano e pagamentos.
          </Alert>
        )}

        {success && (
          <Alert variant="success">Assinatura ativada com sucesso! Seus limites foram atualizados.</Alert>
        )}
        {canceled && (
          <Alert variant="warning">Pagamento cancelado. Nenhuma alteração foi feita no seu plano.</Alert>
        )}

        {/* Current plan */}
        <div className="app-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 className="app-section-title" style={{ fontSize: '1.6rem' }}>Plano atual</h3>
                <span
                  className="app-badge"
                  style={{ background: PLAN_BADGE_COLORS[currentPlan]?.bg, color: PLAN_BADGE_COLORS[currentPlan]?.color }}
                >
                  {PLAN_NAMES[currentPlan]}
                </span>
              </div>
              {isOwner && (
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--neutral-on-background-strong)' }}>
                  {prices[currentPlan].monthlyFormatted}<span style={{ fontSize: '1.4rem', fontWeight: 400, color: 'var(--neutral-on-background-weak)' }}>/mês</span>
                </span>
              )}
            </div>
            {isOwner && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {hasPaidPlan && (
                  <button
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    className="app-btn-secondary"
                  >
                    {portalLoading ? 'Abrindo...' : 'Gerenciar assinatura'}
                  </button>
                )}
                <button
                  onClick={() => router.push('/plans/upgrade')}
                  className={hasPaidPlan ? 'app-btn-secondary' : 'app-btn-primary'}
                >
                  {hasPaidPlan ? 'Alterar plano' : 'Fazer upgrade'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Usage */}
        <div className="app-card">
          <h3 className="app-section-title" style={{ fontSize: '1.6rem' }}>Uso atual</h3>
          <UsageBar
            label={org.isLifetimeLimit ? 'Reports (total)' : 'Reports este mês'}
            current={usage.reportsUsed}
            max={org.maxReports <= 0 ? -1 : org.maxReports}
          />
        </div>

        {/* Features */}
        <div className="app-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="app-section-title" style={{ fontSize: '1.6rem' }}>Recursos do plano</h3>
            {isOwner && (
              <button
                onClick={() => router.push('/plans/upgrade')}
                className="app-btn-secondary"
                style={{ padding: '0.375rem 0.75rem', fontSize: '1.4rem' }}
              >
                Ver todos os planos
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {[
              { label: 'Screenshot automático', available: true },
              { label: 'Console & network logs', available: true },
              { label: 'Replay de sessão', available: limits.hasReplay },
              {
                label: 'API REST, webhooks e ClickUp (assinatura ativa)',
                available: currentPlan === 'PRO' || currentPlan === 'BUSINESS',
              },
              {
                label: 'Exportar reports filtrados em CSV ou Excel (assinatura ativa)',
                available: currentPlan === 'PRO' || currentPlan === 'BUSINESS',
              },
              { label: `Retenção de ${limits.retentionDays} dias`, available: true },
            ].map((feature) => (
              <div key={feature.label} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span
                  style={{
                    flexShrink: 0,
                    width: '1.25rem',
                    height: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    background: feature.available ? 'var(--brand-alpha-weak)' : 'var(--neutral-alpha-weak)',
                    color: feature.available ? 'var(--brand-on-background-strong)' : 'var(--neutral-on-background-weak)',
                  }}
                >
                  {feature.available ? '✓' : '✗'}
                </span>
                <span
                  style={{
                    fontSize: '1.4rem',
                    textDecoration: feature.available ? 'none' : 'line-through',
                    color: feature.available ? 'var(--neutral-on-background-strong)' : 'var(--neutral-on-background-weak)',
                  }}
                >
                  {feature.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default function PlansPage() {
  return (
    <Suspense>
      <PlansContent />
    </Suspense>
  )
}
