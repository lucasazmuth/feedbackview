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
  Heading,
  Text,
  Input,
  PasswordInput,
  Button,
  Card,
  Feedback,
} from '@once-ui-system/core'

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterForm) {
    setServerError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { name: data.name },
        },
      })

      if (error) {
        setServerError(error.message)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setServerError('Erro de conexão. Verifique sua internet.')
    }
  }

  return (
    <Flex fillWidth minHeight="100vh" horizontal="center" vertical="center" padding="m">
      <Column maxWidth={28} gap="l" fillWidth>
        {/* Logo */}
        <Column horizontal="center" gap="4">
          <Flex horizontal="center" vertical="center" gap="8">
            <Flex
              horizontal="center"
              vertical="center"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--brand-strong)',
                color: 'var(--static-white)',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Q
            </Flex>
            <Text variant="heading-strong-m">Qbug</Text>
          </Flex>
          <Text variant="body-default-s" onBackground="neutral-weak">
            QA com captura em tempo real
          </Text>
        </Column>

        <Card padding="l" radius="l" direction="column" gap="m">
          <Column gap="4">
            <Heading variant="heading-strong-l" as="h1">
              Criar conta
            </Heading>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Já tem conta?{' '}
              <Link href="/auth/login" style={{ color: 'var(--brand-strong)', fontWeight: 500 }}>
                Entrar
              </Link>
            </Text>
          </Column>

          {serverError && (
            <Feedback variant="danger">{serverError}</Feedback>
          )}

          <Column as="form" gap="m" onSubmit={handleSubmit(onSubmit)}>
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
              placeholder="voce@empresa.com"
              error={!!errors.email}
              errorMessage={errors.email?.message}
              {...register('email')}
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

          <Text
            variant="body-default-s"
            onBackground="neutral-weak"
            align="center"
          >
            Ao criar uma conta, você concorda com nossos termos de uso.
          </Text>
        </Card>
      </Column>
    </Flex>
  )
}
