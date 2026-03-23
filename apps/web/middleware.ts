import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // If refresh token is invalid, clear the stale cookies to stop infinite retry loops
  if (authError && authError.message?.includes('Refresh Token')) {
    const cookieNames = request.cookies.getAll()
      .filter(c => c.name.includes('auth-token'))
      .map(c => c.name)
    if (cookieNames.length > 0) {
      const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
      if (!isAuthPage) {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/login'
        const response = NextResponse.redirect(url)
        // Delete stale auth cookies
        for (const name of cookieNames) {
          response.cookies.delete(name)
        }
        return response
      }
      // On auth pages, just delete the cookies and continue
      for (const name of cookieNames) {
        supabaseResponse.cookies.delete(name)
      }
      return supabaseResponse
    }
  }

  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isPublicPage = request.nextUrl.pathname.startsWith('/p/')
  const isLandingPage = request.nextUrl.pathname === '/'
  const isStaticPage = ['/termos', '/privacidade', '/contato'].includes(request.nextUrl.pathname)

  if (!user && !isAuthPage && !isPublicPage && !isLandingPage && !isStaticPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from auth pages, EXCEPT reset-password
  const isResetPassword = request.nextUrl.pathname === '/auth/reset-password'
  if (user && isAuthPage && !isResetPassword) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|embed\\.js|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.ico$|.*\\.json$).*)'],
}
