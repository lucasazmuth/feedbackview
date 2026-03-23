import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { feedbackIds, userIds } = await req.json()

  if (!Array.isArray(feedbackIds) || feedbackIds.length === 0) {
    return NextResponse.json({ error: 'feedbackIds obrigatório' }, { status: 400 })
  }

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: 'userIds obrigatório' }, { status: 400 })
  }

  let successCount = 0

  for (const feedbackId of feedbackIds) {
    for (const userId of userIds) {
      const { error } = await supabase
        .from('FeedbackAssignee')
        .upsert(
          { feedbackId, userId },
          { onConflict: 'feedbackId,userId' }
        )

      if (!error) {
        successCount++
      }
    }
  }

  return NextResponse.json({ success: true, count: successCount })
}
