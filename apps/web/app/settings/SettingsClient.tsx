'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signOutAndRedirectToLogin } from '@/lib/sign-out-client'
import { Alert } from '@/components/ui/Alert'
import AppLayout from '@/components/ui/AppLayout'
import { AppIcon } from '@/components/ui/AppIcon'

/* ── Schemas ── */
const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  company: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres'),
  phone: z.string().min(14, 'Telefone inválido').max(15, 'Telefone inválido'),
  cep: z.string().length(9, 'CEP inválido'),
  teamSize: z.string().min(1, 'Selecione o tamanho da equipe'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

/* ── Masks ── */
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

function formatPhoneForDisplay(raw: string) {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return raw
}

function formatCepForDisplay(raw: string) {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 8) return `${digits.slice(0, 5)}-${digits.slice(5)}`
  return raw
}

const INPUT_CLASS = 'app-input'
const INPUT_ERROR_CLASS = 'app-input app-input--error'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid var(--neutral-border-medium)',
  background: 'var(--surface-background)',
  color: 'var(--neutral-on-background-strong)',
  fontSize: '1.4rem',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '1.2rem',
  fontWeight: 600,
  color: 'var(--neutral-on-background-weak)',
  marginBottom: '0.25rem',
}

/* ── Section card ── */
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="app-card">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <h3 className="text-off-white font-semibold" style={{ margin: 0 }}>{title}</h3>
        {description && (
          <p className="text-sm text-gray" style={{ margin: 0 }}>{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}

/* ── Main component ── */
interface SettingsClientProps {
  userEmail: string
  userName: string
  userCompany: string
  userPhone: string
  userCep: string
  userTeamSize: string
}

export default function SettingsClient({
  userEmail,
  userName,
  userCompany,
  userPhone,
  userCep,
  userTeamSize,
}: SettingsClientProps) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOutAndRedirectToLogin()
    } catch {
      setSigningOut(false)
    }
  }

  /* Profile form */
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null)
  const {
    register: regProfile,
    handleSubmit: handleProfile,
    setValue: setProfileValue,
    watch: watchProfile,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: userName,
      company: userCompany,
      phone: formatPhoneForDisplay(userPhone),
      cep: formatCepForDisplay(userCep),
      teamSize: userTeamSize,
    },
  })

  const profileTeamSize = watchProfile('teamSize')

  /* Password form */
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null)
  const {
    register: regPassword,
    handleSubmit: handlePassword,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: passwordSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  async function onProfileSubmit(data: ProfileForm) {
    setProfileMsg(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        data: {
          name: data.name,
          company: data.company,
          phone: data.phone.replace(/\D/g, ''),
          cep: data.cep.replace(/\D/g, ''),
          team_size: data.teamSize,
        },
      })
      if (error) {
        setProfileMsg({ type: 'danger', text: error.message })
        return
      }
      setProfileMsg({ type: 'success', text: 'Perfil atualizado com sucesso!' })
      router.refresh()
    } catch {
      setProfileMsg({ type: 'danger', text: 'Erro de conexão. Tente novamente.' })
    }
  }

  async function onPasswordSubmit(data: PasswordForm) {
    setPasswordMsg(null)
    try {
      const supabase = createClient()

      // Verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: data.currentPassword,
      })
      if (signInError) {
        setPasswordMsg({ type: 'danger', text: 'Senha atual incorreta.' })
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      })
      if (error) {
        setPasswordMsg({ type: 'danger', text: error.message })
        return
      }
      setPasswordMsg({ type: 'success', text: 'Senha alterada com sucesso!' })
      resetPassword()
    } catch {
      setPasswordMsg({ type: 'danger', text: 'Erro de conexão. Tente novamente.' })
    }
  }

  return (
    <AppLayout>
      <main className="app-page">
        {/* Page header */}
        <div>
          <h1 className="app-section-title" style={{ fontSize: '2rem' }}>Configurações</h1>
          <p className="app-section-sub">Gerencie suas informações de conta</p>
        </div>

        {/* Profile section */}
        <Section title="Perfil" description="Atualize suas informações pessoais e da empresa.">
          {profileMsg && (
            <Alert variant={profileMsg.type === 'success' ? 'success' : 'danger'}>{profileMsg.text}</Alert>
          )}

          <form onSubmit={handleProfile(onProfileSubmit)} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle} htmlFor="settings-email">E-mail</label>
              <input
                id="settings-email"
                type="email"
                value={userEmail}
                disabled
                style={{ ...inputStyle, opacity: 0.6 }}
              />
            </div>

            <div>
              <label style={labelStyle} htmlFor="settings-name">Nome</label>
              <input
                id="settings-name"
                type="text"
                placeholder="Seu nome completo"
                className={profileErrors.name ? INPUT_ERROR_CLASS : INPUT_CLASS}
                {...regProfile('name')}
              />
              {profileErrors.name && <span style={{ fontSize: '1.2rem', color: 'var(--danger-on-background-strong)', marginTop: '0.25rem', display: 'block' }}>{profileErrors.name.message}</span>}
            </div>

            <div>
              <label style={labelStyle} htmlFor="settings-company">Nome da empresa</label>
              <input
                id="settings-company"
                type="text"
                placeholder="Sua empresa"
                className={profileErrors.company ? INPUT_ERROR_CLASS : INPUT_CLASS}
                {...regProfile('company')}
              />
              {profileErrors.company && <span style={{ fontSize: '1.2rem', color: 'var(--danger-on-background-strong)', marginTop: '0.25rem', display: 'block' }}>{profileErrors.company.message}</span>}
            </div>

            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle} htmlFor="settings-phone">Telefone</label>
                <input
                  id="settings-phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  className={profileErrors.phone ? INPUT_ERROR_CLASS : INPUT_CLASS}
                  {...regProfile('phone', {
                    onChange: (e) => {
                      const formatted = maskPhone(e.target.value)
                      setProfileValue('phone', formatted, { shouldValidate: false })
                    },
                  })}
                />
                {profileErrors.phone && <span style={{ fontSize: '1.2rem', color: 'var(--danger-on-background-strong)', marginTop: '0.25rem', display: 'block' }}>{profileErrors.phone.message}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle} htmlFor="settings-cep">CEP</label>
                <input
                  id="settings-cep"
                  type="text"
                  placeholder="00000-000"
                  className={profileErrors.cep ? INPUT_ERROR_CLASS : INPUT_CLASS}
                  {...regProfile('cep', {
                    onChange: (e) => {
                      const formatted = maskCep(e.target.value)
                      setProfileValue('cep', formatted, { shouldValidate: false })
                    },
                  })}
                />
                {profileErrors.cep && <span style={{ fontSize: '1.2rem', color: 'var(--danger-on-background-strong)', marginTop: '0.25rem', display: 'block' }}>{profileErrors.cep.message}</span>}
              </div>
            </div>

            <div>
              <label style={labelStyle} htmlFor="settings-teamSize">Tamanho da equipe</label>
              <select
                id="settings-teamSize"
                value={profileTeamSize || ''}
                onChange={(e) => setProfileValue('teamSize', e.target.value, { shouldValidate: true })}
                className="app-select"
              >
                <option value="">Selecione...</option>
                <option value="1-5">1 a 5 pessoas</option>
                <option value="6-20">6 a 20 pessoas</option>
                <option value="21-50">21 a 50 pessoas</option>
                <option value="51+">Mais de 50 pessoas</option>
              </select>
              {profileErrors.teamSize && <span style={{ fontSize: '1.2rem', color: 'var(--danger-on-background-strong)', marginTop: '0.25rem', display: 'block' }}>{profileErrors.teamSize.message}</span>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <button type="submit" disabled={profileSubmitting} className="app-btn-primary">
                {profileSubmitting ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        </Section>

        {/* Password section */}
        <Section title="Alterar senha" description="Atualize sua senha de acesso.">
          {passwordMsg && (
            <Alert variant={passwordMsg.type === 'success' ? 'success' : 'danger'}>{passwordMsg.text}</Alert>
          )}

          <form onSubmit={handlePassword(onPasswordSubmit)} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle} htmlFor="settings-currentPassword">Senha atual</label>
              <input
                id="settings-currentPassword"
                type="password"
                placeholder="Digite sua senha atual"
                className={passwordErrors.currentPassword ? INPUT_ERROR_CLASS : INPUT_CLASS}
                {...regPassword('currentPassword')}
              />
              {passwordErrors.currentPassword && <span style={{ fontSize: '1.2rem', color: 'var(--danger-on-background-strong)', marginTop: '0.25rem', display: 'block' }}>{passwordErrors.currentPassword.message}</span>}
            </div>

            <div>
              <label style={labelStyle} htmlFor="settings-newPassword">Nova senha</label>
              <input
                id="settings-newPassword"
                type="password"
                placeholder="Mínimo 8 caracteres"
                className={passwordErrors.newPassword ? INPUT_ERROR_CLASS : INPUT_CLASS}
                {...regPassword('newPassword')}
              />
              {passwordErrors.newPassword && <span style={{ fontSize: '1.2rem', color: 'var(--danger-on-background-strong)', marginTop: '0.25rem', display: 'block' }}>{passwordErrors.newPassword.message}</span>}
            </div>

            <div>
              <label style={labelStyle} htmlFor="settings-confirmPassword">Confirmar nova senha</label>
              <input
                id="settings-confirmPassword"
                type="password"
                placeholder="Repita a nova senha"
                className={passwordErrors.confirmPassword ? INPUT_ERROR_CLASS : INPUT_CLASS}
                {...regPassword('confirmPassword')}
              />
              {passwordErrors.confirmPassword && <span style={{ fontSize: '1.2rem', color: 'var(--danger-on-background-strong)', marginTop: '0.25rem', display: 'block' }}>{passwordErrors.confirmPassword.message}</span>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <button type="submit" disabled={passwordSubmitting} className="app-btn-primary">
                {passwordSubmitting ? 'Alterando...' : 'Alterar senha'}
              </button>
            </div>
          </form>
        </Section>

        <Section title="Sessão" description="Encerre a sessão neste dispositivo. Você precisará entrar de novo para acessar a conta.">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              disabled={signingOut}
              onClick={handleSignOut}
              className="app-btn-danger"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <AppIcon size="sm" strokeWidth={2}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </AppIcon>
              {signingOut ? 'Saindo...' : 'Sair'}
            </button>
          </div>
        </Section>
      </main>
    </AppLayout>
  )
}
