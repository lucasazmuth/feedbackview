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
import { Eye, EyeOff } from 'lucide-react'
import { ICON_PX } from '@/lib/icon-tokens'
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel'
import { AuthLogoLink } from '@/components/auth/AuthLogoLink'
import {
  landingHero,
  landingSteps,
  landingThreeStepsSection,
} from '@/content/landing.pt-BR'
import { featureIcons } from '@/components/landing/icons'

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

const registerStepIconKeys = ['bolt', 'globe', 'dashboard'] as const

const registerBrandFeatures = landingSteps.map((step, i) => ({
  icon: featureIcons[registerStepIconKeys[i]],
  title: step.title,
  description: step.description,
}))

const selectBaseClass =
  'h-10 w-full appearance-none box-border rounded-[0.5rem] border border-solid px-3 text-sm outline-none ' +
  'border-[color:var(--neutral-border-medium)] bg-[var(--surface-background)] ' +
  'text-[color:var(--neutral-on-background-strong)] ' +
  'transition-[border-color,box-shadow] duration-150 ' +
  'focus:border-[color:var(--brand-solid-strong)] focus:shadow-[0_0_0_2px_var(--brand-alpha-weak)]'

export default function RegisterPage() {
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
          console.error('Failed to create organization')
        }
      }

      window.location.href = '/dashboard'
    } catch {
      setServerError('Erro de conexão. Verifique sua internet.')
    }
  }

  const registerLead = landingHero.proofItems.join(' · ')

  return (
    <div className="flex min-h-[100dvh] w-full">
      <AuthBrandPanel
        tag={landingThreeStepsSection.tag}
        headline={landingThreeStepsSection.title}
        lead={registerLead}
        features={registerBrandFeatures}
      />

      <div className="auth-form-panel">
        <div className="auth-form-surface">
          <div className="auth-mobile-logo flex flex-col items-center gap-4">
            <AuthLogoLink tone="on-dark" />
            <p className="text-sm text-gray">{landingHero.tag}</p>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-off-white">Criar sua conta</h1>
            <p className="text-base text-primary-text">Comece a capturar feedbacks em minutos</p>
          </div>

          {serverError && <Alert variant="danger">{serverError}</Alert>}

          <form className="flex w-full flex-col gap-5" onSubmit={handleSubmit(onSubmit)}>
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

            <div className="flex w-full flex-col gap-5 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
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
              <div className="min-w-0 flex-1">
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

            <div className="flex flex-col gap-2">
              <label
                htmlFor="teamSize"
                className="text-sm font-medium text-[color:var(--neutral-on-background-medium)]"
              >
                Tamanho da equipe
              </label>
              <select
                id="teamSize"
                value={teamSizeValue || ''}
                onChange={(e) => setValue('teamSize', e.target.value, { shouldValidate: true })}
                className={`${selectBaseClass} ${errors.teamSize ? 'border-[color:var(--danger-solid-strong)] focus:border-[color:var(--danger-solid-strong)] focus:shadow-[0_0_0_2px_var(--danger-alpha-weak)]' : ''}`}
              >
                <option value="" disabled className="bg-[var(--neutral-solid-medium)] text-[color:var(--neutral-on-background-weak)]">
                  Selecione...
                </option>
                <option value="1-5" className="bg-[var(--neutral-solid-medium)]">
                  1 a 5 pessoas
                </option>
                <option value="6-20" className="bg-[var(--neutral-solid-medium)]">
                  6 a 20 pessoas
                </option>
                <option value="21-50" className="bg-[var(--neutral-solid-medium)]">
                  21 a 50 pessoas
                </option>
                <option value="51+" className="bg-[var(--neutral-solid-medium)]">
                  Mais de 50 pessoas
                </option>
              </select>
              {errors.teamSize && <p className="text-xs text-danger">{errors.teamSize.message}</p>}
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

          <p className="text-center text-xs leading-relaxed text-gray">
            Ao criar uma conta, você concorda com nossos{' '}
            <Link href="/termos" className="auth-link">
              Termos de Uso
            </Link>{' '}
            e{' '}
            <Link href="/privacidade" className="auth-link">
              Política de Privacidade
            </Link>
            .
          </p>

          <p className="text-center text-sm text-primary-text">
            Já tem conta?{' '}
            <Link href="/auth/login" className="auth-link">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
