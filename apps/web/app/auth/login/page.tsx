'use client'

import { useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { Eye, EyeOff } from 'lucide-react'
import { ICON_PX, ICON_STROKE } from '@/lib/icon-tokens'
import { AppIcon } from '@/components/ui/AppIcon'

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
      // Hard navigation to ensure fresh data (no stale cache from previous session)
      window.location.href = callbackUrl
    }
  }

  return (
    <div className="flex w-full min-h-screen">
      {/* Left branding panel */}
      <div
        className="auth-brand-panel flex-1 sticky top-0 h-screen overflow-hidden bg-primary-gradient"
      >
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.08) 0%, transparent 60%), radial-gradient(circle at 70% 20%, rgba(255,255,255,0.05) 0%, transparent 50%)',
        }} />
        <div className="relative z-10 flex flex-col items-start justify-center w-full h-full gap-8 p-10">
          <a href="/" className="no-underline"><span className="font-logo font-bold text-2xl tracking-tight text-white">Buug</span></a>

          <div className="flex flex-col gap-4 max-w-[24rem]">
            <h2 className="text-white text-[2rem] font-bold leading-tight m-0">
              QA com captura em tempo real
            </h2>
            <p className="text-white/80 text-base leading-relaxed m-0">
              Screenshot, session replay e logs capturados automaticamente em cada feedback.
            </p>
          </div>

          <div className="flex flex-col gap-4 max-w-[22rem]">
            {[
              { svg: <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis} style={{ color: '#fff' }}><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></AppIcon>, text: 'Session replay completo' },
              { svg: <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis} style={{ color: '#fff' }}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></AppIcon>, text: 'Screenshot com anotações' },
              { svg: <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis} style={{ color: '#fff' }}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></AppIcon>, text: 'Console e network logs' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  {item.svg}
                </div>
                <span className="text-white/90 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 min-w-0 overflow-y-auto max-h-screen flex justify-center px-8 py-12 bg-background">
        <div className="w-full max-w-lg flex flex-col gap-8">
          {/* Mobile logo */}
          <div className="auth-mobile-logo flex flex-col items-center gap-4">
            <a href="/" className="no-underline"><span className="font-logo font-bold text-2xl tracking-tight text-off-white">Buug</span></a>
            <p className="text-sm text-gray">
              QA com captura em tempo real
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-off-white">
              Bem-vindo de volta
            </h1>
            <p className="text-base text-primary-text">
              Entre na sua conta para continuar
            </p>
          </div>

          {serverError && (
            <Alert variant="danger">{serverError}</Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 w-full">
            <Input
              id="email"
              label="E-mail"
              type="email"
              placeholder="voce@empresa.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="flex flex-col gap-1.5">
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
              <Link href="/auth/forgot-password" className="self-end text-xs text-[rgb(86,67,204)] hover:text-[rgb(69,94,181)] no-underline font-medium">
                Esqueceu a senha?
              </Link>
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

          <p className="text-sm text-primary-text text-center">
            Não tem conta?{' '}
            <Link href="/auth/register" className="text-[rgb(86,67,204)] hover:text-[rgb(69,94,181)] font-semibold no-underline">
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
        <div className="flex w-full min-h-screen items-center justify-center bg-background">
          <Spinner size="lg" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  )
}
