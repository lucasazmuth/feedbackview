'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { Eye, EyeOff } from 'lucide-react'
import { ICON_PX, ICON_STROKE } from '@/lib/icon-tokens'
import { AppIcon } from '@/components/ui/AppIcon'

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
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const teamSizeValue = watch('teamSize')

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

      // Hard navigation to ensure fresh data
      window.location.href = '/dashboard'
    } catch {
      setServerError('Erro de conexão. Verifique sua internet.')
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
              Comece a capturar bugs hoje
            </h2>
            <p className="text-white/80 text-base leading-relaxed m-0">
              Configure em menos de 1 minuto. Sem cartão de crédito.
            </p>
          </div>

          <div className="flex flex-col gap-4 max-w-[22rem]">
            {[
              { svg: <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis} style={{ color: '#fff' }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></AppIcon>, text: 'Setup em 1 minuto' },
              { svg: <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis} style={{ color: '#fff' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></AppIcon>, text: 'Grátis para começar' },
              { svg: <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis} style={{ color: '#fff' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></AppIcon>, text: 'Convide toda sua equipe' },
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
      <div className="flex-1 min-w-0 overflow-y-auto flex justify-center px-8 py-12 pb-16 bg-background">
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
              Criar sua conta
            </h1>
            <p className="text-base text-primary-text">
              Comece a capturar feedbacks em minutos
            </p>
          </div>

          {serverError && (
            <Alert variant="danger">{serverError}</Alert>
          )}

          <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmit(onSubmit)}>
            <Input
              id="name"
              label="Nome"
              placeholder="Seu nome completo"
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              id="email"
              label="E-mail"
              type="email"
              placeholder="voce@empresa.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              id="company"
              label="Nome da empresa"
              placeholder="Sua empresa"
              error={errors.company?.message}
              {...register('company')}
            />

            <div className="flex gap-4 w-full">
              <div className="flex-1">
                <Input
                  id="phone"
                  label="Telefone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  error={errors.phone?.message}
                  {...register('phone', {
                    onChange: (e) => {
                      const formatted = maskPhone(e.target.value)
                      setValue('phone', formatted, { shouldValidate: false })
                    },
                  })}
                />
              </div>
              <div className="flex-1">
                <Input
                  id="cep"
                  label="CEP"
                  placeholder="00000-000"
                  error={errors.cep?.message}
                  {...register('cep', {
                    onChange: (e) => {
                      const formatted = maskCep(e.target.value)
                      setValue('cep', formatted, { shouldValidate: false })
                    },
                  })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="teamSize" className="text-sm font-medium text-off-white">
                Tamanho da equipe
              </label>
              <select
                id="teamSize"
                value={teamSizeValue || ''}
                onChange={(e) => setValue('teamSize', e.target.value, { shouldValidate: true })}
                className={`h-10 w-full rounded-lg border bg-gray-dark px-3 text-sm text-off-white border-transparent-white focus:outline-none focus:ring-2 focus:ring-[rgb(86,67,204)] focus:border-transparent transition-shadow duration-200 appearance-none ${
                  errors.teamSize ? 'border-danger focus:ring-danger' : ''
                }`}
              >
                <option value="" disabled className="bg-gray-dark text-gray">Selecione...</option>
                <option value="1-5" className="bg-gray-dark">1 a 5 pessoas</option>
                <option value="6-20" className="bg-gray-dark">6 a 20 pessoas</option>
                <option value="21-50" className="bg-gray-dark">21 a 50 pessoas</option>
                <option value="51+" className="bg-gray-dark">Mais de 50 pessoas</option>
              </select>
              {errors.teamSize && (
                <p className="text-xs text-danger">{errors.teamSize.message}</p>
              )}
            </div>

            <Input
              id="password"
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 8 caracteres"
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
                  Criando conta...
                </span>
              ) : (
                'Criar conta grátis'
              )}
            </Button>
          </form>

          <p className="text-xs text-gray text-center">
            Ao criar uma conta, você concorda com nossos termos de uso.
          </p>

          <p className="text-sm text-primary-text text-center">
            Já tem conta?{' '}
            <Link href="/auth/login" className="text-[rgb(86,67,204)] hover:text-[rgb(69,94,181)] font-semibold no-underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
