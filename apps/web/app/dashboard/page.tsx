import { requireUser } from '@/lib/auth'
import { serverApi } from '@/lib/api.server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const user = await requireUser()

  let projects: any[] = []
  let error: string | null = null

  try {
    projects = await serverApi.projects.list(user.id)
  } catch (err) {
    error = 'Não foi possível carregar os projetos.'
    console.error('Dashboard fetch error:', err)
  }

  return (
    <DashboardClient
      projects={projects}
      error={error}
      userEmail={user.email ?? ''}
      userName={user.user_metadata?.name ?? ''}
    />
  )
}
