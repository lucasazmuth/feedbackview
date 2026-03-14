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
  Heading,
  Text,
  Input,
  PasswordInput,
  Button,
  Logo,
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

  async function handleGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(callbackUrl)}`,
      },
    })
  }

  return (
    <Flex fillWidth minHeight="100vh" horizontal="center" vertical="center" padding="m">
      <Column maxWidth={28} fillWidth gap="l">
        {/* Logo */}
        <Column horizontal="center" gap="4">
          <Logo size="m" />
          <Text variant="body-default-s" onBackground="neutral-weak">
            QA com captura em tempo real
          </Text>
        </Column>

        <Card padding="l" gap="l" direction="column">
          <Column gap="4">
            <Heading variant="heading-strong-l" as="h1">
              Entrar
            </Heading>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Não tem conta?{' '}
              <Link href="/auth/register">
                Criar conta
              </Link>
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

          <Flex fillWidth horizontal="center" gap="m" vertical="center">
            <Flex style={{ flex: 1, height: 1, background: 'var(--neutral-border-medium)' }} />
            <Text variant="body-default-s" onBackground="neutral-weak">
              ou continue com
            </Text>
            <Flex style={{ flex: 1, height: 1, background: 'var(--neutral-border-medium)' }} />
          </Flex>

          <Button
            variant="secondary"
            size="l"
            fillWidth
            label="Google"
            prefixIcon="google"
            onClick={handleGoogle}
          />
        </Card>
      </Column>
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
