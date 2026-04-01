'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { Eye, EyeOff } from 'lucide-react'
import { ICON_PX } from '@/lib/icon-tokens'
import { AuthLogoLink } from '@/components/auth/AuthLogoLink'

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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

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
    <div className="auth-form-page">
      <div className="auth-form-surface auth-form-surface--compact w-full">
        <div className="flex flex-col gap-2">
          <AuthLogoLink tone="on-dark" />
          <h1 className="text-3xl font-bold text-off-white">
            Nova senha
          </h1>
          <p className="text-base text-primary-text">
            Defina sua nova senha abaixo.
          </p>
        </div>

        {serverError && <Alert variant="danger">{serverError}</Alert>}

        {success ? (
          <Alert variant="success">
            Senha alterada com sucesso! Redirecionando...
          </Alert>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-5">
            <Input
              id="password"
              label="Nova senha"
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
            <Input
              id="confirmPassword"
              label="Confirmar senha"
              type={showConfirm ? 'text' : 'password'}
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
              trailingSlot={
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="flex text-gray transition-colors hover:text-off-white"
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                >
                  {showConfirm ? <EyeOff size={ICON_PX.lg} /> : <Eye size={ICON_PX.lg} />}
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
                  Salvando...
                </span>
              ) : (
                'Salvar nova senha'
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
