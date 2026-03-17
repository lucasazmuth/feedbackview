import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('Feedback')
      .select('*, Project!inner(ownerId, organizationId, name)')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Check access
    const isOwner = data.Project?.ownerId === user.id
    if (!isOwner) {
      // Check org membership
      const { data: membership } = await supabaseAdmin
        .from('TeamMember')
        .select('id')
        .eq('userId', user.id)
        .eq('organizationId', data.Project?.organizationId)
        .eq('status', 'ACTIVE')
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
