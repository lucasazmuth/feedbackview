import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CRON_SECRET = process.env.CRON_SECRET

/**
 * Restore archived feedback for a specific organization.
 *
 * POST /api/admin/restore-feedback
 * Body: { organizationId: string }
 * Auth: Bearer CRON_SECRET
 *
 * Clears archivedAt on all feedback for the org's projects,
 * effectively restoring them to the dashboard.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { organizationId } = await req.json()
    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 })
    }

    // Get project IDs for this org
    const { data: projects } = await supabase
      .from('Project')
      .select('id')
      .eq('organizationId', organizationId)

    const projectIds = projects?.map((p) => p.id) || []
    if (projectIds.length === 0) {
      return NextResponse.json({ restored: 0, message: 'No projects found for this organization' })
    }

    // Count archived feedback first
    const { count } = await supabase
      .from('Feedback')
      .select('id', { count: 'exact', head: true })
      .in('projectId', projectIds)
      .not('archivedAt', 'is', null)

    // Restore all archived feedback
    const { error } = await supabase
      .from('Feedback')
      .update({ archivedAt: null })
      .in('projectId', projectIds)
      .not('archivedAt', 'is', null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ restored: count || 0 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
