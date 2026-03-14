import { requireUser } from '@/lib/auth'
import { serverApi } from '@/lib/api.server'
import { notFound } from 'next/navigation'
import ProjectClient from './ProjectClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params
  const user = await requireUser()

  let project: any = null
  let feedbacks: any[] = []
  let error: string | null = null

  try {
    [project, feedbacks] = await Promise.all([
      serverApi.projects.get(user.id, id),
      serverApi.projects.feedbacks(user.id, id),
    ])
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
      error={error}
      userEmail={user.email ?? ''}
    />
  )
}
