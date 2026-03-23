import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { orderedIds } = await req.json()

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ error: 'orderedIds obrigatório' }, { status: 400 })
  }

  // Update sortOrder for each feedback
  const updates = orderedIds.map((id: string, index: number) =>
    supabase
      .from('Feedback')
      .update({ sortOrder: index })
      .eq('id', id)
  )

  await Promise.all(updates)

  return NextResponse.json({ success: true, count: orderedIds.length })
}
