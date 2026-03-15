'use client'

import { useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Flex,
  Column,
  Row,
  Heading,
  Text,
  Input,
  PasswordInput,
  Button,
  Card,
  Feedback,
  Spinner,
} from '@once-ui-system/core'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

function LoginFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    setServerError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      setServerError('E-mail ou senha inválidos.')
    } else {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  return (
    <Flex fillWidth style={{ minHeight: '100vh' }}>
      {/* Left branding panel */}
      <Flex
        style={{
          flex: 1,
          background: 'var(--brand-solid-strong)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
        }}
        className="auth-brand-panel"
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.08) 0%, transparent 60%), radial-gradient(circle at 70% 20%, rgba(255,255,255,0.05) 0%, transparent 50%)',
        }} />
        <Column
          fillWidth
          gap="xl"
          padding="xl"
          horizontal="start"
          vertical="center"
          style={{ position: 'relative', zIndex: 1 }}
        >
          <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.02em', color: '#fff' }}>Report Bug</span>

          <Column gap="m" style={{ maxWidth: '24rem' }}>
            <h2 style={{ color: '#fff', fontSize: '2rem', fontWeight: 700, lineHeight: 1.2, margin: 0 }}>
              QA com captura em tempo real
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
              Screenshot, session replay e logs capturados automaticamente em cada feedback.
            </p>
          </Column>

          <Column gap="m" style={{ maxWidth: '22rem' }}>
            {[
              { svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>, text: 'Session replay completo' },
              { svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>, text: 'Screenshot com anotações' },
              { svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>, text: 'Console e network logs' },
            ].map((item) => (
              <Row key={item.text} gap="s" vertical="center">
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {item.svg}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.875rem' }}>{item.text}</span>
              </Row>
            ))}
          </Column>
        </Column>
      </Flex>

      {/* Right form panel */}
      <Flex
        horizontal="center"
        style={{ flex: 1, minWidth: 0, overflowY: 'auto', maxHeight: '100vh', padding: '3rem 2rem' }}
      >
        <Column maxWidth={24} fillWidth gap="xl">
          {/* Mobile logo */}
          <Column horizontal="center" gap="4" className="auth-mobile-logo">
            <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.02em', color: 'var(--neutral-on-background-strong)' }}>Report Bug</span>
            <Text variant="body-default-s" onBackground="neutral-weak">
              QA com captura em tempo real
            </Text>
          </Column>

          <Column gap="4">
            <Heading variant="display-strong-s" as="h1">
              Bem-vindo de volta
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Entre na sua conta para continuar
            </Text>
          </Column>

          {serverError && (
            <Feedback variant="danger">{serverError}</Feedback>
          )}

          <Column as="form" onSubmit={handleSubmit(onSubmit)} gap="m" fillWidth>
            <Input
              id="email"
              label="E-mail"
              type="email"
              placeholder="voce@empresa.com"
              error={!!errors.email}
              errorMessage={errors.email?.message}
              {...register('email')}
            />

            <PasswordInput
              id="password"
              label="Senha"
              placeholder="••••••••"
              error={!!errors.password}
              errorMessage={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              variant="primary"
              size="l"
              fillWidth
              loading={isSubmitting}
              label={isSubmitting ? 'Entrando...' : 'Entrar'}
            />
          </Column>

          <Text variant="body-default-s" onBackground="neutral-weak" align="center">
            Não tem conta?{' '}
            <Link href="/auth/register" style={{ color: 'var(--brand-on-background-strong)', fontWeight: 600, textDecoration: 'none' }}>
              Criar conta grátis
            </Link>
          </Text>
        </Column>
      </Flex>
    </Flex>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Flex fillWidth minHeight="100vh" horizontal="center" vertical="center">
          <Spinner size="m" />
        </Flex>
      }
    >
      <LoginFormContent />
    </Suspense>
  )
}
