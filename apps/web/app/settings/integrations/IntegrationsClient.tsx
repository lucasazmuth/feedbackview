'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { hasActiveIntegrationEntitlement } from '@/lib/integration-entitlement'
import AppLayout from '@/components/ui/AppLayout'
import { useOrg } from '@/contexts/OrgContext'
import ClickUpSetup from './ClickUpSetup'
import { Alert } from '@/components/ui/Alert'
import { AppIcon } from '@/components/ui/AppIcon'

const tabButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: '0.65rem 1rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: active ? 'var(--brand-on-background-strong)' : 'var(--neutral-on-background-weak)',
  background: active ? 'var(--brand-alpha-weak)' : 'transparent',
  border: `1px solid ${active ? 'var(--brand-border-medium)' : 'transparent'}`,
  borderRadius: '0.5rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
})

export default function IntegrationsClient({ userId: _userId }: { userId: string }) {
  const { currentOrg, orgs, switchOrg } = useOrg()
  const orgId = currentOrg?.id
  const searchParams = useSearchParams()
  const router = useRouter()
  const clickUpDeepLinkHandledRef = useRef(false)
  const [clickUpPrefillProjectId, setClickUpPrefillProjectId] = useState<string | null>(null)

  const [clickUpModalOpen, setClickUpModalOpen] = useState(false)
  const [clickUpWizardKey, setClickUpWizardKey] = useState(0)
  const [clickUpConnected, setClickUpConnected] = useState(false)
  const integrationsOrgQueryHandledRef = useRef(false)
  const [integrationEntitled, setIntegrationEntitled] = useState<boolean | null>(null)

  useEffect(() => {
    if (!orgId) {
      setIntegrationEntitled(null)
      return
    }
    let cancelled = false
    setIntegrationEntitled(null)
    void (async () => {
      try {
        const res = await fetch(`/api/billing/subscription?orgId=${encodeURIComponent(orgId)}`)
        if (cancelled) return
        if (!res.ok) {
          setIntegrationEntitled(false)
          return
        }
        const data = await res.json()
        const o = data.organization as {
          plan?: string
          stripeSubscriptionId?: string | null
          planExpiresAt?: string | null
        }
        const allowed = hasActiveIntegrationEntitlement({
          plan: o?.plan,
          stripeSubscriptionId: o?.stripeSubscriptionId,
          planExpiresAt: o?.planExpiresAt,
        })
        if (!cancelled) setIntegrationEntitled(allowed)
      } catch {
        if (!cancelled) setIntegrationEntitled(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orgId])

  const refreshClickUpStatus = useCallback(() => {
    if (!orgId) return
    void fetch(`/api/integrations/clickup?orgId=${orgId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.configured && data?.config?.enabled) setClickUpConnected(true)
        else setClickUpConnected(false)
      })
      .catch(() => {})
  }, [orgId])

  useEffect(() => {
    if (!orgId) return
    refreshClickUpStatus()
  }, [orgId, refreshClickUpStatus, clickUpModalOpen])

  useEffect(() => {
    if (!clickUpModalOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setClickUpModalOpen(false)
        refreshClickUpStatus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [clickUpModalOpen, refreshClickUpStatus])

  const integrationsQueryKey = searchParams.toString()

  useEffect(() => {
    const focus = searchParams.get('focus')
    if (focus !== 'clickup') {
      clickUpDeepLinkHandledRef.current = false
      return
    }
    if (clickUpDeepLinkHandledRef.current) return

    const pid = searchParams.get('projectId')
    const oid = searchParams.get('orgId')

    if (oid) {
      if (orgs.length === 0) return
      if (!orgs.some(o => o.id === oid)) {
        clickUpDeepLinkHandledRef.current = true
        router.replace('/settings/integrations', { scroll: false })
        return
      }
      if (currentOrg?.id !== oid) {
        switchOrg(oid, { skipRedirect: true })
        return
      }
    } else if (!currentOrg?.id) {
      return
    }

    clickUpDeepLinkHandledRef.current = true
    if (pid) setClickUpPrefillProjectId(pid)
    setClickUpModalOpen(true)
    router.replace('/settings/integrations', { scroll: false })
  }, [integrationsQueryKey, searchParams, orgs, currentOrg?.id, switchOrg, router])

  useEffect(() => {
    if (searchParams.get('focus')) {
      return
    }
    const oid = searchParams.get('orgId')
    if (!oid) {
      integrationsOrgQueryHandledRef.current = false
      return
    }
    if (integrationsOrgQueryHandledRef.current) return

    if (orgs.length === 0) return
    if (!orgs.some(o => o.id === oid)) {
      integrationsOrgQueryHandledRef.current = true
      router.replace('/settings/integrations', { scroll: false })
      return
    }
    if (currentOrg?.id !== oid) {
      switchOrg(oid, { skipRedirect: true })
      return
    }

    integrationsOrgQueryHandledRef.current = true
    router.replace('/settings/integrations', { scroll: false })
  }, [integrationsQueryKey, searchParams, orgs, currentOrg?.id, switchOrg, router])

  const integrationAllowed = integrationEntitled === true
  const integrationLocked = orgId && integrationEntitled === false

  return (
    <AppLayout>
      <main className="app-page">
        <div>
          <h1 className="app-section-title" style={{ fontSize: '1.5rem' }}>
            Integrações
          </h1>
          <p className="app-section-sub" style={{ maxWidth: '42rem' }}>
            {integrationLocked ? (
              <>
                <strong>Conexões</strong> (como o ClickUp) e <strong>exportação em Reports</strong> (CSV/Excel) fazem parte
                dos planos <strong>Pro</strong> e <strong>Business</strong> com assinatura ativa.
              </>
            ) : (
              <>
                <strong>Conexões</strong> ligam o Buug a ferramentas como o ClickUp — em poucos passos, sem código. A{' '}
                <strong>API do Buug</strong> (chaves, webhooks e documentação) fica <strong>em breve</strong> nesta mesma
                área.
              </>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', paddingTop: '0.25rem' }}>
          <button
            type="button"
            style={{ ...tabButtonStyle(true), padding: '0.75rem 1.15rem', fontSize: '0.9375rem' }}
            aria-current="page"
          >
            Conexões
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Em breve"
            style={{
              ...tabButtonStyle(false),
              padding: '0.75rem 1.15rem',
              fontSize: '0.9375rem',
              opacity: 0.55,
              cursor: 'not-allowed',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              API do Buug
              <span
                className="app-badge"
                style={{
                  background: 'var(--neutral-alpha-weak)',
                  color: 'var(--neutral-on-background-weak)',
                  fontSize: '0.6875rem',
                }}
              >
                Em breve
              </span>
            </span>
          </button>
        </div>

        {!orgId && (
          <Alert>
            <strong>Selecione uma organização</strong>
            Escolha a organização no menu lateral para configurar integrações.
          </Alert>
        )}

        {orgId && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {integrationAllowed && (
              <span className="app-section-sub" style={{ maxWidth: '36rem' }}>
                Escolha uma ferramenta para conectar. Cada card abre um assistente passo a passo.
              </span>
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(17.5rem, 1fr))',
                gap: '1rem',
              }}
            >
              <button
                type="button"
                disabled={integrationEntitled === null}
                onClick={() => {
                  if (integrationEntitled === null) return
                  if (!integrationAllowed && !clickUpConnected) {
                    router.push('/plans/upgrade')
                    return
                  }
                  setClickUpWizardKey(k => k + 1)
                  setClickUpModalOpen(true)
                }}
                style={{
                  textAlign: 'left',
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: integrationEntitled === null ? 'wait' : 'pointer',
                  borderRadius: '0.75rem',
                }}
                aria-label="ClickUp — abrir configuração"
              >
                <div
                  className="app-card"
                  style={{
                    margin: 0,
                    minHeight: '11rem',
                    border:
                      integrationAllowed || clickUpConnected
                        ? '2px solid var(--brand-border-medium)'
                        : '1px solid var(--neutral-border-medium)',
                    background:
                      integrationAllowed || clickUpConnected
                        ? 'linear-gradient(145deg, var(--brand-alpha-weak) 0%, var(--surface-background) 50%)'
                        : 'var(--surface-background)',
                    boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
                    opacity: !integrationAllowed && !clickUpConnected ? 0.92 : 1,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <img src="/integrations/clickup.svg" alt="" width={48} height={48} />
                      {clickUpConnected ? (
                        <span
                          className="app-badge"
                          style={{
                            background: 'var(--success-alpha-weak, rgba(34,197,94,0.12))',
                            color: 'var(--success-on-background-strong, #22c55e)',
                          }}
                        >
                          Conectado
                        </span>
                      ) : integrationAllowed ? (
                        <span
                          className="app-badge"
                          style={{ background: 'var(--neutral-alpha-weak)', color: 'var(--neutral-on-background-weak)' }}
                        >
                          Disponível
                        </span>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span
                        style={{
                          margin: 0,
                          fontWeight: 600,
                          fontSize: '1rem',
                          color: 'var(--neutral-on-background-strong)',
                        }}
                      >
                        ClickUp
                      </span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--neutral-on-background-weak)', lineHeight: 1.5 }}>
                        Reports viram tarefas no ClickUp com status, prioridade e prazo. Automações: projetos Buug → lista
                        (workspace, espaço, lista).
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color:
                            integrationAllowed || clickUpConnected
                              ? 'var(--brand-on-background-strong)'
                              : 'var(--neutral-on-background-weak)',
                        }}
                      >
                        {!integrationAllowed && !clickUpConnected ? 'Ver planos →' : 'Configurar →'}
                      </span>
                      <AppIcon size="md" aria-hidden>
                        <path d="M9 18l6-6-6-6" />
                      </AppIcon>
                    </div>
                  </div>
                </div>
              </button>

              <div
                className="app-card"
                style={{
                  margin: 0,
                  minHeight: '11rem',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  opacity: 0.65,
                  borderStyle: 'dashed',
                }}
                role="status"
                aria-label="Integrações adicionais em breve"
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <AppIcon size="xxl" style={{ color: 'var(--neutral-on-background-weak)' }} aria-hidden>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v8M8 12h8" />
                  </AppIcon>
                  <span
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: 'var(--neutral-on-background-strong)',
                    }}
                  >
                    Mais conexões
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--neutral-on-background-weak)' }}>
                    Em breve: outras ferramentas no mesmo lugar.
                  </span>
                </div>
              </div>
            </div>

            {clickUpModalOpen && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Integração ClickUp"
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 'clamp(0.75rem, 3vw, 1.25rem)',
                  isolation: 'isolate',
                }}
              >
                <div
                  role="presentation"
                  aria-hidden="true"
                  onClick={() => setClickUpModalOpen(false)}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 0,
                    cursor: 'pointer',
                    background: 'rgba(0,0,0,0.45)',
                  }}
                />
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    maxWidth: 'min(36rem, 100%)',
                    width: '100%',
                    maxHeight: 'min(92vh, 720px)',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    background: 'var(--surface-background)',
                    border: '1px solid var(--neutral-border-medium)',
                    borderRadius: 'var(--radius-l, 12px)',
                    boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      overflow: 'hidden',
                      WebkitOverflowScrolling: 'touch',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        overflow: 'auto',
                        WebkitOverflowScrolling: 'touch',
                      }}
                    >
                      <ClickUpSetup
                        key={clickUpWizardKey}
                        orgId={orgId}
                        integrationEntitled={integrationAllowed}
                        prefillAutomationProjectId={clickUpPrefillProjectId}
                        onPrefillAutomationConsumed={() => setClickUpPrefillProjectId(null)}
                        onConnectionChange={refreshClickUpStatus}
                        onClose={() => {
                          setClickUpModalOpen(false)
                          refreshClickUpStatus()
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </AppLayout>
  )
}
