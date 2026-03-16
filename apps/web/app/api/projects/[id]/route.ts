import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    // Verify ownership and get current values
    const { data: project, error: findError } = await supabaseAdmin
      .from('Project')
      .select('id, ownerId, name, targetUrl, description')
      .eq('id', id)
      .eq('ownerId', user.id)
      .single()

    if (findError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const allowedFields = ['name', 'description', 'targetUrl', 'widgetPosition', 'widgetColor', 'widgetStyle', 'widgetText', 'embedPaused']
    const updateData: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (body[key] !== undefined) updateData[key] = body[key]
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: updated, error } = await supabaseAdmin
      .from('Project')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!updated) {
      return NextResponse.json({ error: 'Update failed - no rows affected' }, { status: 500 })
    }

    // Log changes
    const changes: Record<string, { from: unknown; to: unknown }> = {}
    const fieldLabels: Record<string, string> = {
      name: 'Nome',
      targetUrl: 'URL alvo',
      description: 'Descrição',
      widgetPosition: 'Posição do widget',
      widgetColor: 'Cor do widget',
      widgetStyle: 'Estilo do widget',
      widgetText: 'Texto do widget',
    }
    for (const key of Object.keys(updateData)) {
      const oldVal = (project as any)[key]
      if (oldVal !== undefined && oldVal !== updateData[key]) {
        changes[fieldLabels[key] || key] = { from: oldVal, to: updateData[key] }
      }
    }

    if (Object.keys(changes).length > 0) {
      logActivity({
        projectId: id,
        userId: user.id,
        userEmail: user.email || undefined,
        action: 'PROJECT_UPDATED',
        details: { changes },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

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
