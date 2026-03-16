import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: project } = await supabase
    .from('Project')
    .select('embedLastSeenAt, embedPaused')
    .eq('id', id)
    .single()

  return NextResponse.json({
    embedLastSeenAt: project?.embedLastSeenAt ?? null,
    embedPaused: project?.embedPaused ?? false,
  })
}
