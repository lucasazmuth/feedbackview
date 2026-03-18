'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Flex,
  Column,
  Heading,
  Text,
  PasswordInput,
  Button,
  Feedback,
} from '@once-ui-system/core'

const schema = z.object({
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setServerError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) {
      setServerError(error.message)
      return
    }
    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  return (
    <Flex fillWidth style={{ minHeight: '100vh' }} horizontal="center" vertical="center" padding="l">
      <Column maxWidth={24} fillWidth gap="xl">
        <Column gap="4">
          <a href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.02em', color: 'var(--neutral-on-background-strong)' }}>Buug</span>
          </a>
          <Heading variant="display-strong-s" as="h1">
            Nova senha
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            Defina sua nova senha abaixo.
          </Text>
        </Column>

        {serverError && <Feedback variant="danger">{serverError}</Feedback>}

        {success ? (
          <Feedback variant="success">
            Senha alterada com sucesso! Redirecionando...
          </Feedback>
        ) : (
          <Column as="form" onSubmit={handleSubmit(onSubmit)} gap="m" fillWidth>
            <PasswordInput
              id="password"
              label="Nova senha"
              placeholder="••••••••"
              error={!!errors.password}
              errorMessage={errors.password?.message}
              {...register('password')}
            />
            <PasswordInput
              id="confirmPassword"
              label="Confirmar senha"
              placeholder="••••••••"
              error={!!errors.confirmPassword}
              errorMessage={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <Button
              type="submit"
              variant="primary"
              size="l"
              fillWidth
              loading={isSubmitting}
              label={isSubmitting ? 'Salvando...' : 'Salvar nova senha'}
            />
          </Column>
        )}
      </Column>
    </Flex>
  )
}
