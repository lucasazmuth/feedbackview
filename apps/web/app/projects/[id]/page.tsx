import { requireUser } from '@/lib/auth'
import { serverApi } from '@/lib/api.server'
import { getProjectRole } from '@/lib/project-access'
import { notFound } from 'next/navigation'
import ProjectClient from './ProjectClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params
  const user = await requireUser()

  let project: any = null
  let feedbacks: any[] = []
  let activityLog: any[] = []
  let error: string | null = null
  let userRole = 'MEMBER'

  try {
    [project, feedbacks, userRole] = await Promise.all([
      serverApi.projects.get(user.id, id),
      serverApi.projects.feedbacks(user.id, id),
      getProjectRole(user.id, id).then(r => r || 'MEMBER'),
    ])
    // Fetch activity log separately (non-blocking if table doesn't exist yet)
    try {
      activityLog = await serverApi.activityLog.list(user.id, id)
    } catch {
      // ActivityLog table may not exist yet
    }
  } catch (err: any) {
    if (err.message?.includes('not found') || err.message?.includes('No rows')) {
      notFound()
    }
    error = 'Não foi possível carregar os dados do projeto.'
    console.error('Project fetch error:', err)
  }

  if (!project && !error) {
    notFound()
  }

  return (
    <ProjectClient
      project={project}
      feedbacks={feedbacks}
      activityLog={activityLog}
      error={error}
      userEmail={user.email ?? ''}
      userRole={userRole}
    />
  )
}
