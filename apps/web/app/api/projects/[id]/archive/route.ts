import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { getProjectWriteAccess } from '@/lib/project-access'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify OWNER/ADMIN access
    const access = await getProjectWriteAccess(user.id, id)
    if (!access) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    const project = access.project

    const { error } = await supabaseAdmin
      .from('Project')
      .update({ archivedAt: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logActivity({
      projectId: id,
      userId: user.id,
      userEmail: user.email || undefined,
      action: 'PROJECT_ARCHIVED',
      details: { name: project.name },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
