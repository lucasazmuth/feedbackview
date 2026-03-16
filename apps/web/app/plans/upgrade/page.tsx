'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
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

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']
    const particles: { x: number; y: number; w: number; h: number; color: string; vx: number; vy: number; rot: number; rotSpeed: number; opacity: number }[] = []

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        opacity: 1,
      })
    }

    let animId: number
    let frame = 0
    const maxFrames = 180

    function animate() {
      frame++
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.rot += p.rotSpeed
        p.vy += 0.05
        if (frame > maxFrames - 60) {
          p.opacity = Math.max(0, p.opacity - 0.02)
        }

        ctx!.save()
        ctx!.translate(p.x, p.y)
        ctx!.rotate(p.rot)
        ctx!.globalAlpha = p.opacity
        ctx!.fillStyle = p.color
        ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx!.restore()
      }

      if (frame < maxFrames) {
        animId = requestAnimationFrame(animate)
      }
    }

    animate()
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  )
}

const PLANS: {
  key: Plan
  name: string
  price: string
  period: string
  description: string
  features: string[]
  highlight?: boolean
}[] = [
  {
    key: 'FREE',
    name: 'Gratuito',
    price: 'R$ 0',
    period: '/mês',
    description: 'Para testar a plataforma e projetos pessoais.',
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
          <>
            <ConfettiCanvas />
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              padding: '3rem 2rem',
              borderRadius: '1.5rem',
              background: 'linear-gradient(135deg, var(--success-alpha-weak), var(--brand-alpha-weak))',
              border: '1px solid var(--success-border-medium)',
              textAlign: 'center',
            }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--success-solid-strong)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <Heading variant="heading-strong-l">Assinatura ativada!</Heading>
              <Text variant="body-default-m" onBackground="neutral-medium" style={{ maxWidth: 400 }}>
                Parabéns! Seu plano foi atualizado com sucesso. Seus novos limites já estão disponíveis.
              </Text>
              <Button
                variant="primary"
                size="m"
                label="Ir para Projetos"
                onClick={() => router.push('/dashboard')}
                style={{ marginTop: '0.5rem' }}
              />
            </div>
          </>
        )}
        {canceled && (
          <Feedback variant="warning">Pagamento cancelado. Nenhuma alteração foi feita no seu plano.</Feedback>
        )}

        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
          {PLANS.map((plan) => {
            const isCurrentPlan = plan.key === currentPlan
            const isFreePlan = plan.key === 'FREE'
            const canUpgrade = !isCurrentPlan && !isFreePlan

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
                        onClick={() => handleUpgrade(plan.key)}
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
                        {upgradeLoading === plan.key ? 'Redirecionando...' : `Assinar ${plan.name}`}
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
