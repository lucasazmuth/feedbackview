import { auth } from '@/lib/auth'
import { api } from '@/lib/api'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect('/auth/login')
  }

  let projects: any[] = []
  let error: string | null = null

  try {
    const token = (session as any).accessToken
    projects = await api.projects.list(token)
  } catch (err) {
    error = 'Não foi possível carregar os projetos.'
    console.error('Dashboard fetch error:', err)
  }

  return (
    <DashboardClient
      projects={projects}
      error={error}
      userEmail={session.user?.email ?? ''}
      userName={session.user?.name ?? ''}
    />
  )
}
