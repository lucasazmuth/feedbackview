'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
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
  Select,
} from '@once-ui-system/core'

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  company: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres'),
  phone: z.string().min(14, 'Telefone inválido').max(15, 'Telefone inválido'),
  cep: z.string().length(9, 'CEP inválido'),
  teamSize: z.string().min(1, 'Selecione o tamanho da equipe'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  function maskPhone(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return `(${digits}`
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  function maskCep(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    if (digits.length <= 5) return digits
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }

  async function onSubmit(data: RegisterForm) {
    setServerError(null)
    try {
      const supabase = createClient()
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            company: data.company,
            phone: data.phone.replace(/\D/g, ''),
            cep: data.cep.replace(/\D/g, ''),
            team_size: data.teamSize,
          },
        },
      })

      if (error) {
        setServerError(error.message)
        return
      }

      // Create organization for the new user
      if (authData.user) {
        try {
          await fetch('/api/auth/setup-org', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: authData.user.id,
              name: data.company || data.name,
              email: data.email,
            }),
          })
        } catch {
          // Non-blocking: org can be created later if this fails
          console.error('Failed to create organization')
        }
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setServerError('Erro de conexão. Verifique sua internet.')
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
          <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.02em', color: '#fff' }}>QBugs</span>

          <Column gap="m" style={{ maxWidth: '24rem' }}>
            <h2 style={{ color: '#fff', fontSize: '2rem', fontWeight: 700, lineHeight: 1.2, margin: 0 }}>
              Comece a capturar bugs hoje
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
              Configure em menos de 1 minuto. Sem cartão de crédito.
            </p>
          </Column>

          <Column gap="m" style={{ maxWidth: '22rem' }}>
            {[
              { svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>, text: 'Setup em 1 minuto' },
              { svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>, text: 'Grátis para começar' },
              { svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>, text: 'Convide toda sua equipe' },
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
        style={{ flex: 1, minWidth: 0, padding: '3rem 2rem 4rem' }}
      >
        <Column maxWidth={24} fillWidth gap="xl">
          {/* Mobile logo */}
          <Column horizontal="center" gap="4" className="auth-mobile-logo">
            <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.02em', color: 'var(--neutral-on-background-strong)' }}>QBugs</span>
            <Text variant="body-default-s" onBackground="neutral-weak">
              QA com captura em tempo real
            </Text>
          </Column>

          <Column gap="4">
            <Heading variant="display-strong-s" as="h1">
              Criar sua conta
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Comece a capturar feedbacks em minutos
            </Text>
          </Column>

          {serverError && (
            <Feedback variant="danger">{serverError}</Feedback>
          )}

          <Column as="form" gap="m" onSubmit={handleSubmit(onSubmit)} fillWidth>
            <Input
              id="name"
              label="Nome"
              placeholder="Seu nome completo"
              error={!!errors.name}
              errorMessage={errors.name?.message}
              {...register('name')}
            />

            <Input
              id="email"
              label="E-mail"
              type="email"
              placeholder="voce@empresa.com"
              error={!!errors.email}
              errorMessage={errors.email?.message}
              {...register('email')}
            />

            <Input
              id="company"
              label="Nome da empresa"
              placeholder="Sua empresa"
              error={!!errors.company}
              errorMessage={errors.company?.message}
              {...register('company')}
            />

            <Row gap="m" fillWidth>
              <Input
                id="phone"
                label="Telefone"
                type="tel"
                placeholder="(11) 99999-9999"
                error={!!errors.phone}
                errorMessage={errors.phone?.message}
                {...register('phone', {
                  onChange: (e) => {
                    const formatted = maskPhone(e.target.value)
                    setValue('phone', formatted, { shouldValidate: false })
                  },
                })}
              />
              <Input
                id="cep"
                label="CEP"
                placeholder="00000-000"
                error={!!errors.cep}
                errorMessage={errors.cep?.message}
                {...register('cep', {
                  onChange: (e) => {
                    const formatted = maskCep(e.target.value)
                    setValue('cep', formatted, { shouldValidate: false })
                  },
                })}
              />
            </Row>

            <Select
              id="teamSize"
              label="Tamanho da equipe"
              options={[
                { value: '1-5', label: '1 a 5 pessoas' },
                { value: '6-20', label: '6 a 20 pessoas' },
                { value: '21-50', label: '21 a 50 pessoas' },
                { value: '51+', label: 'Mais de 50 pessoas' },
              ]}
              error={!!errors.teamSize}
              errorMessage={errors.teamSize?.message}
              {...register('teamSize')}
            />

            <PasswordInput
              id="password"
              label="Senha"
              placeholder="Mínimo 8 caracteres"
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
              label={isSubmitting ? 'Criando conta...' : 'Criar conta grátis'}
            />
          </Column>

          <Text variant="body-default-xs" onBackground="neutral-weak" align="center">
            Ao criar uma conta, você concorda com nossos termos de uso.
          </Text>

          <Text variant="body-default-s" onBackground="neutral-weak" align="center">
            Já tem conta?{' '}
            <Link href="/auth/login" style={{ color: 'var(--brand-on-background-strong)', fontWeight: 600, textDecoration: 'none' }}>
              Entrar
            </Link>
          </Text>
        </Column>
      </Flex>
    </Flex>
  )
}
