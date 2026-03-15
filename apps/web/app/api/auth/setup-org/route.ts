import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId, name, email } = await req.json()

    if (!userId || !email) {
      return NextResponse.json({ error: 'userId and email are required' }, { status: 400 })
    }

    // Check if user already has an organization
    const { data: existing } = await supabase
      .from('TeamMember')
      .select('organizationId')
      .eq('userId', userId)
      .eq('role', 'OWNER')
      .single()

    if (existing) {
      return NextResponse.json({ orgId: existing.organizationId })
    }

    // Generate slug from email
    const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const slug = `${emailPrefix}-${userId.slice(0, 6)}`
    const orgId = `org_${userId}`
    const tmId = `tm_${userId}`

    // Create Organization
    const { error: orgError } = await supabase
      .from('Organization')
      .insert({
        id: orgId,
        name: name || emailPrefix,
        slug,
        plan: 'FREE',
        maxProjects: 1,
        maxMembers: 1,
        maxReportsPerMonth: 50,
      })

    if (orgError) {
      console.error('Error creating org:', orgError)
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    }

    // Create TeamMember (OWNER)
    const { error: tmError } = await supabase
      .from('TeamMember')
      .insert({
        id: tmId,
        organizationId: orgId,
        userId,
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: new Date().toISOString(),
      })

    if (tmError) {
      console.error('Error creating team member:', tmError)
      // Cleanup org
      await supabase.from('Organization').delete().eq('id', orgId)
      return NextResponse.json({ error: 'Failed to create team member' }, { status: 500 })
    }

    // Update user's defaultOrgId
    await supabase
      .from('User')
      .update({ defaultOrgId: orgId })
      .eq('id', userId)

    return NextResponse.json({ orgId })
  } catch (err) {
    console.error('Setup org error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
