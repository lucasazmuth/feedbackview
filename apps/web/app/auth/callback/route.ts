import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash') || searchParams.get('token')
  const next = searchParams.get('next')
  const type = searchParams.get('type')

  const supabase = await createClient()

  // Handle token_hash (from email templates — PKCE or OTP)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'recovery' | 'signup' | 'email',
    })
    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }
      return NextResponse.redirect(`${origin}${next || '/dashboard'}`)
    }
    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/auth/forgot-password`)
    }
    return NextResponse.redirect(`${origin}/auth/login`)
  }

  // Handle PKCE code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next || '/dashboard'}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login`)
}
