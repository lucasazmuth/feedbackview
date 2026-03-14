import { requireUser } from '@/lib/auth'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const user = await requireUser()

  return (
    <SettingsClient
      userEmail={user.email ?? ''}
      userName={user.user_metadata?.name ?? ''}
      userCompany={user.user_metadata?.company ?? ''}
      userPhone={user.user_metadata?.phone ?? ''}
      userCep={user.user_metadata?.cep ?? ''}
      userTeamSize={user.user_metadata?.team_size ?? ''}
    />
  )
}
