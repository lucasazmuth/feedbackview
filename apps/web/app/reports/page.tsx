import { requireUser } from '@/lib/auth'
import { serverApi } from '@/lib/api.server'
import ReportsClient from './ReportsClient'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const user = await requireUser()

  let feedbacks: any[] = []
  let projects: any[] = []
  let error: string | null = null

  try {
    ;[feedbacks, projects] = await Promise.all([
      serverApi.feedbacks.listAll(user.id),
      serverApi.projects.list(user.id),
    ])
  } catch (err) {
    error = 'Não foi possível carregar os reports.'
    console.error('Reports fetch error:', err)
  }

  return (
    <ReportsClient
      feedbacks={feedbacks}
      projects={projects}
      error={error}
    />
  )
}
