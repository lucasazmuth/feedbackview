import { requireUser } from '@/lib/auth'
import { serverApi } from '@/lib/api.server'
import { notFound } from 'next/navigation'
import FeedbackClient from './FeedbackClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function FeedbackPage({ params }: PageProps) {
  const { id } = await params
  const user = await requireUser()

  let feedback: any = null
  let error: string | null = null

  try {
    feedback = await serverApi.feedbacks.get(user.id, id)
  } catch (err: any) {
    if (err.message?.includes('not found') || err.message?.includes('Not found') || err.message?.includes('No rows')) {
      notFound()
    }
    error = 'Não foi possível carregar o feedback.'
    console.error('Feedback fetch error:', err)
  }

  if (!feedback && !error) {
    notFound()
  }

  return <FeedbackClient feedback={feedback} error={error} />
}
