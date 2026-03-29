import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function resolveClickUpOrgAdmin(
  req: NextRequest,
): Promise<{ orgId: string; userId: string } | null> {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const orgId = req.nextUrl.searchParams.get('orgId') || ''
  if (!orgId) return null

  const { data: member } = await supabaseAdmin
    .from('TeamMember')
    .select('role')
    .eq('organizationId', orgId)
    .eq('userId', user.id)
    .eq('status', 'ACTIVE')
    .single()

  if (!member || !['OWNER', 'ADMIN'].includes(member.role)) return null
  return { orgId, userId: user.id }
}

export { supabaseAdmin }
