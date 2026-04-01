'use client'

import { useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { Eye, EyeOff } from 'lucide-react'
import { ICON_PX } from '@/lib/icon-tokens'
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel'
import { AuthLogoLink } from '@/components/auth/AuthLogoLink'
import { landingHero, landingFeatures } from '@/content/landing.pt-BR'
import { featureIcons } from '@/components/landing/icons'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

const loginBrandFeatures = landingFeatures.slice(0, 3).map((f) => ({
  icon: featureIcons[f.iconKey],
  title: f.title,
  description: f.description,
}))

function LoginFormContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

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
      window.location.href = callbackUrl
    }
  }

  return (
    <div className="flex min-h-[100dvh] w-full">
      <AuthBrandPanel
        tag={landingHero.tag}
        headline={
          <>
            {landingHero.h1Line1}
            <br />
            {landingHero.h1Line2}
          </>
        }
        lead={landingHero.sub}
        features={loginBrandFeatures}
      />

      <div className="auth-form-panel">
        <div className="auth-form-surface auth-form-surface--compact">
          <div className="auth-mobile-logo flex flex-col items-center gap-4">
            <AuthLogoLink tone="on-dark" />
            <p className="text-sm text-gray">{landingHero.tag}</p>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-off-white">Bem-vindo de volta</h1>
            <p className="text-base text-primary-text">Entre na sua conta para continuar</p>
          </div>

          {serverError && <Alert variant="danger">{serverError}</Alert>}

          <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-5">
            <Input
              id="email"
              label="E-mail"
              type="email"
              placeholder="voce@empresa.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="flex flex-col gap-2">
              <Input
                id="password"
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
                trailingSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex text-gray transition-colors hover:text-off-white"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={ICON_PX.lg} /> : <Eye size={ICON_PX.lg} />}
                  </button>
                }
              />
              <p className="self-end text-right text-xs leading-snug text-[color:var(--neutral-on-background-weak)]">
                Esqueceu a senha?{' '}
                <Link href="/auth/forgot-password" className="auth-link auth-link--small font-semibold">
                  Redefinir
                </Link>
              </p>
            </div>

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
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-primary-text">
            Não tem conta?{' '}
            <Link href="/auth/register" className="auth-link">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <Spinner size="lg" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  )
}
