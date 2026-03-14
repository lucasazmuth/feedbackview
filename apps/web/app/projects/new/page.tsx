'use client'

import { useState, useCallback } from 'react'
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

  const [step, setStep] = useState(1)
  const [mode, setMode] = useState<Mode | null>(null)

  const [targetUrl, setTargetUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [urlChecking, setUrlChecking] = useState(false)
  const [urlWarnings, setUrlWarnings] = useState<UrlWarning[]>([])
  const [urlChecked, setUrlChecked] = useState(false)
  const [urlValid, setUrlValid] = useState(false)

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

  function handleUrlBlur() {
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
      } else {
        setUrlError(null)
      }
    } catch {
      setUrlError('URL inválida. Insira um domínio válido (ex: meusite.com.br)')
    }
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

  function goToStep2(selectedMode: Mode) {
    setMode(selectedMode)
    if (targetUrl) {
      setValue('targetUrl', targetUrl)
    }
    setStep(2)
  }

  async function onSubmit(data: ProjectForm) {
    setServerError(null)
    try {
      const project = await api.projects.create({ ...data, mode: mode || 'proxy' })
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
          <div
            onClick={() => step > 1 && setStep(1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              cursor: step > 1 ? 'pointer' : 'default',
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
                background: step >= 1 ? 'var(--brand-solid-strong)' : 'var(--neutral-alpha-weak)',
                color: step >= 1 ? '#fff' : 'var(--neutral-on-background-weak)',
                fontSize: 11,
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
            >
              {step > 1 ? (
                <SvgIcon size={12}><polyline points="20 6 9 17 4 12" /></SvgIcon>
              ) : '1'}
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: step === 1 ? 600 : 400, color: step === 1 ? 'var(--neutral-on-background-strong)' : 'var(--neutral-on-background-weak)', whiteSpace: 'nowrap' }}>
              Integração
            </span>
          </div>

          <div style={{ width: '2rem', height: 2, borderRadius: 1, background: step > 1 ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)', transition: 'background 0.3s' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: step === 2 ? 'var(--brand-solid-strong)' : 'var(--neutral-alpha-weak)',
                color: step === 2 ? '#fff' : 'var(--neutral-on-background-weak)',
                fontSize: 11,
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
            >
              2
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: step === 2 ? 600 : 400, color: step === 2 ? 'var(--neutral-on-background-strong)' : 'var(--neutral-on-background-weak)', whiteSpace: 'nowrap' }}>
              Dados do projeto
            </span>
          </div>
        </div>
      </Row>

      <Column
        as="main"
        fillWidth
        maxWidth={36}
        paddingX="l"
        paddingY="xl"
        gap="xl"
        style={{ margin: '0 auto' }}
      >

        {/* Step 1: Choose integration mode */}
        {step === 1 && (
          <Column gap="l">
            <Column gap="8">
              <Heading variant="heading-strong-l" as="h1">
                Modo de integração
              </Heading>
              <Text variant="body-default-s" onBackground="neutral-weak">
                Escolha como capturar feedbacks. Você pode alterar depois.
              </Text>
            </Column>

            <Column gap="12">
              {/* Proxy mode */}
              <div
                onClick={() => setMode('proxy')}
                style={{
                  padding: '1.25rem',
                  borderRadius: '0.75rem',
                  border: `2px solid ${mode === 'proxy' ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)'}`,
                  background: mode === 'proxy' ? 'var(--brand-alpha-weak)' : 'var(--surface-background)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '0.625rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      background: mode === 'proxy' ? 'var(--brand-solid-strong)' : 'var(--neutral-alpha-medium)',
                      color: mode === 'proxy' ? '#fff' : 'var(--neutral-on-background-weak)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <SvgIcon><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></SvgIcon>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>Link Rápido</span>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 500, padding: '0.125rem 0.5rem', borderRadius: '1rem', background: 'var(--neutral-alpha-weak)', color: 'var(--neutral-on-background-weak)' }}>Sem instalação</span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--neutral-on-background-weak)', margin: 0, lineHeight: 1.5 }}>
                      Cole a URL do site e compartilhe o link de QA. Nada para instalar.
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', margin: '0.25rem 0 0', opacity: 0.7 }}>
                      Ideal para sites simples, landing pages e testes rápidos.
                    </p>
                  </div>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: `2px solid ${mode === 'proxy' ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                      transition: 'all 0.15s',
                    }}
                  >
                    {mode === 'proxy' && (
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--brand-solid-strong)' }} />
                    )}
                  </div>
                </div>

                {/* URL input for proxy */}
                {mode === 'proxy' && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--neutral-border-medium)' }}
                  >
                    <Column gap="m">
                      <Row gap="s">
                        <Flex fillWidth>
                          <Input
                            id="proxy-url"
                            label=""
                            placeholder="https://meusite.com.br"
                            value={targetUrl}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUrlChange(e.target.value)}
                            onBlur={handleUrlBlur}
                            error={!!urlError}
                            errorMessage={urlError || undefined}
                          />
                        </Flex>
                        {!(urlChecked && hasProblems) && (
                          <Button
                            variant="primary"
                            size="m"
                            label={urlChecking ? 'Verificando...' : 'Verificar'}
                            onClick={() => checkUrl(targetUrl)}
                            disabled={urlChecking || !isUrlValid}
                            loading={urlChecking}
                          />
                        )}
                      </Row>

                      {urlChecked && urlWarnings.length > 0 && (
                        <Column gap="s">
                          {urlWarnings.map((w, i) => {
                            const colors = {
                              error: { bg: '#fef2f2', border: '#fecaca', icon: '#dc2626', text: '#991b1b' },
                              warning: { bg: '#fffbeb', border: '#fde68a', icon: '#d97706', text: '#92400e' },
                              success: { bg: '#f0fdf4', border: '#bbf7d0', icon: '#16a34a', text: '#166534' },
                              info: { bg: '#eff6ff', border: '#bfdbfe', icon: '#2563eb', text: '#1e40af' },
                            }[w.type] || { bg: '#eff6ff', border: '#bfdbfe', icon: '#2563eb', text: '#1e40af' }
                            return (
                              <div
                                key={i}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '0.625rem',
                                  padding: '0.75rem',
                                  borderRadius: '0.5rem',
                                  background: colors.bg,
                                  border: `1px solid ${colors.border}`,
                                }}
                              >
                                <SvgIcon size={16}>
                                  {w.type === 'error' ? (
                                    <><circle cx="12" cy="12" r="10" stroke={colors.icon} /><line x1="12" y1="8" x2="12" y2="12" stroke={colors.icon} /><line x1="12" y1="16" x2="12.01" y2="16" stroke={colors.icon} /></>
                                  ) : w.type === 'warning' ? (
                                    <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={colors.icon} /><line x1="12" y1="9" x2="12" y2="13" stroke={colors.icon} /><line x1="12" y1="17" x2="12.01" y2="17" stroke={colors.icon} /></>
                                  ) : (
                                    <><circle cx="12" cy="12" r="10" stroke={colors.icon} /><polyline points="16 12 12 8 8 12" stroke={colors.icon} /><line x1="12" y1="16" x2="12" y2="8" stroke={colors.icon} /></>
                                  )}
                                </SvgIcon>
                                <span style={{ fontSize: '0.8125rem', color: colors.text, lineHeight: 1.5, flex: 1 }}>
                                  {w.message}
                                </span>
                              </div>
                            )
                          })}

                          {hasProblems && (
                            <div
                              style={{
                                padding: '0.875rem',
                                borderRadius: '0.625rem',
                                background: '#f0f4ff',
                                border: '1px solid #c7d2fe',
                              }}
                            >
                              <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                                <SvgIcon size={18}><path d="M12 2l2.4 7.4H22l-6.2 4.5L18.2 21 12 16.5 5.8 21l2.4-7.1L2 9.4h7.6z" stroke="#4f46e5" /></SvgIcon>
                                <div style={{ flex: 1 }}>
                                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#312e81', margin: '0 0 0.25rem' }}>
                                    Recomendamos usar a Instalação no Site
                                  </p>
                                  <p style={{ fontSize: '0.75rem', color: '#4338ca', margin: '0 0 0.625rem', lineHeight: 1.5 }}>
                                    Este modo funciona diretamente no site, sem limitações.
                                  </p>
                                  <Button
                                    variant="primary"
                                    size="s"
                                    prefixIcon="code"
                                    label="Usar Instalação no Site"
                                    onClick={() => setMode('embed')}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </Column>
                      )}

                      {urlChecked && urlValid && !hasProblems && (
                        <Button
                          variant="primary"
                          size="m"
                          fillWidth
                          label="Continuar"
                          suffixIcon="arrowRight"
                          onClick={() => goToStep2('proxy')}
                        />
                      )}

                      {urlChecked && urlValid && hasProblems && !urlWarnings.some((w) => w.type === 'error') && (
                        <Button
                          variant="tertiary"
                          size="s"
                          label="Continuar mesmo assim com Proxy"
                          onClick={() => goToStep2('proxy')}
                        />
                      )}
                    </Column>
                  </div>
                )}
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
                }}
              >
                <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '0.625rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      background: mode === 'embed' ? 'var(--brand-solid-strong)' : 'var(--neutral-alpha-medium)',
                      color: mode === 'embed' ? '#fff' : 'var(--neutral-on-background-weak)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <SvgIcon><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></SvgIcon>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>Instalação no Site</span>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 500, padding: '0.125rem 0.5rem', borderRadius: '1rem', background: 'var(--success-alpha-weak)', color: 'var(--success-on-background-strong)' }}>Recomendado</span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--neutral-on-background-weak)', margin: 0, lineHeight: 1.5 }}>
                      Adicione uma linha de código ao seu site. Funciona em qualquer lugar.
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)', margin: '0.25rem 0 0', opacity: 0.7 }}>
                      Ideal para SPAs, sites com autenticação e produção.
                    </p>
                  </div>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: `2px solid ${mode === 'embed' ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                      transition: 'all 0.15s',
                    }}
                  >
                    {mode === 'embed' && (
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--brand-solid-strong)' }} />
                    )}
                  </div>
                </div>

                {/* URL input for embed */}
                {mode === 'embed' && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--neutral-border-medium)' }}
                  >
                    <Column gap="m">
                      <Column gap="xs">
                        <Input
                          id="embed-url"
                          label="URL do site"
                          placeholder="https://meusite.com.br"
                          value={targetUrl}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUrlChange(e.target.value)}
                          onBlur={handleUrlBlur}
                          error={!!urlError}
                          errorMessage={urlError || undefined}
                        />
                        <Text variant="body-default-xs" onBackground="neutral-weak">
                          Usada como referência. O snippet será exibido após criar o projeto.
                        </Text>
                      </Column>

                      <Button
                        variant="primary"
                        size="m"
                        fillWidth
                        label="Continuar"
                        suffixIcon="arrowRight"
                        onClick={() => goToStep2('embed')}
                        disabled={!isUrlValid}
                      />
                    </Column>
                  </div>
                )}
              </div>
            </Column>
          </Column>
        )}

        {/* Step 2: Project details */}
        {step === 2 && (
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

              <Column as="form" gap="m" onSubmit={handleSubmit(onSubmit)}>
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
                    onClick={() => setStep(1)}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="m"
                    fillWidth
                    loading={isSubmitting}
                    label={isSubmitting ? 'Criando...' : 'Criar projeto'}
                  />
                </Row>
              </Column>
            </div>
          </Column>
        )}
      </Column>
    </Column>
  )
}
