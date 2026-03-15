import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function DELETE(
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

    // Verify ownership
    const { data: project, error: findError } = await supabaseAdmin
      .from('Project')
      .select('id, ownerId')
      .eq('id', id)
      .eq('ownerId', user.id)
      .single()

    if (findError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Delete feedbacks first (foreign key constraint)
    await supabaseAdmin.from('Feedback').delete().eq('projectId', id)

    // Delete notifications related to this project
    await supabaseAdmin
      .from('Notification')
      .delete()
      .eq('userId', user.id)
      .containedBy('metadata', { projectId: id })
      .then(() => {})
      .catch(() => {})

    // Delete the project
    const { error } = await supabaseAdmin.from('Project').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
