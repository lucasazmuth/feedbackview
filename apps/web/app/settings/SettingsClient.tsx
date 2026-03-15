'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Column,
  Row,
  Heading,
  Text,
  Input,
  PasswordInput,
  Button,
  Feedback,
  Select,
} from '@once-ui-system/core'
import AppLayout from '@/components/ui/AppLayout'

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

/* ── Section card ── */
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Column
      fillWidth
      padding="l"
      gap="m"
      radius="l"
      border="neutral-medium"
      background="surface"
    >
      <Column gap="4">
        <Heading variant="heading-strong-m">{title}</Heading>
        {description && (
          <Text variant="body-default-s" onBackground="neutral-weak">
            {description}
          </Text>
        )}
      </Column>
      {children}
    </Column>
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
      <Column as="main" fillWidth maxWidth={40} paddingX="xl" paddingY="l" gap="l" style={{ margin: '0 auto' }}>
        {/* Page header */}
        <Column gap="xs">
          <Heading variant="heading-strong-l">Configurações</Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Gerencie suas informações de conta
          </Text>
        </Column>

        {/* Profile section */}
        <Section title="Perfil" description="Atualize suas informações pessoais e da empresa.">
          {profileMsg && (
            <Feedback variant={profileMsg.type}>{profileMsg.text}</Feedback>
          )}

          <Column as="form" gap="m" onSubmit={handleProfile(onProfileSubmit)} fillWidth>
            <Input
              id="settings-email"
              label="E-mail"
              value={userEmail}
              disabled
            />

            <Input
              id="settings-name"
              label="Nome"
              placeholder="Seu nome completo"
              error={!!profileErrors.name}
              errorMessage={profileErrors.name?.message}
              {...regProfile('name')}
            />

            <Input
              id="settings-company"
              label="Nome da empresa"
              placeholder="Sua empresa"
              error={!!profileErrors.company}
              errorMessage={profileErrors.company?.message}
              {...regProfile('company')}
            />

            <Row gap="m" fillWidth>
              <Input
                id="settings-phone"
                label="Telefone"
                type="tel"
                placeholder="(11) 99999-9999"
                error={!!profileErrors.phone}
                errorMessage={profileErrors.phone?.message}
                {...regProfile('phone', {
                  onChange: (e) => {
                    const formatted = maskPhone(e.target.value)
                    setProfileValue('phone', formatted, { shouldValidate: false })
                  },
                })}
              />
              <Input
                id="settings-cep"
                label="CEP"
                placeholder="00000-000"
                error={!!profileErrors.cep}
                errorMessage={profileErrors.cep?.message}
                {...regProfile('cep', {
                  onChange: (e) => {
                    const formatted = maskCep(e.target.value)
                    setProfileValue('cep', formatted, { shouldValidate: false })
                  },
                })}
              />
            </Row>

            <Select
              id="settings-teamSize"
              label="Tamanho da equipe"
              options={[
                { value: '1-5', label: '1 a 5 pessoas' },
                { value: '6-20', label: '6 a 20 pessoas' },
                { value: '21-50', label: '21 a 50 pessoas' },
                { value: '51+', label: 'Mais de 50 pessoas' },
              ]}
              value={profileTeamSize || ''}
              error={!!profileErrors.teamSize}
              errorMessage={profileErrors.teamSize?.message}
              onSelect={(value: string) => setProfileValue('teamSize', value, { shouldValidate: true })}
            />

            <Row horizontal="end" fillWidth>
              <Button
                type="submit"
                variant="primary"
                size="m"
                loading={profileSubmitting}
                label={profileSubmitting ? 'Salvando...' : 'Salvar alterações'}
              />
            </Row>
          </Column>
        </Section>

        {/* Password section */}
        <Section title="Alterar senha" description="Atualize sua senha de acesso.">
          {passwordMsg && (
            <Feedback variant={passwordMsg.type}>{passwordMsg.text}</Feedback>
          )}

          <Column as="form" gap="m" onSubmit={handlePassword(onPasswordSubmit)} fillWidth>
            <PasswordInput
              id="settings-currentPassword"
              label="Senha atual"
              placeholder="Digite sua senha atual"
              error={!!passwordErrors.currentPassword}
              errorMessage={passwordErrors.currentPassword?.message}
              {...regPassword('currentPassword')}
            />

            <PasswordInput
              id="settings-newPassword"
              label="Nova senha"
              placeholder="Mínimo 8 caracteres"
              error={!!passwordErrors.newPassword}
              errorMessage={passwordErrors.newPassword?.message}
              {...regPassword('newPassword')}
            />

            <PasswordInput
              id="settings-confirmPassword"
              label="Confirmar nova senha"
              placeholder="Repita a nova senha"
              error={!!passwordErrors.confirmPassword}
              errorMessage={passwordErrors.confirmPassword?.message}
              {...regPassword('confirmPassword')}
            />

            <Row horizontal="end" fillWidth>
              <Button
                type="submit"
                variant="primary"
                size="m"
                loading={passwordSubmitting}
                label={passwordSubmitting ? 'Alterando...' : 'Alterar senha'}
              />
            </Row>
          </Column>
        </Section>
      </Column>
    </AppLayout>
  )
}
