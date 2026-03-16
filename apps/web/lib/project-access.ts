import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Check if a user can modify a project (edit settings, pause, archive).
 * Returns the project data and user's role, or null if no access.
 *
 * Access granted if:
 * - User is the direct owner (ownerId), OR
 * - User is OWNER or ADMIN in the project's organization
 */
export async function getProjectWriteAccess(
  userId: string,
  projectId: string,
  selectFields = 'id, ownerId, organizationId, name'
): Promise<{ project: Record<string, any>; role: string } | null> {
  // Fetch the project
  const { data: project, error } = await supabaseAdmin
    .from('Project')
    .select(selectFields)
    .eq('id', projectId)
    .single()

  if (error || !project) return null

  const proj = project as Record<string, any>

  // Direct owner always has access
  if (proj.ownerId === userId) {
    return { project: proj, role: 'OWNER' }
  }

  // Check org membership role
  if (proj.organizationId) {
    const { data: membership } = await supabaseAdmin
      .from('TeamMember')
      .select('role')
      .eq('userId', userId)
      .eq('organizationId', proj.organizationId)
      .eq('status', 'ACTIVE')
      .single()

    if (membership && (membership.role === 'OWNER' || membership.role === 'ADMIN')) {
      return { project: proj, role: membership.role }
    }
  }

  return null
}

/**
 * Get the user's role for a project (for read-only access checks and UI).
 * Returns the role string or null if no access at all.
 */
export async function getProjectRole(
  userId: string,
  projectId: string
): Promise<string | null> {
  const { data: project2 } = await supabaseAdmin
    .from('Project')
    .select('ownerId, organizationId')
    .eq('id', projectId)
    .single()

  if (!project2) return null

  const p = project2 as Record<string, any>

  if (p.ownerId === userId) return 'OWNER'

  if (p.organizationId) {
    const { data: membership } = await supabaseAdmin
      .from('TeamMember')
      .select('role')
      .eq('userId', userId)
      .eq('organizationId', p.organizationId)
      .eq('status', 'ACTIVE')
      .single()

    return membership?.role || null
  }

  return null
}
