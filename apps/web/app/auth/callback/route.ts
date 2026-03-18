import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token = searchParams.get('token')
  const next = searchParams.get('next')
  const type = searchParams.get('type')

  const supabase = await createClient()

  // Handle OTP token (from email templates using {{ .Token }})
  if (token && type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery',
    })
    if (!error) {
      return NextResponse.redirect(`${origin}/auth/reset-password`)
    }
    // Token invalid/expired
    return NextResponse.redirect(`${origin}/auth/forgot-password`)
  }

  // Handle PKCE code (from default Supabase flow)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (next) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login`)
}
