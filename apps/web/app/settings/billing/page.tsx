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
import { PRICE_IDS } from '@/lib/stripe-shared'

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
  maxProjects: number
  maxMembers: number
  maxReportsPerMonth: number
  stripeSubscriptionId: string | null
}

interface UsageData {
  projectCount: number
  memberCount: number
  reportsThisMonth: number
}

function BillingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const [org, setOrg] = useState<OrgData>({
    plan: 'FREE',
    maxProjects: 1,
    maxMembers: 1,
    maxReportsPerMonth: 50,
    stripeSubscriptionId: null,
  })
  const [usage, setUsage] = useState<UsageData>({
    projectCount: 0,
    memberCount: 1,
    reportsThisMonth: 0,
  })

  const success = searchParams.get('success') === 'true'
  const canceled = searchParams.get('canceled') === 'true'

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/subscription')
      if (res.ok) {
        const data = await res.json()
        setOrg({
          plan: data.organization.plan || 'FREE',
          maxProjects: data.organization.maxProjects,
          maxMembers: data.organization.maxMembers,
          maxReportsPerMonth: data.organization.maxReportsPerMonth,
          stripeSubscriptionId: data.organization.stripeSubscriptionId,
        })
        setUsage(data.usage)
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
        <Column as="main" fillWidth maxWidth={40} paddingX="l" paddingY="xl" gap="l" style={{ margin: '0 auto' }}>
          <Text variant="body-default-m" onBackground="neutral-weak">Carregando...</Text>
        </Column>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Column as="main" fillWidth maxWidth={40} paddingX="l" paddingY="xl" gap="l" style={{ margin: '0 auto' }}>
        <Column gap="xs">
          <Heading variant="heading-strong-l">Configurações</Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Gerencie sua organização e assinatura
          </Text>
        </Column>

        <Row gap="s">
          <Button variant="tertiary" size="s" label="Perfil" onClick={() => router.push('/settings')} />
          <Button variant="secondary" size="s" label="Plano & Uso" onClick={() => router.push('/settings/billing')} />
          <Button variant="tertiary" size="s" label="Equipe" onClick={() => router.push('/settings/team')} />
        </Row>

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
            {hasPaidPlan ? (
              <Button
                variant="secondary"
                size="m"
                label={portalLoading ? 'Abrindo...' : 'Gerenciar assinatura'}
                onClick={handleManageSubscription}
                disabled={portalLoading}
              />
            ) : (
              <Column gap="xs">
                {PRICE_IDS.PRO_MONTHLY && (
                  <Button
                    variant="primary"
                    size="m"
                    label={upgradeLoading === PRICE_IDS.PRO_MONTHLY ? 'Redirecionando...' : 'Upgrade Pro - R$ 49/mês'}
                    onClick={() => handleUpgrade(PRICE_IDS.PRO_MONTHLY)}
                    disabled={!!upgradeLoading}
                  />
                )}
                {PRICE_IDS.BUSINESS_MONTHLY && (
                  <Button
                    variant="secondary"
                    size="s"
                    label={upgradeLoading === PRICE_IDS.BUSINESS_MONTHLY ? 'Redirecionando...' : 'Upgrade Business - R$ 149/mês'}
                    onClick={() => handleUpgrade(PRICE_IDS.BUSINESS_MONTHLY)}
                    disabled={!!upgradeLoading}
                  />
                )}
              </Column>
            )}
          </Row>
        </Column>

        {/* Usage */}
        <Column fillWidth padding="l" gap="l" radius="l" border="neutral-medium" background="surface">
          <Heading variant="heading-strong-m">Uso atual</Heading>
          <UsageBar label="Projetos" current={usage.projectCount} max={org.maxProjects >= 999999 ? -1 : org.maxProjects} />
          <UsageBar label="Membros da equipe" current={usage.memberCount} max={org.maxMembers} />
          <UsageBar label="Reports este mês" current={usage.reportsThisMonth} max={org.maxReportsPerMonth <= 0 ? -1 : org.maxReportsPerMonth} />
        </Column>

        {/* Features */}
        <Column fillWidth padding="l" gap="m" radius="l" border="neutral-medium" background="surface">
          <Heading variant="heading-strong-m">Recursos do plano</Heading>
          <Column gap="s">
            {[
              { label: 'Screenshot automático', available: true },
              { label: 'Console & network logs', available: true },
              { label: 'Replay de sessão', available: limits.hasReplay },
              { label: 'Integrações (Slack, Jira)', available: limits.hasIntegrations },
              { label: 'White-label', available: limits.hasWhiteLabel },
              { label: 'API access', available: limits.hasApi },
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

export default function BillingPage() {
  return (
    <Suspense>
      <BillingPageContent />
    </Suspense>
  )
}
