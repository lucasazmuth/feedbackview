'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { AuthLogoLink } from '@/components/auth/AuthLogoLink'

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
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })
    if (error) {
      setServerError(error.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="auth-form-page">
      <div className="auth-form-surface auth-form-surface--compact w-full">
        <div className="flex flex-col gap-2">
          <AuthLogoLink tone="on-dark" />
          <h1 className="text-3xl font-bold text-off-white">
            Recuperar senha
          </h1>
          <p className="text-base text-primary-text">
            Informe seu e-mail e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        {serverError && <Alert variant="danger">{serverError}</Alert>}

        {sent ? (
          <Alert variant="success">
            E-mail enviado! Verifique sua caixa de entrada (e o spam) para redefinir a senha.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-5">
            <Input
              id="email"
              label="E-mail"
              type="email"
              placeholder="voce@empresa.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Button
              type="submit"
              variant="primary"
              size="large"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" />
                  Enviando...
                </span>
              ) : (
                'Enviar link de recuperação'
              )}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-primary-text">
          Lembrou a senha?{' '}
          <Link href="/auth/login" className="auth-link">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  )
}
