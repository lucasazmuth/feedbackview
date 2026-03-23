import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { feedbackId, startDate } = await req.json()

  if (!feedbackId) {
    return NextResponse.json({ error: 'feedbackId obrigatório' }, { status: 400 })
  }

  const { error } = await supabase
    .from('Feedback')
    .update({ startDate: startDate || null })
    .eq('id', feedbackId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
