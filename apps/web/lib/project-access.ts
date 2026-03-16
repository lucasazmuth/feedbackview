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

  // Direct owner always has access
  if (project.ownerId === userId) {
    return { project, role: 'OWNER' }
  }

  // Check org membership role
  if (project.organizationId) {
    const { data: membership } = await supabaseAdmin
      .from('TeamMember')
      .select('role')
      .eq('userId', userId)
      .eq('organizationId', project.organizationId)
      .eq('status', 'ACTIVE')
      .single()

    if (membership && (membership.role === 'OWNER' || membership.role === 'ADMIN')) {
      return { project, role: membership.role }
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
  const { data: project } = await supabaseAdmin
    .from('Project')
    .select('ownerId, organizationId')
    .eq('id', projectId)
    .single()

  if (!project) return null

  if (project.ownerId === userId) return 'OWNER'

  if (project.organizationId) {
    const { data: membership } = await supabaseAdmin
      .from('TeamMember')
      .select('role')
      .eq('userId', userId)
      .eq('organizationId', project.organizationId)
      .eq('status', 'ACTIVE')
      .single()

    return membership?.role || null
  }

  return null
}
