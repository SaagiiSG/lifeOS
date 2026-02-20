import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Check if Supabase is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your-supabase-url') {
    // Supabase not configured, allow all access
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname

  // Protected routes - require authentication
  if (pathname.startsWith('/canvas')) {
    if (!session) {
      const redirectUrl = new URL('/auth', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Auth routes - redirect to canvas if already authenticated
  if (pathname.startsWith('/auth') && !pathname.startsWith('/auth/callback')) {
    if (session) {
      const redirectUrl = new URL('/canvas', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}

export const config = {
  matcher: ['/canvas/:path*', '/auth/:path*'],
}
