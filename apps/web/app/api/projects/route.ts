import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { type Plan } from '@/lib/limits'
import { createNotification } from '@/lib/notifications'
import { logActivity } from '@/lib/activity-log'
import { normalizeDomain } from '@/lib/url-utils'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const data = await req.json()

  // Get membership with role and org plan info
  const { data: membership } = await supabase
    .from('TeamMember')
    .select('organizationId, role, organization:Organization(plan)')
    .eq('userId', user.id)
    .eq('status', 'ACTIVE')
    .order('role', { ascending: true })
    .limit(1)
    .single()

  // Projects are unlimited in all plans — no limit check needed

  // Check URL uniqueness
  const targetUrlDomain = normalizeDomain(data.targetUrl)
  const { data: existingProject } = await supabaseAdmin
    .from('Project')
    .select('id')
    .eq('targetUrlDomain', targetUrlDomain)
    .maybeSingle()

  if (existingProject) {
    return NextResponse.json({ error: 'Este site já foi cadastrado por outro projeto.' }, { status: 409 })
  }

  const projectId = crypto.randomUUID()
  const { data: project, error } = await supabase
    .from('Project')
    .insert({
      id: projectId,
      name: data.name,
      description: data.description || null,
      targetUrl: data.targetUrl,
      targetUrlDomain,
      mode: data.mode || 'proxy',
      widgetStyle: data.widgetStyle || 'text',
      widgetText: data.widgetText || 'Reportar Bug',
      widgetPosition: data.widgetPosition || 'middle-right',
      widgetColor: data.widgetColor || '#4f46e5',
      ownerId: user.id,
      organizationId: membership?.organizationId || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log activity
  logActivity({
    projectId: project.id,
    userId: user.id,
    userEmail: user.email || undefined,
    action: 'PROJECT_CREATED',
    details: { name: data.name },
  })

  // Notify other workspace members about new project
  if (membership?.organizationId) {
    const { data: members } = await supabaseAdmin
      .from('TeamMember')
      .select('userId')
      .eq('organizationId', membership.organizationId)
      .eq('status', 'ACTIVE')
      .neq('userId', user.id)

    const userName = user.user_metadata?.name || user.email || 'Alguém'
    for (const member of members || []) {
      if (member.userId) {
        createNotification({
          userId: member.userId,
          type: 'PROJECT_CREATED',
          title: `Novo projeto "${data.name}" criado`,
          message: `Criado por ${userName}`,
          metadata: {
            projectId: project.id,
            projectName: data.name,
            creatorName: userName,
          },
        })
      }
    }
  }

  return NextResponse.json(project)
}
