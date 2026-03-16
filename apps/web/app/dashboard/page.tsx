import { requireUser } from '@/lib/auth'
import { serverApi } from '@/lib/api.server'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await requireUser()

  let projects: any[] = []
  let archivedProjects: any[] = []
  let error: string | null = null

  try {
    [projects, archivedProjects] = await Promise.all([
      serverApi.projects.list(user.id),
      serverApi.projects.listArchived(user.id),
    ])
  } catch (err) {
    error = 'Não foi possível carregar os projetos.'
    console.error('Dashboard fetch error:', err)
  }

  return (
    <DashboardClient
      projects={projects}
      archivedProjects={archivedProjects}
      error={error}
      userEmail={user.email ?? ''}
      userName={user.user_metadata?.name ?? ''}
    />
  )
}
