'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Flex,
  Column,
  Heading,
  Text,
  Input,
  Button,
  Feedback,
} from '@once-ui-system/core'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
})

type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

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
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) {
      setServerError(error.message)
      return
    }
    setSent(true)
  }

  return (
    <Flex fillWidth style={{ minHeight: '100vh' }} horizontal="center" vertical="center" padding="l">
      <Column maxWidth={24} fillWidth gap="xl">
        <Column gap="4">
          <a href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.02em', color: 'var(--neutral-on-background-strong)' }}>Buug</span>
          </a>
          <Heading variant="display-strong-s" as="h1">
            Recuperar senha
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            Informe seu e-mail e enviaremos um link para redefinir sua senha.
          </Text>
        </Column>

        {serverError && <Feedback variant="danger">{serverError}</Feedback>}

        {sent ? (
          <Feedback variant="success">
            E-mail enviado! Verifique sua caixa de entrada (e o spam) para redefinir a senha.
          </Feedback>
        ) : (
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
            <Button
              type="submit"
              variant="primary"
              size="l"
              fillWidth
              loading={isSubmitting}
              label={isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
            />
          </Column>
        )}

        <Text variant="body-default-s" onBackground="neutral-weak" align="center">
          Lembrou a senha?{' '}
          <Link href="/auth/login" style={{ color: 'var(--brand-on-background-strong)', fontWeight: 600, textDecoration: 'none' }}>
            Fazer login
          </Link>
        </Text>
      </Column>
    </Flex>
  )
}
