import { auth } from '@/lib/auth'
import { api } from '@/lib/api'
import { redirect, notFound } from 'next/navigation'
import FeedbackClient from './FeedbackClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function FeedbackPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()

  if (!session) {
    redirect('/auth/login')
  }

  const token = (session as any).accessToken
  let feedback: any = null
  let error: string | null = null

  try {
    feedback = await api.feedbacks.get(token, id)
  } catch (err: any) {
    if (err.message?.includes('404') || err.message?.includes('not found')) {
      notFound()
    }
    error = 'Não foi possível carregar o feedback.'
    console.error('Feedback fetch error:', err)
  }

  if (!feedback && !error) {
    notFound()
  }

  return <FeedbackClient feedback={feedback} error={error} accessToken={token} />
}
