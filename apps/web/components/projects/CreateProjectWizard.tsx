'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import clsx from 'clsx'
import AppLayout from '@/components/ui/AppLayout'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { type Plan } from '@/lib/limits'
import { AppIcon } from '@/components/ui/AppIcon'
import { ICON_STROKE } from '@/lib/icon-tokens'

const projectSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  targetUrl: z.string().url('URL inválida. Inclua http:// ou https://'),
})

type ProjectForm = z.infer<typeof projectSchema>

type Mode = 'proxy' | 'embed'

interface UrlWarning {
  type: 'success' | 'warning' | 'info' | 'error'
  message: string
}

const WIZARD_STEPS = [
  { num: 1, label: 'Site' },
  { num: 2, label: 'Integração' },
  { num: 3, label: 'Dados' },
  { num: 4, label: 'Widget' },
] as const

function WizardSectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="wizard-section-title max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight text-off-white md:text-3xl md:leading-snug">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray md:mt-2.5 md:text-base">
        {subtitle}
      </p>
    </div>
  )
}

export function CreateProjectWizard() {
  const router = useRouter()

  const [limitBlocked] = useState<string | null>(null)
  const [limitLoading] = useState(false)

  const [step, setStep] = useState(1)
  const [mode, setMode] = useState<Mode | null>(null)
  const [recommendedMode, setRecommendedMode] = useState<Mode | null>(null)
  const [proxyBlocked, setProxyBlocked] = useState(false)
  const [siteType, setSiteType] = useState<string | null>(null)
  const [urlAnalyzing, setUrlAnalyzing] = useState(false)
  const [urlReady, setUrlReady] = useState(false)

  const [targetUrl, setTargetUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [urlChecking, setUrlChecking] = useState(false)
  const [urlWarnings, setUrlWarnings] = useState<UrlWarning[]>([])
  const [urlChecked, setUrlChecked] = useState(false)
  const [urlValid, setUrlValid] = useState(false)
  const [showPathWarning, setShowPathWarning] = useState(false)
  const [cleanUrl, setCleanUrl] = useState('')
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null)
  const [platformPathHint, setPlatformPathHint] = useState<string | null>(null)

  // Widget customization state
  const [widgetStyle, setWidgetStyle] = useState<'text' | 'icon'>('text')
  const [widgetText, setWidgetText] = useState('Reportar Bug')
  const [widgetPosition, setWidgetPosition] = useState('middle-right')
  const [widgetColor, setWidgetColor] = useState('#dc2626')
  const [savedFormData, setSavedFormData] = useState<ProjectForm | null>(null)

  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
  })

  const hasProblems = urlWarnings.some((w) => w.type === 'error' || w.type === 'warning')

  function handleUrlChange(value: string) {
    setUrlChecked(false)
    setUrlWarnings([])
    setUrlError(null)
    setShowPathWarning(false)
    setDetectedPlatform(null)
    setPlatformPathHint(null)
    setTargetUrl(value)
  }

  // Detect known platforms from hostname
  const platformsRequiringPath = new Set(['bubbleapps.io', 'bubble.io'])
  function detectPlatform(hostname: string): string | null {
    const platforms: Record<string, string> = {
      'bubbleapps.io': 'Bubble',
      'bubble.io': 'Bubble',
      'webflow.io': 'Webflow',
      'shopify.com': 'Shopify',
      'myshopify.com': 'Shopify',
      'wixsite.com': 'Wix',
      'wix.com': 'Wix',
      'squarespace.com': 'Squarespace',
      'wordpress.com': 'WordPress',
      'vercel.app': 'Vercel',
      'netlify.app': 'Netlify',
      'herokuapp.com': 'Heroku',
      'carrd.co': 'Carrd',
      'framer.app': 'Framer',
      'softr.app': 'Softr',
      'glide.page': 'Glide',
    }
    for (const [domain, name] of Object.entries(platforms)) {
      if (hostname.endsWith(domain)) return name
    }
    return null
  }
  function requiresPath(hostname: string): boolean {
    for (const domain of platformsRequiringPath) {
      if (hostname.endsWith(domain)) return true
    }
    return false
  }

  async function handleUrlBlur() {
    if (!targetUrl.trim()) {
      setUrlError(null)
      return
    }

    let url = targetUrl.trim()

    // Auto-prefix https:// if user typed a domain without protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
      setTargetUrl(url)
    }

    // Validate URL format
    try {
      const parsed = new URL(url)
      if (!parsed.hostname.includes('.')) {
        setUrlError('URL inválida. Insira um domínio válido (ex: meusite.com.br)')
        return
      }
      // Detect platform
      const platform = detectPlatform(parsed.hostname)
      setDetectedPlatform(platform)
      setPlatformPathHint(null)
      // Checar se tem path significativo
      const hasPath = parsed.pathname !== '/' && parsed.pathname !== ''
      if (hasPath && !platform) {
        // Domínio próprio com path — perguntar ao usuário
        setCleanUrl(parsed.origin)
        setShowPathWarning(true)
      } else if (hasPath && platform) {
        // Plataforma conhecida com path — manter automaticamente (path é necessário)
        setShowPathWarning(false)
      } else if (!hasPath && platform && requiresPath(parsed.hostname)) {
        // Plataforma que exige path — bloquear
        setUrlError(`O ${platform} precisa do caminho completo na URL. Adicione o path do seu app (ex: /version-test ou /version-live).`)
        setPlatformPathHint(null)
        return
      } else {
        url = parsed.origin
        setTargetUrl(url)
        setShowPathWarning(false)
      }
    } catch {
      setUrlError('URL inválida. Insira um domínio válido (ex: meusite.com.br)')
      return
    }

    // Check if domain is already registered
    try {
      const res = await fetch('/api/projects/check-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: url }),
      })
      const data = await res.json()
      if (data.exists) {
        setUrlError('Este site já foi cadastrado por outro projeto.')
        return
      }
    } catch {
      // Non-blocking — allow form submission if check fails
    }

    setUrlError(null)
  }

  const isUrlValid = targetUrl.startsWith('http') && !urlError

  const checkUrl = useCallback(async (url: string) => {
    if (!url || !url.startsWith('http')) return
    setUrlChecking(true)
    setUrlWarnings([])
    setUrlChecked(false)
    setUrlValid(false)
    try {
      const res = await fetch('/api/check-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      const warnings: UrlWarning[] = data.warnings || []
      setUrlWarnings(warnings)
      setUrlChecked(true)
      setUrlValid(!warnings.some((w: UrlWarning) => w.type === 'error'))
    } catch {
      setUrlWarnings([{ type: 'error', message: 'Erro ao verificar URL.' }])
      setUrlChecked(true)
    } finally {
      setUrlChecking(false)
    }
  }, [])

  // Step 1 → Step 2: after URL is validated, analyze and go to integration
  async function analyzeAndProceed() {
    if (!targetUrl || urlError) return
    setUrlAnalyzing(true)
    setRecommendedMode(null)
    setProxyBlocked(false)
    setSiteType(null)

    try {
      // Check URL accessibility and determine recommended mode
      const res = await fetch('/api/check-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      })
      const data = await res.json()
      const warnings: UrlWarning[] = data.warnings || []
      setUrlWarnings(warnings)
      setUrlChecked(true)
      setUrlValid(!warnings.some((w: UrlWarning) => w.type === 'error'))

      // Use API response for recommendation
      const recommended: Mode = data.recommendedMode || 'proxy'
      const blocked = data.proxyBlocked || false
      setRecommendedMode(recommended)
      setProxyBlocked(blocked)
      setSiteType(data.siteType || null)
      setMode(recommended)
      setUrlReady(true)

      // Auto-fill project name from meta title or URL hostname
      if (data.metaTitle) {
        setValue('name', data.metaTitle.slice(0, 80))
      } else {
        try {
          const hostname = new URL(targetUrl).hostname.replace(/^www\./, '')
          const siteName = hostname.split('.')[0]
          setValue('name', siteName.charAt(0).toUpperCase() + siteName.slice(1))
        } catch { /* ignore */ }
      }

      // Auto-fill description from meta description
      if (data.metaDescription) {
        setValue('description', data.metaDescription)
      }

      // Auto-advance to step 2
      setValue('targetUrl', targetUrl)
      setStep(2)
    } catch {
      // If check fails, default to embed and proceed
      setRecommendedMode('embed')
      setMode('embed')
      setUrlReady(true)

      try {
        const hostname = new URL(targetUrl).hostname.replace(/^www\./, '')
        const siteName = hostname.split('.')[0]
        const capitalized = siteName.charAt(0).toUpperCase() + siteName.slice(1)
        setValue('name', capitalized)
      } catch { /* ignore */ }

      setValue('targetUrl', targetUrl)
      setStep(2)
    } finally {
      setUrlAnalyzing(false)
    }
  }

  function goToStep2(selectedMode: Mode) {
    setMode(selectedMode)
    if (targetUrl) {
      setValue('targetUrl', targetUrl)
    }
    setStep(2)
  }

  function goToStep3() {
    setStep(3)
  }

  function goToStep4(data: ProjectForm) {
    setSavedFormData(data)
    setStep(4)
  }

  async function onFinalSubmit() {
    if (!savedFormData) return
    setServerError(null)
    try {
      const project = await api.projects.create({
        ...savedFormData,
        mode: mode || 'proxy',
        widgetStyle,
        widgetText,
        widgetPosition,
        widgetColor,
      })
      router.push(`/projects/${project.id}`)
    } catch (err: any) {
      setServerError(err.message || 'Erro ao criar projeto.')
    }
  }

  return (
    <AppLayout>
    <div className="app-page app-page--wizard create-wizard">
      <header className="create-wizard-header sticky top-0 z-10 -mx-[clamp(1rem,4vw,2rem)] mb-0 bg-[var(--surface-background)]/90 px-[clamp(1rem,4vw,2rem)] pb-5 pt-2 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--surface-background)]/75">
        <nav className="create-wizard-breadcrumb" aria-label="Navegação">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5">
            <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis} aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </AppIcon>
            Projetos
          </Link>
          <span className="create-wizard-breadcrumb-sep">/</span>
          <span className="create-wizard-breadcrumb-current">Novo projeto</span>
        </nav>

        <div className="create-wizard-rail-wrap">
          <ol className="create-wizard-rail" aria-label="Etapas do assistente">
            {WIZARD_STEPS.map((s, i) => {
              const isDone = step > s.num
              const isCurrent = step === s.num
              const labelClass = clsx(
                'create-wizard-rail-label',
                isCurrent && 'create-wizard-rail-label--current',
                isDone && 'create-wizard-rail-label--done',
                !isCurrent && !isDone && 'create-wizard-rail-label--future',
              )
              return (
                <Fragment key={`wizard-rail-${s.num}`}>
                  {i > 0 && (
                    <li className="create-wizard-rail-track-item" aria-hidden>
                      <div
                        className={clsx(
                          'create-wizard-rail-track',
                          step > WIZARD_STEPS[i - 1].num && 'create-wizard-rail-track--complete',
                        )}
                      />
                    </li>
                  )}
                  <li className="create-wizard-rail-stop">
                    <div className="flex flex-col items-center gap-2">
                      {isDone ? (
                        <button
                          type="button"
                          className="create-wizard-rail-node create-wizard-rail-node--done"
                          onClick={() => setStep(s.num)}
                          title={`Voltar para: ${s.label}`}
                        >
                          <AppIcon size={16} strokeWidth={ICON_STROKE.emphasis}>
                            <polyline points="20 6 9 17 4 12" />
                          </AppIcon>
                        </button>
                      ) : (
                        <span
                          className={clsx(
                            'create-wizard-rail-node',
                            isCurrent && 'create-wizard-rail-node--current',
                            !isCurrent && 'create-wizard-rail-node--future',
                          )}
                          {...(isCurrent ? { 'aria-current': 'step' as const } : {})}
                        >
                          {s.num}
                        </span>
                      )}
                      <span className={labelClass}>{s.label}</span>
                    </div>
                  </li>
                </Fragment>
              )
            })}
          </ol>
        </div>
      </header>

      <div
        style={{
          width: '100%',
          maxWidth: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >

        {/* Limit blocked state for members */}
        {limitBlocked && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', paddingTop: '4rem', textAlign: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--warning-alpha-weak)',
              }}
            >
              <AppIcon size={28}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="var(--warning-on-background-strong)" />
                <line x1="12" y1="9" x2="12" y2="13" stroke="var(--warning-on-background-strong)" />
                <line x1="12" y1="17" x2="12.01" y2="17" stroke="var(--warning-on-background-strong)" />
              </AppIcon>
            </div>
            <h2 className="app-section-title">Limite de projetos atingido</h2>
            <p className="app-section-sub" style={{ maxWidth: 'min(40rem, 100%)' }}>
              {limitBlocked}
            </p>
            <a href="/dashboard" className="app-btn-secondary" style={{ textDecoration: 'none' }}>Voltar aos projetos</a>
          </div>
        )}

        {/* Loading state */}
        {limitLoading && !limitBlocked && (
          <div>
            <span>Verificando limites...</span>
          </div>
        )}

        {/* Step 1: URL */}
        {!limitBlocked && !limitLoading && step === 1 && (
          <div className="create-wizard-body create-wizard-body--stack">
            <WizardSectionTitle
              title="Qual site você quer monitorar?"
              subtitle="Cole a URL da barra do navegador. Você pode colar com ou sem https:// — ajustamos antes de validar."
            />

            <div className="create-wizard-card create-wizard-card--hero w-full">
              <div className="flex flex-col gap-5">
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.875rem 1rem',
                      borderRadius: '0.75rem',
                      border: `2px solid ${urlError ? 'var(--danger-solid-strong)' : targetUrl && isUrlValid ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)'}`,
                      background: 'var(--surface-background)',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: urlError ? 'var(--danger-alpha-weak)' : targetUrl && isUrlValid ? 'var(--brand-alpha-weak)' : 'var(--neutral-alpha-weak)',
                      flexShrink: 0,
                      transition: 'all 0.2s',
                    }}>
                      <AppIcon size={18}>
                        {urlError ? (
                          <><circle cx="12" cy="12" r="10" stroke="var(--danger-on-background-strong)" /><line x1="15" y1="9" x2="9" y2="15" stroke="var(--danger-on-background-strong)" /><line x1="9" y1="9" x2="15" y2="15" stroke="var(--danger-on-background-strong)" /></>
                        ) : targetUrl && isUrlValid ? (
                          <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="var(--brand-solid-strong)" /><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="var(--brand-solid-strong)" /></>
                        ) : (
                          <><circle cx="12" cy="12" r="10" stroke="var(--neutral-on-background-weak)" /><line x1="2" y1="12" x2="22" y2="12" stroke="var(--neutral-on-background-weak)" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="var(--neutral-on-background-weak)" /></>
                        )}
                      </AppIcon>
                    </div>
                    <input
                      type="url"
                      placeholder="meusite.com.br"
                      value={targetUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      onBlur={handleUrlBlur}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && isUrlValid && !urlAnalyzing) {
                          e.preventDefault()
                          analyzeAndProceed()
                        }
                      }}
                      autoFocus
                      className="min-w-0 flex-1 border-none bg-transparent font-inherit text-base font-medium text-off-white outline-none placeholder:text-gray"
                    />
                    {targetUrl && isUrlValid && !urlAnalyzing && (
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: 'var(--success-alpha-weak)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <AppIcon size={16}><polyline points="20 6 9 17 4 12" stroke="var(--success-on-background-strong)" /></AppIcon>
                      </div>
                    )}
                    {urlAnalyzing && (
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: '2px solid var(--brand-solid-strong)',
                        borderTopColor: 'transparent',
                        animation: 'create-wizard-spin 0.8s linear infinite',
                        flexShrink: 0,
                      }} />
                    )}
                  </div>
                </div>

                {/* Error message */}
                {urlError && (
                  <div
                    className="flex items-center gap-2 rounded-lg border px-3.5 py-2.5"
                    style={{
                      background: 'var(--danger-alpha-weak)',
                      borderColor: 'var(--danger-border-medium)',
                    }}
                  >
                    <AppIcon size={14}>
                      <circle cx="12" cy="12" r="10" stroke="var(--danger-on-background-strong)" />
                      <line x1="12" y1="8" x2="12" y2="12" stroke="var(--danger-on-background-strong)" />
                      <line x1="12" y1="16" x2="12.01" y2="16" stroke="var(--danger-on-background-strong)" />
                    </AppIcon>
                    <span className="flex-1 text-sm leading-snug" style={{ color: 'var(--danger-on-background-strong)' }}>{urlError}</span>
                  </div>
                )}

                {/* Valid URL hint */}
                {!urlError && !targetUrl && !showPathWarning && (
                  <p className="text-center text-sm text-gray">
                    Ex.: meusite.com.br, minhaloja.shopify.com, app.seudominio.com
                  </p>
                )}

                {/* Path warning */}
                {showPathWarning && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '10px 14px',
                    borderRadius: '0.75rem', background: 'var(--warning-alpha-weak)', border: '1px solid var(--warning-border-medium)',
                    flexWrap: 'wrap',
                  }}>
                    <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis} style={{ flexShrink: 0, color: 'var(--warning-on-background-strong)' }}>
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </AppIcon>
                    <span className="flex-1 text-sm leading-snug text-[var(--warning-on-background-strong)]">
                      Detectamos um caminho na URL. Deseja manter?
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowPathWarning(false)}
                        className="cursor-pointer whitespace-nowrap rounded-md border border-[var(--warning-border-medium)] bg-transparent px-3 py-1.5 text-xs font-semibold text-[var(--warning-on-background-strong)]"
                      >
                        Manter completa
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTargetUrl(cleanUrl); setShowPathWarning(false) }}
                        className="cursor-pointer whitespace-nowrap rounded-md border-none bg-[var(--warning-solid-strong)] px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Usar só domínio
                      </button>
                    </div>
                  </div>
                )}

                {/* Platform detection hint */}
                {detectedPlatform && !urlError && !showPathWarning && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '8px 12px',
                    borderRadius: '0.75rem', background: 'var(--brand-alpha-weak)', border: '1px solid var(--brand-border-medium)',
                  }}>
                    <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis} style={{ flexShrink: 0, color: 'var(--brand-on-background-strong)' }}>
                      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                    </AppIcon>
                    <span className="text-sm leading-snug text-[var(--brand-on-background-strong)]">
                      Detectamos que você usa <strong className="font-semibold text-off-white">{detectedPlatform}</strong> — funciona perfeitamente com o Buug!
                    </span>
                  </div>
                )}

                {/* Platform path hint — missing required path */}
                {platformPathHint && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '8px 12px',
                    borderRadius: '0.75rem', background: 'var(--warning-alpha-weak)', border: '1px solid var(--warning-border-medium)',
                  }}>
                    <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis} style={{ flexShrink: 0, color: 'var(--warning-on-background-strong)' }}>
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </AppIcon>
                    <span className="text-sm leading-snug text-[var(--warning-on-background-strong)]">
                      {platformPathHint}
                    </span>
                  </div>
                )}

                {/* Analyzing state */}
                {urlAnalyzing && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '1.25rem',
                      borderRadius: '0.75rem',
                      background: 'var(--brand-alpha-weak)',
                      border: '1px solid var(--brand-border-medium)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: '2px solid var(--brand-solid-strong)',
                        borderTopColor: 'transparent',
                        animation: 'create-wizard-spin 0.8s linear infinite',
                      }} />
                      <span className="text-sm font-semibold text-[var(--brand-on-background-strong)]">
                        Analisando seu site...
                      </span>
                    </div>
                    <span className="text-center text-sm text-gray">
                      Verificando acessibilidade e o melhor modo de integração.
                    </span>
                  </div>
                )}

                <div>
                  <Button
                    type="button"
                    size="large"
                    onClick={analyzeAndProceed}
                    disabled={!isUrlValid || urlAnalyzing || !!urlError}
                    className="w-full sm:w-auto min-w-[10rem]"
                  >
                    {urlAnalyzing ? 'Analisando...' : 'Continuar'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="create-wizard-trust">
              {[
                { icon: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>, text: 'Conexão tratada com cuidado' },
                { icon: <><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></>, text: 'Configuração em poucos minutos' },
                { icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>, text: 'Comece no plano Free' },
              ].map((f, i) => (
                <div key={i} className="create-wizard-trust-item">
                  <span className="create-wizard-trust-icon">
                    <AppIcon size={14}>{f.icon}</AppIcon>
                  </span>
                  {f.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: integração */}
        {!limitBlocked && !limitLoading && step === 2 && (
          <div className="create-wizard-body create-wizard-body--stack">
            <WizardSectionTitle
              title="Modo de integração"
              subtitle="Link rápido para QA ou script no site para replay e mais contexto. Troca quando quiser nas configurações do projeto."
            />

            {/* URL badge */}
            <div
              className="create-wizard-card flex items-center gap-3 px-4 py-3"
              style={{ boxShadow: 'none' }}
            >
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--brand-solid-strong)',
                color: '#fff',
                flexShrink: 0,
              }}>
                <AppIcon size={14}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></AppIcon>
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-off-white">
                  {targetUrl}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="shrink-0 cursor-pointer border-none bg-transparent text-xs font-medium text-[var(--brand-on-background-strong)]"
              >
                Alterar
              </button>
            </div>

            {/* Site type detection badge */}
            {siteType && (
              <div
                className="flex items-center gap-2.5 rounded-lg border px-4 py-3"
                style={{
                  background: proxyBlocked
                    ? 'var(--danger-alpha-weak)'
                    : recommendedMode === 'embed'
                      ? 'var(--info-alpha-weak)'
                      : 'var(--success-alpha-weak)',
                  borderColor: proxyBlocked
                    ? 'var(--danger-border-medium)'
                    : recommendedMode === 'embed'
                      ? 'var(--info-border-medium)'
                      : 'var(--success-border-medium)',
                }}
              >
                <AppIcon size={16}>
                  {proxyBlocked ? (
                    <>
                      <circle cx="12" cy="12" r="10" stroke="var(--danger-on-background-strong)" />
                      <line x1="12" y1="8" x2="12" y2="12" stroke="var(--danger-on-background-strong)" />
                      <line x1="12" y1="16" x2="12.01" y2="16" stroke="var(--danger-on-background-strong)" />
                    </>
                  ) : recommendedMode === 'embed' ? (
                    <>
                      <circle cx="12" cy="12" r="10" stroke="var(--info-on-background-strong)" />
                      <polyline points="16 12 12 8 8 12" stroke="var(--info-on-background-strong)" />
                      <line x1="12" y1="16" x2="12" y2="8" stroke="var(--info-on-background-strong)" />
                    </>
                  ) : (
                    <>
                      <circle cx="12" cy="12" r="10" stroke="var(--success-on-background-strong)" />
                      <polyline points="16 12 12 8 8 12" stroke="var(--success-on-background-strong)" />
                      <line x1="12" y1="16" x2="12" y2="8" stroke="var(--success-on-background-strong)" />
                    </>
                  )}
                </AppIcon>
                <span
                  className="flex-1 text-sm leading-snug"
                  style={{
                    color: proxyBlocked
                      ? 'var(--danger-on-background-strong)'
                      : recommendedMode === 'embed'
                        ? 'var(--info-on-background-strong)'
                        : 'var(--success-on-background-strong)',
                  }}
                >
                  {proxyBlocked
                    ? `${siteType} detectado — Link Rápido não é compatível com este tipo de site. Use a Instalação no Site.`
                    : recommendedMode === 'embed'
                      ? `${siteType} detectado — recomendamos Instalação no Site para Session Replay e melhor compatibilidade.`
                      : `${siteType} detectado — compatível com Link Rápido! Para Session Replay, use Instalação no Site.`}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Proxy mode */}
              <div
                className="create-wizard-card min-h-[17rem] p-6 md:min-h-[19rem] md:p-8"
                onClick={() => !proxyBlocked && setMode('proxy')}
                style={{
                  borderRadius: 'var(--radius-l)',
                  borderWidth: 2,
                  borderStyle: 'solid',
                  borderColor: proxyBlocked ? 'var(--neutral-border-medium)' : mode === 'proxy' ? 'var(--brand-solid-strong)' : 'rgba(255,255,255,0.1)',
                  background: proxyBlocked ? 'var(--neutral-alpha-weak)' : mode === 'proxy' ? 'var(--brand-alpha-weak)' : 'transparent',
                  cursor: proxyBlocked ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  opacity: proxyBlocked ? 0.5 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: mode === 'proxy' ? '0 0 0 1px rgba(86, 67, 204, 0.2), var(--shadow-m)' : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: proxyBlocked ? 'var(--neutral-alpha-medium)' : mode === 'proxy' ? 'var(--brand-solid-strong)' : 'var(--neutral-alpha-medium)', color: proxyBlocked ? 'var(--neutral-on-background-weak)' : mode === 'proxy' ? '#fff' : 'var(--neutral-on-background-weak)', transition: 'all 0.15s' }}>
                      <AppIcon size="xl"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></AppIcon>
                    </div>
                    <span className="text-base font-semibold text-off-white">Link Rápido</span>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${proxyBlocked ? 'var(--neutral-border-medium)' : mode === 'proxy' ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                    {!proxyBlocked && mode === 'proxy' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--brand-solid-strong)' }} />}
                    {proxyBlocked && <AppIcon size={12}><line x1="18" y1="6" x2="6" y2="18" stroke="var(--neutral-on-background-weak)" /><line x1="6" y1="6" x2="18" y2="18" stroke="var(--neutral-on-background-weak)" /></AppIcon>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="rounded-full bg-[var(--neutral-alpha-weak)] px-2 py-0.5 text-xs font-medium text-gray">
                    Sem instalação
                  </span>
                  {proxyBlocked && (
                    <span className="rounded-full bg-[var(--danger-alpha-weak)] px-2 py-0.5 text-xs font-medium text-[var(--danger-on-background-strong)]">
                      Indisponível
                    </span>
                  )}
                  {!proxyBlocked && recommendedMode === 'proxy' && (
                    <span className="rounded-full bg-[var(--success-alpha-weak)] px-2 py-0.5 text-xs font-medium text-[var(--success-on-background-strong)]">
                      Recomendado
                    </span>
                  )}
                </div>
                <p className="m-0 text-sm leading-normal text-primary-text">
                  Cole a URL do site e compartilhe o link de QA. Nada para instalar.
                </p>
                <p className="m-0 text-xs leading-normal text-gray">
                  Ideal para sites simples, landing pages e testes rápidos.
                </p>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                  <span className="rounded-full bg-[var(--success-alpha-weak)] px-2 py-0.5 text-xs text-[var(--success-on-background-strong)]">
                    ✓ Screenshot
                  </span>
                  <span className="rounded-full bg-[var(--success-alpha-weak)] px-2 py-0.5 text-xs text-[var(--success-on-background-strong)]">
                    ✓ Console Logs
                  </span>
                  <span className="rounded-full bg-[var(--success-alpha-weak)] px-2 py-0.5 text-xs text-[var(--success-on-background-strong)]">
                    ✓ Network Logs
                  </span>
                  <span className="rounded-full bg-[var(--danger-alpha-weak)] px-2 py-0.5 text-xs text-[var(--danger-on-background-strong)]">
                    ✗ Session Replay
                  </span>
                </div>
              </div>

              {/* Embed mode */}
              <div
                className="create-wizard-card min-h-[17rem] p-6 md:min-h-[19rem] md:p-8"
                onClick={() => setMode('embed')}
                style={{
                  borderRadius: 'var(--radius-l)',
                  borderWidth: 2,
                  borderStyle: 'solid',
                  borderColor: mode === 'embed' ? 'var(--brand-solid-strong)' : 'rgba(255,255,255,0.1)',
                  background: mode === 'embed' ? 'var(--brand-alpha-weak)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: mode === 'embed' ? '0 0 0 1px rgba(86, 67, 204, 0.2), var(--shadow-m)' : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: mode === 'embed' ? 'var(--brand-solid-strong)' : 'var(--neutral-alpha-medium)', color: mode === 'embed' ? '#fff' : 'var(--neutral-on-background-weak)', transition: 'all 0.15s' }}>
                      <AppIcon size="xl"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></AppIcon>
                    </div>
                    <span className="text-base font-semibold text-off-white">Instalação no Site</span>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${mode === 'embed' ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                    {mode === 'embed' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--brand-solid-strong)' }} />}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {recommendedMode === 'embed' && (
                    <span className="rounded-full bg-[var(--success-alpha-weak)] px-2 py-0.5 text-xs font-medium text-[var(--success-on-background-strong)]">
                      Recomendado
                    </span>
                  )}
                </div>
                <p className="m-0 text-sm leading-normal text-primary-text">
                  Adicione uma linha de código ao seu site. Funciona em qualquer lugar.
                </p>
                <p className="m-0 text-xs leading-normal text-gray">
                  Ideal para SPAs, sites com autenticação e produção.
                </p>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                  <span className="rounded-full bg-[var(--success-alpha-weak)] px-2 py-0.5 text-xs text-[var(--success-on-background-strong)]">
                    ✓ Screenshot
                  </span>
                  <span className="rounded-full bg-[var(--success-alpha-weak)] px-2 py-0.5 text-xs text-[var(--success-on-background-strong)]">
                    ✓ Session Replay
                  </span>
                  <span className="rounded-full bg-[var(--success-alpha-weak)] px-2 py-0.5 text-xs text-[var(--success-on-background-strong)]">
                    ✓ Console Logs
                  </span>
                  <span className="rounded-full bg-[var(--success-alpha-weak)] px-2 py-0.5 text-xs text-[var(--success-on-background-strong)]">
                    ✓ Network Logs
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" size="medium" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button type="button" size="medium" onClick={goToStep3} disabled={!mode}>
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: dados */}
        {!limitBlocked && !limitLoading && step === 3 && (
          <div className="create-wizard-body create-wizard-body--stack">
            <WizardSectionTitle title="Dados do projeto" subtitle="Nome e descrição ajudam o time a reconhecer o projeto no painel." />

            {/* Mode badge */}
            <div className="create-wizard-card flex items-center gap-3 px-4 py-3" style={{ boxShadow: 'none' }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '0.375rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--brand-solid-strong)',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {mode === 'proxy' ? (
                  <AppIcon size={14}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></AppIcon>
                ) : (
                  <AppIcon size={14}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></AppIcon>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-semibold text-off-white">
                  {mode === 'proxy' ? 'Link Rápido' : 'Instalação no Site'}
                </span>
                <span className="ml-2 inline-block max-w-full truncate align-bottom text-xs text-gray">
                  {targetUrl}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="shrink-0 cursor-pointer border-none bg-transparent text-xs font-medium text-[var(--brand-on-background-strong)]"
              >
                Alterar
              </button>
            </div>

            <div className="create-wizard-card create-wizard-card--hero">
              {serverError && (
                <div className="mb-6 flex items-start gap-2.5 rounded-lg border px-3 py-3" style={{ background: 'var(--danger-alpha-weak)', borderColor: 'var(--danger-border-medium)' }}>
                  <AppIcon size={16} strokeWidth={ICON_STROKE.emphasis}>
                    <circle cx="12" cy="12" r="10" stroke="var(--danger-on-background-strong)" />
                    <line x1="12" y1="8" x2="12" y2="12" stroke="var(--danger-on-background-strong)" />
                    <line x1="12" y1="16" x2="12.01" y2="16" stroke="var(--danger-on-background-strong)" />
                  </AppIcon>
                  <span className="flex-1 text-sm leading-relaxed" style={{ color: 'var(--danger-on-background-strong)' }}>{serverError}</span>
                </div>
              )}

              <form className="flex flex-col gap-5" onSubmit={handleSubmit(goToStep4)}>
                <input type="hidden" {...register('targetUrl')} />

                <div className="flex flex-col gap-2">
                  <label htmlFor="project-name" className="text-sm font-medium text-off-white">
                    Nome do projeto
                  </label>
                  <input
                    id="project-name"
                    type="text"
                    placeholder="Ex.: Portal do cliente"
                    {...register('name')}
                    className="app-input w-full"
                  />
                  {errors.name && <p className="text-sm" style={{ color: 'var(--danger-on-background-strong)' }}>{errors.name.message}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="project-description" className="text-sm font-medium text-off-white">
                    Descrição <span className="font-normal text-gray">(opcional)</span>
                  </label>
                  <textarea
                    id="project-description"
                    placeholder="Uma linha sobre o que este site faz..."
                    rows={3}
                    {...register('description')}
                    className="app-input min-h-[5.5rem] resize-y"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="secondary" size="medium" onClick={() => setStep(2)}>
                    Voltar
                  </Button>
                  <Button type="submit" size="medium">
                    Continuar
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Step 4: Widget customization */}
        {!limitBlocked && !limitLoading && step === 4 && (
          <div className="create-wizard-body create-wizard-body--stack">
            <WizardSectionTitle
              title="Personalizar widget"
              subtitle="Cor, texto e posição do botão no site. Depois você ajusta de novo nas configurações do projeto."
            />

            {serverError && (
              <div className="flex items-start gap-2.5 rounded-lg border px-3 py-3" style={{ background: 'var(--danger-alpha-weak)', borderColor: 'var(--danger-border-medium)' }}>
                <AppIcon size={16} strokeWidth={ICON_STROKE.emphasis} style={{ color: 'var(--danger-on-background-strong)' }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </AppIcon>
                <span className="flex-1 text-sm leading-relaxed" style={{ color: 'var(--danger-on-background-strong)' }}>{serverError}</span>
              </div>
            )}

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
              {/* Controls */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Widget style */}
                <div>
                  <span className="mb-2 block text-sm font-medium text-off-white">Estilo do botão</span>
                  <div className="flex gap-3">
                    {(['text', 'icon'] as const).map((s) => (
                      <div
                        key={s}
                        onClick={() => setWidgetStyle(s)}
                        style={{
                          flex: 1,
                          padding: '1rem',
                          borderRadius: 'var(--radius-l)',
                          border: `2px solid ${widgetStyle === s ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)'}`,
                          background: widgetStyle === s ? 'var(--brand-alpha-weak)' : 'transparent',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                          {s === 'text' ? (
                            <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', padding: '10px 6px', borderRadius: '8px 0 0 8px', background: widgetColor, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: 10, letterSpacing: '-0.02em' }}>Buug report</span>
                            </div>
                          ) : (
                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: widgetColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 900, fontSize: 13, letterSpacing: '-0.04em', lineHeight: 0.95, textAlign: 'left', textTransform: 'uppercase', whiteSpace: 'pre' }}>{'BU\nUG'}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-off-white">
                          {s === 'text' ? 'Texto' : 'Ícone'}
                        </span>
                        <p className="mt-1 text-xs leading-normal text-gray">
                          {s === 'text' ? 'Tag lateral com texto' : 'Botão circular com logo'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Widget position */}
                <div>
                  <span className="mb-2 block text-sm font-medium text-off-white">Posição na página</span>
                  <div style={{
                    width: '100%',
                    aspectRatio: '16 / 10',
                    maxWidth: 260,
                    borderRadius: 'var(--radius-l)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'var(--neutral-alpha-weak)',
                    position: 'relative',
                  }}>
                    {/* Empty space for clean look */}
                    {/* 8 clickable dots */}
                    {([
                      { value: 'top-left', style: { top: 8, left: 8 } },
                      { value: 'top-center', style: { top: 8, left: '50%', transform: 'translateX(-50%)' } },
                      { value: 'top-right', style: { top: 8, right: 8 } },
                      { value: 'middle-left', style: { top: '50%', left: 8, transform: 'translateY(-50%)' } },
                      { value: 'middle-right', style: { top: '50%', right: 8, transform: 'translateY(-50%)' } },
                      { value: 'bottom-left', style: { bottom: 8, left: 8 } },
                      { value: 'bottom-center', style: { bottom: 8, left: '50%', transform: 'translateX(-50%)' } },
                      { value: 'bottom-right', style: { bottom: 8, right: 8 } },
                    ] as { value: string; style: React.CSSProperties }[]).map((pos) => {
                      const isActive = widgetPosition === pos.value
                      return (
                        <button
                          key={pos.value}
                          onClick={() => setWidgetPosition(pos.value)}
                          title={pos.value.replace('top-', 'Superior ').replace('bottom-', 'Inferior ').replace('middle-', 'Meio ').replace('left', 'esquerda').replace('right', 'direita').replace('center', 'centro')}
                          style={{
                            position: 'absolute',
                            ...pos.style,
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <div style={{
                            width: isActive ? 16 : 10,
                            height: isActive ? 16 : 10,
                            borderRadius: '50%',
                            background: isActive ? widgetColor : 'var(--neutral-alpha-medium)',
                            border: isActive ? '2px solid #fff' : '2px solid transparent',
                            boxShadow: isActive ? `0 0 0 2px ${widgetColor}, 0 2px 8px ${widgetColor}66` : 'none',
                            transition: 'all 0.2s ease',
                            pointerEvents: 'none',
                          }} />
                        </button>
                      )
                    })}
                  </div>
                  <span className="mt-1.5 block text-xs text-gray">
                    {widgetPosition.replace('top-', 'Superior ').replace('bottom-', 'Inferior ').replace('middle-', 'Meio ').replace('left', 'esquerda').replace('right', 'direita').replace('center', 'centro')}
                  </span>
                </div>

                {/* Widget color */}
                <div>
                  <span className="mb-2 block text-sm font-medium text-off-white">Cor</span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {['#4f46e5', '#dc2626', '#16a34a', '#d97706', '#0ea5e9', '#8b5cf6', '#ec4899', '#1e293b'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setWidgetColor(c)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: c,
                          border: widgetColor === c ? '3px solid var(--neutral-on-background-strong)' : '2px solid transparent',
                          cursor: 'pointer',
                          outline: widgetColor === c ? '2px solid var(--surface-background)' : 'none',
                          outlineOffset: -4,
                          transition: 'all 0.15s',
                        }}
                      />
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginLeft: '0.25rem' }}>
                      <input
                        type="color"
                        value={widgetColor}
                        onChange={(e) => setWidgetColor(e.target.value)}
                        style={{ width: 32, height: 32, border: 'none', borderRadius: '50%', cursor: 'pointer', padding: 0 }}
                      />
                      <input
                        type="text"
                        value={widgetColor}
                        onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setWidgetColor(e.target.value) }}
                        className="w-[5.5rem] rounded-md border border-[var(--neutral-border-medium)] bg-[var(--surface-background)] px-2 py-1.5 font-mono text-xs text-off-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Live preview with real site */}
              <div style={{ width: 320, flexShrink: 0 }}>
                <span className="mb-2 block text-sm font-medium text-off-white">Preview</span>
                <div style={{
                  borderRadius: '0.75rem',
                  border: '1px solid var(--neutral-border-medium)',
                  overflow: 'hidden',
                  background: 'var(--surface-background)',
                }}>
                  {/* Mock browser bar */}
                  <div style={{
                    padding: '0.5rem 0.75rem',
                    background: 'var(--neutral-alpha-weak)',
                    borderBottom: '1px solid var(--neutral-border-medium)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e' }} />
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840' }} />
                    </div>
                    <div className="min-w-0 flex-1 truncate rounded bg-[var(--surface-background)] px-2 py-1 text-xs text-gray">
                      {targetUrl || 'https://meusite.com.br'}
                    </div>
                  </div>

                  {/* Real site iframe with widget overlay */}
                  <div style={{ position: 'relative', height: 280, overflow: 'hidden' }}>
                    {proxyBlocked ? (
                      /* Skeleton fallback for sites that block iframes */
                      <div style={{ width: '100%', height: '100%', background: 'var(--neutral-alpha-weak)', display: 'flex', flexDirection: 'column', padding: 16, gap: 8 }}>
                        <div style={{ width: '40%', height: 10, borderRadius: 4, background: 'var(--neutral-alpha-medium)' }} />
                        <div style={{ width: '70%', height: 8, borderRadius: 4, background: 'var(--neutral-alpha-weak)', marginTop: 8 }} />
                        <div style={{ width: '55%', height: 8, borderRadius: 4, background: 'var(--neutral-alpha-weak)' }} />
                        <div style={{ width: '90%', height: 60, borderRadius: 8, background: 'var(--neutral-alpha-weak)', marginTop: 12 }} />
                        <div style={{ width: '65%', height: 8, borderRadius: 4, background: 'var(--neutral-alpha-weak)', marginTop: 12 }} />
                        <div style={{ width: '80%', height: 8, borderRadius: 4, background: 'var(--neutral-alpha-weak)' }} />
                        <div style={{ width: '45%', height: 8, borderRadius: 4, background: 'var(--neutral-alpha-weak)' }} />
                      </div>
                    ) : (
                      <iframe
                        src={targetUrl}
                        title="Preview do site"
                        sandbox="allow-scripts allow-same-origin"
                        style={{
                          width: '200%',
                          height: '200%',
                          border: 'none',
                          transform: 'scale(0.5)',
                          transformOrigin: 'top left',
                          pointerEvents: 'none',
                        }}
                      />
                    )}

                    {/* Widget overlay */}
                    <div style={{
                      position: 'absolute',
                      transition: 'all 0.3s ease',
                      zIndex: 2,
                      ...(widgetStyle === 'icon' ? {
                        ...(widgetPosition.includes('top') ? { top: 10 } : widgetPosition.includes('middle') ? { top: '50%', transform: 'translateY(-50%)' } : { bottom: 10 }),
                        ...(widgetPosition.includes('left') ? { left: 10 } : widgetPosition.includes('center') ? { left: '50%', transform: 'translateX(-50%)' } : { right: 10 }),
                      } : {
                        ...(widgetPosition.includes('center') ? {
                          ...(widgetPosition.includes('top') ? { top: 0 } : { bottom: 0 }),
                          left: '50%', transform: 'translateX(-50%)',
                        } : {
                          ...(widgetPosition.includes('top') ? { top: 10 } : widgetPosition.includes('middle') ? { top: '50%', transform: 'translateY(-50%)' } : { bottom: 10 }),
                          ...(widgetPosition.includes('left') ? { left: 0 } : { right: 0 }),
                        }),
                      }),
                    }}>
                      {widgetStyle === 'icon' ? (
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: widgetColor,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: `0 4px 12px ${widgetColor}66`,
                        }}>
                          <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 900, fontSize: 10, letterSpacing: '-0.04em', lineHeight: 0.95, textAlign: 'left', textTransform: 'uppercase', whiteSpace: 'pre' }}>{'BU\nUG'}</span>
                        </div>
                      ) : widgetPosition.includes('center') ? (
                        <div style={{
                          padding: '4px 12px',
                          background: widgetColor,
                          color: '#fff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          boxShadow: `0 4px 12px ${widgetColor}66`,
                          whiteSpace: 'nowrap',
                          borderRadius: widgetPosition.includes('top') ? '0 0 6px 6px' : '6px 6px 0 0',
                        }}>
                          <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: 9, letterSpacing: '-0.02em' }}>Buug report</span>
                        </div>
                      ) : (
                        <div style={{
                          writingMode: widgetPosition.includes('left') ? 'vertical-lr' : 'vertical-rl',
                          textOrientation: 'mixed',
                          padding: '10px 5px',
                          background: widgetColor,
                          color: '#fff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: `0 4px 12px ${widgetColor}66`,
                          borderRadius: widgetPosition.includes('left') ? '0 6px 6px 0' : '6px 0 0 6px',
                        }}>
                          <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: 9, letterSpacing: '-0.02em' }}>Buug report</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-[var(--neutral-border-medium)] pt-5">
              <Button type="button" variant="secondary" size="medium" onClick={() => setStep(3)}>
                Voltar
              </Button>
              <Button type="button" size="medium" onClick={onFinalSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Criando...' : 'Criar projeto'}
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
    </AppLayout>
  )
}
