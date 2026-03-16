import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPlanLimits, type Plan } from '@/lib/limits'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CRON_SECRET = process.env.CRON_SECRET

/** Grace period: archived reports are hard-deleted after 30 days */
const HARD_DELETE_GRACE_DAYS = 30

/**
 * Retention cleanup cron job.
 *
 * Step 1: Soft-delete (archive) feedback that exceeded the plan's retention period.
 * Step 2: Hard-delete feedback that was archived more than 30 days ago.
 *
 * Call via: POST /api/cron/retention
 * Protect with CRON_SECRET header in production.
 */
export async function POST(req: NextRequest) {
  // Auth check — only allow with valid cron secret
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = { archived: 0, deleted: 0, errors: [] as string[] }

    // --- Step 1: Soft-delete expired feedback ---
    // Get all organizations with their plans
    const { data: orgs } = await supabase
      .from('Organization')
      .select('id, plan')

    for (const org of orgs || []) {
      const plan = (org.plan || 'FREE') as Plan
      const limits = getPlanLimits(plan)
      const retentionDays = limits.retentionDays

      // Calculate cutoff date
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - retentionDays)

      // Get project IDs for this org
      const { data: projects } = await supabase
        .from('Project')
        .select('id')
        .eq('organizationId', org.id)

      const projectIds = projects?.map((p) => p.id) || []
      if (projectIds.length === 0) continue

      // Count first, then archive
      const { count: toArchiveCount } = await supabase
        .from('Feedback')
        .select('id', { count: 'exact', head: true })
        .in('projectId', projectIds)
        .is('archivedAt', null)
        .lt('createdAt', cutoff.toISOString())

      if (toArchiveCount && toArchiveCount > 0) {
        const { error } = await supabase
          .from('Feedback')
          .update({ archivedAt: new Date().toISOString() })
          .in('projectId', projectIds)
          .is('archivedAt', null)
          .lt('createdAt', cutoff.toISOString())

        if (error) {
          results.errors.push(`Archive error for org ${org.id}: ${error.message}`)
        } else {
          results.archived += toArchiveCount
        }
      }
    }

    // --- Step 2: Hard-delete feedback archived more than 30 days ago ---
    const hardDeleteCutoff = new Date()
    hardDeleteCutoff.setDate(hardDeleteCutoff.getDate() - HARD_DELETE_GRACE_DAYS)

    const { count: toDeleteCount } = await supabase
      .from('Feedback')
      .select('id', { count: 'exact', head: true })
      .not('archivedAt', 'is', null)
      .lt('archivedAt', hardDeleteCutoff.toISOString())

    if (toDeleteCount && toDeleteCount > 0) {
      const { error: deleteError } = await supabase
        .from('Feedback')
        .delete()
        .not('archivedAt', 'is', null)
        .lt('archivedAt', hardDeleteCutoff.toISOString())

      if (deleteError) {
        results.errors.push(`Hard-delete error: ${deleteError.message}`)
      } else {
        results.deleted = toDeleteCount
      }
    }

    return NextResponse.json({
      success: true,
      archived: results.archived,
      deleted: results.deleted,
      errors: results.errors.length > 0 ? results.errors : undefined,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
