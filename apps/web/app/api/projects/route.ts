import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkProjectLimit, getPlanLimits, type Plan, type Role, type Usage } from '@/lib/limits'
import { createNotification } from '@/lib/notifications'

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

  if (membership?.organization) {
    const org = membership.organization as unknown as { plan: string }
    const plan = (org.plan || 'FREE') as Plan
    const role = membership.role as Role
    const limits = getPlanLimits(plan)

    if (limits.maxProjects !== -1) {
      const { count } = await supabase
        .from('Project')
        .select('id', { count: 'exact', head: true })
        .eq('organizationId', membership.organizationId)

      const usage: Usage = { projectCount: count || 0, memberCount: 0, reportsThisMonth: 0 }
      const check = checkProjectLimit(usage, limits, role)
      if (!check.allowed) {
        return NextResponse.json({ error: check.reason || 'Limite de projetos atingido.' }, { status: 403 })
      }
    }
  }

  const projectId = crypto.randomUUID()
  const { data: project, error } = await supabase
    .from('Project')
    .insert({
      id: projectId,
      name: data.name,
      description: data.description || null,
      targetUrl: data.targetUrl,
      mode: data.mode || 'proxy',
      widgetStyle: data.widgetStyle || 'text',
      widgetText: data.widgetText || 'Reportar Bug',
      widgetPosition: data.widgetPosition || 'bottom-right',
      widgetColor: data.widgetColor || '#4f46e5',
      ownerId: user.id,
      organizationId: membership?.organizationId || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

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
