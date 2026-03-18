'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Flex,
  Column,
  Row,
  Heading,
  Text,
  Button,
  Card,
  Input,
  Textarea,
  Tag,
  Icon,
} from '@once-ui-system/core'
import { api } from '@/lib/api'
import { type Plan } from '@/lib/limits'

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

function SvgIcon({ children, size = 20 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

export default function NewProjectPage() {
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
    setTargetUrl(value)
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
      // Extrair apenas o domínio (sem path, query, hash)
      url = parsed.origin
      setTargetUrl(url)
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
    <Column fillWidth minHeight="100vh" background="surface">
      {/* Header with step indicator */}
      <Row
        as="header"
        fillWidth
        vertical="center"
        paddingX="l"
        paddingY="m"
        gap="m"
        style={{ position: 'sticky', top: 0, zIndex: 10 }}
        borderBottom="neutral-medium"
        background="surface"
      >
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            color: 'var(--neutral-on-background-weak)',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <Icon name="arrowLeft" size="xs" />
          Projetos
        </Link>
        <Text variant="body-default-s" onBackground="neutral-weak" style={{ flexShrink: 0 }}>/</Text>
        <Text variant="body-default-s" onBackground="neutral-strong" style={{ flexShrink: 0 }}>Novo Projeto</Text>

        {/* Step indicator in header */}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {[
            { num: 1, label: 'URL' },
            { num: 2, label: 'Integração' },
            { num: 3, label: 'Dados' },
            { num: 4, label: 'Widget' },
          ].map((s, i) => (
            <div key={s.num} style={{ display: 'contents' }}>
              {i > 0 && (
                <div style={{ width: '1.5rem', height: 2, borderRadius: 1, background: step > s.num - 1 ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)', transition: 'background 0.3s' }} />
              )}
              <div
                onClick={() => step > s.num && setStep(s.num)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  cursor: step > s.num ? 'pointer' : 'default',
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: step >= s.num ? 'var(--brand-solid-strong)' : 'var(--neutral-alpha-weak)',
                    color: step >= s.num ? '#fff' : 'var(--neutral-on-background-weak)',
                    fontSize: 11,
                    fontWeight: 600,
                    transition: 'all 0.2s',
                  }}
                >
                  {step > s.num ? (
                    <SvgIcon size={12}><polyline points="20 6 9 17 4 12" /></SvgIcon>
                  ) : String(s.num)}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: step === s.num ? 600 : 400, color: step === s.num ? 'var(--neutral-on-background-strong)' : 'var(--neutral-on-background-weak)', whiteSpace: 'nowrap' }}>
                  {s.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Row>

      <Column
        as="main"
        fillWidth
        maxWidth={step === 4 ? 56 : step === 2 ? 48 : 36}
        paddingX="l"
        paddingY="xl"
        gap="xl"
        style={{ margin: '0 auto', transition: 'max-width 0.2s ease' }}
      >

        {/* Limit blocked state for members */}
        {limitBlocked && (
          <Column horizontal="center" vertical="center" paddingY="xl" gap="m" fillWidth>
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
              <SvgIcon size={28}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="var(--warning-on-background-strong)" />
                <line x1="12" y1="9" x2="12" y2="13" stroke="var(--warning-on-background-strong)" />
                <line x1="12" y1="17" x2="12.01" y2="17" stroke="var(--warning-on-background-strong)" />
              </SvgIcon>
            </div>
            <Heading variant="heading-strong-m">Limite de projetos atingido</Heading>
            <Text
              variant="body-default-s"
              onBackground="neutral-weak"
              align="center"
              style={{ maxWidth: '28rem' }}
            >
              {limitBlocked}
            </Text>
            <Button
              variant="secondary"
              size="m"
              href="/dashboard"
              label="Voltar aos projetos"
            />
          </Column>
        )}

        {/* Loading state */}
        {limitLoading && !limitBlocked && (
          <Column horizontal="center" paddingY="xl">
            <Text variant="body-default-s" onBackground="neutral-weak">Verificando limites...</Text>
          </Column>
        )}

        {/* Step 1: URL Input — beautiful domain-purchase style */}
        {!limitBlocked && !limitLoading && step === 1 && (
          <Column gap="l" horizontal="center" style={{ paddingTop: '2rem' }}>
            <Column gap="8" horizontal="center">
              <Heading variant="heading-strong-xl" as="h1" align="center">
                Qual site você quer monitorar?
              </Heading>
              <Text variant="body-default-m" onBackground="neutral-weak" align="center" style={{ maxWidth: '28rem' }}>
                Insira a URL do seu site para começar a coletar feedbacks dos seus usuários.
              </Text>
            </Column>

            {/* URL input card */}
            <div
              style={{
                width: '100%',
                padding: '2rem',
                borderRadius: '1rem',
                border: '1px solid var(--neutral-border-medium)',
                background: 'var(--surface-background)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              }}
            >
              <Column gap="m">
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.875rem 1rem',
                      borderRadius: '0.75rem',
                      border: `2px solid ${urlError ? '#dc2626' : targetUrl && isUrlValid ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)'}`,
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
                      background: urlError ? '#fef2f2' : targetUrl && isUrlValid ? 'var(--brand-alpha-weak)' : 'var(--neutral-alpha-weak)',
                      flexShrink: 0,
                      transition: 'all 0.2s',
                    }}>
                      <SvgIcon size={18}>
                        {urlError ? (
                          <><circle cx="12" cy="12" r="10" stroke="#dc2626" /><line x1="15" y1="9" x2="9" y2="15" stroke="#dc2626" /><line x1="9" y1="9" x2="15" y2="15" stroke="#dc2626" /></>
                        ) : targetUrl && isUrlValid ? (
                          <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="var(--brand-solid-strong)" /><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="var(--brand-solid-strong)" /></>
                        ) : (
                          <><circle cx="12" cy="12" r="10" stroke="var(--neutral-on-background-weak)" /><line x1="2" y1="12" x2="22" y2="12" stroke="var(--neutral-on-background-weak)" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="var(--neutral-on-background-weak)" /></>
                        )}
                      </SvgIcon>
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
                      style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        fontSize: '1.125rem',
                        fontWeight: 500,
                        color: 'var(--neutral-on-background-strong)',
                        background: 'transparent',
                        fontFamily: 'inherit',
                      }}
                    />
                    {targetUrl && isUrlValid && !urlAnalyzing && (
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: '#f0fdf4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <SvgIcon size={16}><polyline points="20 6 9 17 4 12" stroke="#16a34a" /></SvgIcon>
                      </div>
                    )}
                    {urlAnalyzing && (
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: '2px solid var(--brand-solid-strong)',
                        borderTopColor: 'transparent',
                        animation: 'spin 0.8s linear infinite',
                        flexShrink: 0,
                      }} />
                    )}
                  </div>
                </div>

                {/* Error message */}
                {urlError && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '0.5rem',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                    }}
                  >
                    <SvgIcon size={14}><circle cx="12" cy="12" r="10" stroke="#dc2626" /><line x1="12" y1="8" x2="12" y2="12" stroke="#dc2626" /><line x1="12" y1="16" x2="12.01" y2="16" stroke="#dc2626" /></SvgIcon>
                    <span style={{ fontSize: '0.8125rem', color: '#991b1b', flex: 1 }}>{urlError}</span>
                  </div>
                )}

                {/* Valid URL hint */}
                {!urlError && !targetUrl && (
                  <Text variant="body-default-xs" onBackground="neutral-weak" align="center">
                    Insira o endereço completo do site que deseja monitorar
                  </Text>
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
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--brand-on-background-strong)' }}>
                        Analisando seu site...
                      </span>
                    </div>
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      Verificando acessibilidade e detectando o melhor modo de integração
                    </Text>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="l"
                  fillWidth
                  label={urlAnalyzing ? 'Analisando...' : 'Continuar'}
                  suffixIcon={urlAnalyzing ? undefined : 'arrowRight'}
                  onClick={analyzeAndProceed}
                  disabled={!isUrlValid || urlAnalyzing || !!urlError}
                  loading={urlAnalyzing}
                />
              </Column>
            </div>

            {/* Features list */}
            <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap', paddingTop: '0.5rem' }}>
              {[
                { icon: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>, text: 'Verificação segura' },
                { icon: <><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></>, text: 'Setup em minutos' },
                { icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>, text: 'Sem limite de feedbacks' },
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '0.375rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--neutral-alpha-weak)',
                  }}>
                    <SvgIcon size={14}>{f.icon}</SvgIcon>
                  </div>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--neutral-on-background-weak)', fontWeight: 500 }}>
                    {f.text}
                  </span>
                </div>
              ))}
            </div>

            {/* CSS animation for spinner */}
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </Column>
        )}

        {/* Step 2: Choose integration mode (with recommended pre-selected) */}
        {!limitBlocked && !limitLoading && step === 2 && (
          <Column gap="l">
            <Column gap="8">
              <Heading variant="heading-strong-l" as="h1">
                Modo de integração
              </Heading>
              <Text variant="body-default-s" onBackground="neutral-weak">
                Escolha como capturar feedbacks. Você pode alterar depois.
              </Text>
            </Column>

            {/* URL badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '0.625rem',
                background: 'var(--neutral-alpha-weak)',
              }}
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
                <SvgIcon size={14}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></SvgIcon>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--neutral-on-background-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                  {targetUrl}
                </span>
              </div>
              <button
                onClick={() => setStep(1)}
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--brand-on-background-strong)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                Alterar
              </button>
            </div>

            {/* Site type detection badge */}
            {siteType && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  background: proxyBlocked ? '#fef2f2' : recommendedMode === 'embed' ? '#eff6ff' : '#f0fdf4',
                  border: `1px solid ${proxyBlocked ? '#fecaca' : recommendedMode === 'embed' ? '#bfdbfe' : '#bbf7d0'}`,
                }}
              >
                <SvgIcon size={16}>
                  {proxyBlocked ? (
                    <><circle cx="12" cy="12" r="10" stroke="#dc2626" /><line x1="12" y1="8" x2="12" y2="12" stroke="#dc2626" /><line x1="12" y1="16" x2="12.01" y2="16" stroke="#dc2626" /></>
                  ) : (
                    <><circle cx="12" cy="12" r="10" stroke={recommendedMode === 'embed' ? '#2563eb' : '#16a34a'} /><polyline points="16 12 12 8 8 12" stroke={recommendedMode === 'embed' ? '#2563eb' : '#16a34a'} /><line x1="12" y1="16" x2="12" y2="8" stroke={recommendedMode === 'embed' ? '#2563eb' : '#16a34a'} /></>
                  )}
                </SvgIcon>
                <span style={{ fontSize: '0.8125rem', color: proxyBlocked ? '#991b1b' : recommendedMode === 'embed' ? '#1e40af' : '#166534', flex: 1 }}>
                  {proxyBlocked
                    ? `${siteType} detectado — Link Rápido não é compatível com este tipo de site. Use a Instalação no Site.`
                    : recommendedMode === 'embed'
                    ? `${siteType} detectado — recomendamos Instalação no Site para Session Replay e melhor compatibilidade.`
                    : `${siteType} detectado — compatível com Link Rápido! Para Session Replay, use Instalação no Site.`}
                </span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {/* Proxy mode */}
              <div
                onClick={() => !proxyBlocked && setMode('proxy')}
                style={{
                  padding: '1.25rem',
                  borderRadius: '0.75rem',
                  border: `2px solid ${proxyBlocked ? 'var(--neutral-border-medium)' : mode === 'proxy' ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)'}`,
                  background: proxyBlocked ? 'var(--neutral-alpha-weak)' : mode === 'proxy' ? 'var(--brand-alpha-weak)' : 'var(--surface-background)',
                  cursor: proxyBlocked ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  opacity: proxyBlocked ? 0.5 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: proxyBlocked ? 'var(--neutral-alpha-medium)' : mode === 'proxy' ? 'var(--brand-solid-strong)' : 'var(--neutral-alpha-medium)', color: proxyBlocked ? 'var(--neutral-on-background-weak)' : mode === 'proxy' ? '#fff' : 'var(--neutral-on-background-weak)', transition: 'all 0.15s' }}>
                      <SvgIcon><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></SvgIcon>
                    </div>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>Link Rápido</span>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${proxyBlocked ? 'var(--neutral-border-medium)' : mode === 'proxy' ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                    {!proxyBlocked && mode === 'proxy' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--brand-solid-strong)' }} />}
                    {proxyBlocked && <SvgIcon size={12}><line x1="18" y1="6" x2="6" y2="18" stroke="var(--neutral-on-background-weak)" /><line x1="6" y1="6" x2="18" y2="18" stroke="var(--neutral-on-background-weak)" /></SvgIcon>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 500, padding: '0.125rem 0.5rem', borderRadius: '1rem', background: 'var(--neutral-alpha-weak)', color: 'var(--neutral-on-background-weak)' }}>Sem instalação</span>
                  {proxyBlocked && <span style={{ fontSize: '0.6875rem', fontWeight: 500, padding: '0.125rem 0.5rem', borderRadius: '1rem', background: '#fef2f2', color: '#991b1b' }}>Indisponível</span>}
                  {!proxyBlocked && recommendedMode === 'proxy' && <span style={{ fontSize: '0.6875rem', fontWeight: 500, padding: '0.125rem 0.5rem', borderRadius: '1rem', background: 'var(--success-alpha-weak)', color: 'var(--success-on-background-strong)' }}>Recomendado</span>}
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--neutral-on-background-weak)', margin: 0, lineHeight: 1.5 }}>
                  Cole a URL do site e compartilhe o link de QA. Nada para instalar.
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', margin: 0, opacity: 0.7 }}>
                  Ideal para sites simples, landing pages e testes rápidos.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: 'auto', paddingTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '1rem', background: 'var(--success-alpha-weak)', color: 'var(--success-on-background-strong)' }}>✓ Screenshot</span>
                  <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '1rem', background: 'var(--success-alpha-weak)', color: 'var(--success-on-background-strong)' }}>✓ Console Logs</span>
                  <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '1rem', background: 'var(--success-alpha-weak)', color: 'var(--success-on-background-strong)' }}>✓ Network Logs</span>
                  <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '1rem', background: 'var(--danger-alpha-weak)', color: 'var(--danger-on-background-strong)' }}>✗ Session Replay</span>
                </div>
              </div>

              {/* Embed mode */}
              <div
                onClick={() => setMode('embed')}
                style={{
                  padding: '1.25rem',
                  borderRadius: '0.75rem',
                  border: `2px solid ${mode === 'embed' ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)'}`,
                  background: mode === 'embed' ? 'var(--brand-alpha-weak)' : 'var(--surface-background)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: mode === 'embed' ? 'var(--brand-solid-strong)' : 'var(--neutral-alpha-medium)', color: mode === 'embed' ? '#fff' : 'var(--neutral-on-background-weak)', transition: 'all 0.15s' }}>
                      <SvgIcon><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></SvgIcon>
                    </div>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>Instalação no Site</span>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${mode === 'embed' ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                    {mode === 'embed' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--brand-solid-strong)' }} />}
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                  {recommendedMode === 'embed' && <span style={{ fontSize: '0.6875rem', fontWeight: 500, padding: '0.125rem 0.5rem', borderRadius: '1rem', background: 'var(--success-alpha-weak)', color: 'var(--success-on-background-strong)' }}>Recomendado</span>}
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--neutral-on-background-weak)', margin: 0, lineHeight: 1.5 }}>
                  Adicione uma linha de código ao seu site. Funciona em qualquer lugar.
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', margin: 0, opacity: 0.7 }}>
                  Ideal para SPAs, sites com autenticação e produção.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: 'auto', paddingTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '1rem', background: 'var(--success-alpha-weak)', color: 'var(--success-on-background-strong)' }}>✓ Screenshot</span>
                  <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '1rem', background: 'var(--success-alpha-weak)', color: 'var(--success-on-background-strong)' }}>✓ Session Replay</span>
                  <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '1rem', background: 'var(--success-alpha-weak)', color: 'var(--success-on-background-strong)' }}>✓ Console Logs</span>
                  <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '1rem', background: 'var(--success-alpha-weak)', color: 'var(--success-on-background-strong)' }}>✓ Network Logs</span>
                </div>
              </div>
            </div>

            <Row gap="s" paddingTop="s">
              <Button
                variant="secondary"
                size="m"
                label="Voltar"
                onClick={() => setStep(1)}
              />
              <Button
                variant="primary"
                size="m"
                fillWidth
                label="Continuar"
                suffixIcon="arrowRight"
                onClick={goToStep3}
                disabled={!mode}
              />
            </Row>
          </Column>
        )}

        {/* Step 3: Project details */}
        {!limitBlocked && !limitLoading && step === 3 && (
          <Column gap="l">
            <Column gap="8">
              <Heading variant="heading-strong-l" as="h1">
                Dados do projeto
              </Heading>
              <Text variant="body-default-s" onBackground="neutral-weak">
                Preencha as informações para finalizar.
              </Text>
            </Column>

            {/* Mode badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '0.625rem',
                background: 'var(--neutral-alpha-weak)',
              }}
            >
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
                  <SvgIcon size={14}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></SvgIcon>
                ) : (
                  <SvgIcon size={14}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></SvgIcon>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>
                  {mode === 'proxy' ? 'Link Rápido' : 'Instalação no Site'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', marginLeft: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {targetUrl}
                </span>
              </div>
              <button
                onClick={() => setStep(2)}
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--brand-on-background-strong)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                Alterar
              </button>
            </div>

            <div
              style={{
                padding: '1.5rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--neutral-border-medium)',
                background: 'var(--surface-background)',
              }}
            >
              {serverError && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', padding: '0.75rem', borderRadius: '0.5rem', background: '#fef2f2', border: '1px solid #fecaca' }}>
                    <SvgIcon size={16}><circle cx="12" cy="12" r="10" stroke="#dc2626" /><line x1="12" y1="8" x2="12" y2="12" stroke="#dc2626" /><line x1="12" y1="16" x2="12.01" y2="16" stroke="#dc2626" /></SvgIcon>
                    <span style={{ fontSize: '0.8125rem', color: '#991b1b', lineHeight: 1.5, flex: 1 }}>{serverError}</span>
                  </div>
                </div>
              )}

              <Column as="form" gap="m" onSubmit={handleSubmit(goToStep4)}>
                <input type="hidden" {...register('targetUrl')} />

                <Input
                  id="project-name"
                  label="Nome do projeto *"
                  placeholder="Ex: Portal do Cliente"
                  error={!!errors.name}
                  errorMessage={errors.name?.message}
                  autoFocus
                  {...register('name')}
                />

                <Textarea
                  id="project-description"
                  label="Descrição (opcional)"
                  placeholder="Descreva brevemente o que é este projeto..."
                  lines={3}
                  {...register('description')}
                />

                <Row gap="s" paddingTop="s">
                  <Button
                    variant="secondary"
                    size="m"
                    label="Voltar"
                    onClick={() => setStep(2)}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="m"
                    fillWidth
                    label="Continuar"
                    suffixIcon="arrowRight"
                  />
                </Row>
              </Column>
            </div>
          </Column>
        )}
        {/* Step 4: Widget customization */}
        {!limitBlocked && !limitLoading && step === 4 && (
          <Column gap="l">
            <Column gap="8">
              <Heading variant="heading-strong-l" as="h1">
                Personalizar widget
              </Heading>
              <Text variant="body-default-s" onBackground="neutral-weak">
                Configure como o botão de feedback aparecerá no seu site.
              </Text>
            </Column>

            {serverError && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', padding: '0.75rem', borderRadius: '0.5rem', background: '#fef2f2', border: '1px solid #fecaca' }}>
                <SvgIcon size={16}><circle cx="12" cy="12" r="10" stroke="#dc2626" /><line x1="12" y1="8" x2="12" y2="12" stroke="#dc2626" /><line x1="12" y1="16" x2="12.01" y2="16" stroke="#dc2626" /></SvgIcon>
                <span style={{ fontSize: '0.8125rem', color: '#991b1b', lineHeight: 1.5, flex: 1 }}>{serverError}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
              {/* Controls */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Widget style */}
                <div>
                  <Text variant="label-default-s" onBackground="neutral-strong" style={{ marginBottom: '0.5rem', display: 'block' }}>Estilo do botão</Text>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {(['text', 'icon'] as const).map((s) => (
                      <div
                        key={s}
                        onClick={() => setWidgetStyle(s)}
                        style={{
                          flex: 1,
                          padding: '1rem',
                          borderRadius: '0.75rem',
                          border: `2px solid ${widgetStyle === s ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)'}`,
                          background: widgetStyle === s ? 'var(--brand-alpha-weak)' : 'var(--surface-background)',
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
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>
                          {s === 'text' ? 'Texto' : 'Ícone'}
                        </span>
                        <p style={{ fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', margin: '0.25rem 0 0' }}>
                          {s === 'text' ? 'Tag lateral com texto' : 'Botão circular com logo'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Widget position */}
                <div>
                  <Text variant="label-default-s" onBackground="neutral-strong" style={{ marginBottom: '0.5rem', display: 'block' }}>Posição</Text>
                  <div style={{
                    width: '100%',
                    aspectRatio: '16 / 10',
                    maxWidth: 260,
                    borderRadius: '0.75rem',
                    border: '1px solid var(--neutral-border-medium)',
                    background: 'var(--surface-background)',
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
                  <span style={{ fontSize: '0.6875rem', color: 'var(--neutral-on-background-weak)', marginTop: 6, display: 'block' }}>
                    {widgetPosition.replace('top-', 'Superior ').replace('bottom-', 'Inferior ').replace('middle-', 'Meio ').replace('left', 'esquerda').replace('right', 'direita').replace('center', 'centro')}
                  </span>
                </div>

                {/* Widget color */}
                <div>
                  <Text variant="label-default-s" onBackground="neutral-strong" style={{ marginBottom: '0.5rem', display: 'block' }}>Cor</Text>
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
                        style={{
                          width: '5.5rem',
                          padding: '0.375rem 0.5rem',
                          borderRadius: '0.375rem',
                          border: '1px solid var(--neutral-border-medium)',
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                          color: 'var(--neutral-on-background-strong)',
                          background: 'var(--surface-background)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Live preview with real site */}
              <div style={{ width: 320, flexShrink: 0 }}>
                <Text variant="label-default-s" onBackground="neutral-strong" style={{ marginBottom: '0.5rem', display: 'block' }}>Preview</Text>
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
                    <div style={{
                      flex: 1,
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      background: 'var(--surface-background)',
                      fontSize: '0.625rem',
                      color: 'var(--neutral-on-background-weak)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
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

            {/* Navigation */}
            <Row gap="s" paddingTop="s">
              <Button
                variant="secondary"
                size="m"
                label="Voltar"
                onClick={() => setStep(3)}
              />
              <Button
                variant="primary"
                size="m"
                fillWidth
                loading={isSubmitting}
                label={isSubmitting ? 'Criando...' : 'Criar projeto'}
                onClick={onFinalSubmit}
              />
            </Row>
          </Column>
        )}

      </Column>
    </Column>
  )
}
