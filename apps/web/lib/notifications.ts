import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function createNotification(params: {
  userId: string
  type: string
  title: string
  message?: string
  metadata?: Record<string, unknown>
}): void {
  void supabaseAdmin
    .from('Notification')
    .insert({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message || null,
      metadata: params.metadata || null,
    })
    .then(() => {})
}

export async function getOrgOwnerUserId(orgId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('TeamMember')
    .select('userId')
    .eq('organizationId', orgId)
    .eq('role', 'OWNER')
    .eq('status', 'ACTIVE')
    .single()
  return data?.userId || null
}
