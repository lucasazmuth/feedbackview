import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { normalizeDomain } from '@/lib/url-utils'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetUrl } = await req.json()
    if (!targetUrl) {
      return NextResponse.json({ error: 'targetUrl is required' }, { status: 400 })
    }

    const domain = normalizeDomain(targetUrl)
    const { data: existing } = await supabaseAdmin
      .from('Project')
      .select('id')
      .eq('targetUrlDomain', domain)
      .maybeSingle()

    return NextResponse.json({ exists: !!existing })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
