import { auth } from '@/lib/auth'
import { api } from '@/lib/api'
import { redirect, notFound } from 'next/navigation'
import ProjectClient from './ProjectClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()

  if (!session) {
    redirect('/auth/login')
  }

  const token = (session as any).accessToken

  let project: any = null
  let feedbacks: any[] = []
  let error: string | null = null

  try {
    [project, feedbacks] = await Promise.all([
      api.projects.get(token, id),
      api.projects.feedbacks(token, id),
    ])
  } catch (err: any) {
    if (err.message?.includes('404') || err.message?.includes('not found')) {
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
      userEmail={session.user?.email ?? ''}
      accessToken={token}
    />
  )
}
