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
import { getPlanLimits, type Plan } from '@/lib/limits'
import { SkeletonBar, SkeletonCard } from '@/components/ui/LoadingSkeleton'

function UsageBar({ label, current, max }: { label: string; current: number; max: number }) {
  const isUnlimited = max <= 0
  const percentage = isUnlimited ? 0 : Math.min((current / max) * 100, 100)
  const isNearLimit = !isUnlimited && percentage >= 80
  const isAtLimit = !isUnlimited && percentage >= 100

  return (
    <Column gap="xs" fillWidth>
      <Row fillWidth horizontal="between">
        <Text variant="body-default-s" onBackground="neutral-strong">{label}</Text>
        <Text variant="body-default-s" onBackground={isAtLimit ? 'danger-strong' : isNearLimit ? 'warning-strong' : 'neutral-medium'}>
          {isUnlimited ? `${current} / Ilimitado` : `${current} / ${max}`}
        </Text>
      </Row>
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
    </Column>
  )
}

const PLAN_NAMES: Record<Plan, string> = {
  FREE: 'Gratuito',
  PRO: 'Pro',
  BUSINESS: 'Business',
}

const PLAN_PRICES: Record<Plan, string> = {
  FREE: 'R$ 0',
  PRO: 'R$ 49',
  BUSINESS: 'R$ 149',
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

  const success = searchParams.get('success') === 'true'
  const canceled = searchParams.get('canceled') === 'true'

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/subscription')
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
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const currentPlan = org.plan
  const limits = getPlanLimits(currentPlan)
  const hasPaidPlan = currentPlan !== 'FREE'

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
        <Column as="main" fillWidth paddingX="xl" paddingY="l" gap="l">
          <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }`}</style>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <SkeletonBar width="6rem" height="1.75rem" />
            <SkeletonBar width="18rem" height="0.875rem" />
          </div>
          <SkeletonCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <SkeletonBar width="8rem" height="1.25rem" />
                  <SkeletonBar width="4rem" height="1.25rem" radius="999px" />
                </div>
                <SkeletonBar width="5rem" height="0.75rem" />
              </div>
              <SkeletonBar width="8rem" height="2.25rem" />
            </div>
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonBar width="6rem" height="1.25rem" />
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <SkeletonBar width="6rem" height="0.75rem" />
                  <SkeletonBar width="4rem" height="0.75rem" />
                </div>
                <SkeletonBar width="100%" height="6px" radius="3px" />
              </div>
            ))}
          </SkeletonCard>
          <SkeletonCard>
            <SkeletonBar width="10rem" height="1.25rem" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <SkeletonBar width="1rem" height="1rem" />
                <SkeletonBar width={`${8 + i * 2}rem`} height="0.875rem" />
              </div>
            ))}
          </SkeletonCard>
        </Column>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Column as="main" fillWidth paddingX="xl" paddingY="l" gap="l">
        <Column gap="xs">
          <Heading variant="heading-strong-l">Planos</Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Gerencie seu plano e acompanhe o consumo
          </Text>
        </Column>

        {success && (
          <Feedback variant="success">Assinatura ativada com sucesso! Seus limites foram atualizados.</Feedback>
        )}
        {canceled && (
          <Feedback variant="warning">Pagamento cancelado. Nenhuma alteração foi feita no seu plano.</Feedback>
        )}

        {/* Current plan */}
        <Column fillWidth padding="l" gap="m" radius="l" border="neutral-medium" background="surface">
          <Row fillWidth horizontal="between" vertical="center">
            <Column gap="4">
              <Row gap="s" vertical="center">
                <Heading variant="heading-strong-m">Plano atual</Heading>
                <Tag
                  variant={currentPlan === 'FREE' ? 'neutral' : currentPlan === 'PRO' ? 'brand' : 'success'}
                  size="s"
                  label={PLAN_NAMES[currentPlan]}
                />
              </Row>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {PLAN_PRICES[currentPlan]}/mês
              </Text>
            </Column>
            <Column gap="xs">
              {hasPaidPlan && (
                <Button
                  variant="secondary"
                  size="s"
                  label={portalLoading ? 'Abrindo...' : 'Gerenciar assinatura'}
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                />
              )}
              <Button
                variant={hasPaidPlan ? 'tertiary' : 'primary'}
                size="s"
                label={hasPaidPlan ? 'Alterar plano' : 'Fazer upgrade'}
                onClick={() => router.push('/plans/upgrade')}
              />
            </Column>
          </Row>
        </Column>

        {/* Usage */}
        <Column fillWidth padding="l" gap="l" radius="l" border="neutral-medium" background="surface">
          <Heading variant="heading-strong-m">Uso atual</Heading>
          <UsageBar label={org.isLifetimeLimit ? 'Reports (total)' : 'Reports este mês'} current={usage.reportsUsed} max={org.maxReports <= 0 ? -1 : org.maxReports} />
        </Column>

        {/* Features */}
        <Column fillWidth padding="l" gap="m" radius="l" border="neutral-medium" background="surface">
          <Row fillWidth horizontal="between" vertical="center">
            <Heading variant="heading-strong-m">Recursos do plano</Heading>
            <Button variant="tertiary" size="s" label="Ver todos os planos" onClick={() => router.push('/plans/upgrade')} />
          </Row>
          <Column gap="s">
            {[
              { label: 'Screenshot automático', available: true },
              { label: 'Console & network logs', available: true },
              { label: 'Replay de sessão', available: limits.hasReplay },
              { label: `Retenção de ${limits.retentionDays} dias`, available: true },
            ].map((feature) => (
              <Row key={feature.label} gap="s" vertical="center">
                <Text
                  variant="body-default-m"
                  style={{ flexShrink: 0, color: feature.available ? 'var(--brand-on-background-strong)' : 'var(--neutral-on-background-weak)' }}
                >
                  {feature.available ? '✓' : '✗'}
                </Text>
                <Text
                  variant="body-default-m"
                  onBackground={feature.available ? 'neutral-strong' : 'neutral-weak'}
                  style={{ textDecoration: feature.available ? 'none' : 'line-through' }}
                >
                  {feature.label}
                </Text>
              </Row>
            ))}
          </Column>
        </Column>
      </Column>
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
