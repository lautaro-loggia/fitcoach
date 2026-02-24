
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const redirectWithAuthCookies = (url: URL) => {
        const response = NextResponse.redirect(url)

        // Preserve auth cookies written during this middleware run (e.g. token refresh).
        supabaseResponse.headers.forEach((value, key) => {
            if (key.toLowerCase() === 'set-cookie') {
                response.headers.append(key, value)
            }
        })

        return response
    }

    try {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value }) =>
                            request.cookies.set(name, value)
                        )
                        supabaseResponse = NextResponse.next({
                            request,
                        })
                        cookiesToSet.forEach(({ name, value, options }) =>
                            supabaseResponse.cookies.set(name, value, options)
                        )
                    },
                },
            }
        )

        const pathname = request.nextUrl.pathname
        const isLoginRoute = pathname.startsWith('/login')
        const isRegisterRoute = pathname.startsWith('/register')
        const isAuthUiRoute =
            isLoginRoute ||
            isRegisterRoute ||
            pathname.startsWith('/forgot-password') ||
            pathname.startsWith('/reset-password')
        const isAuthCallbackRoute = pathname.startsWith('/auth/callback')
        const isProtectedRoute = !isAuthUiRoute && !isAuthCallbackRoute

        // Read session from cookies to avoid hitting Auth API on every request.
        const {
            data: { session },
        } = await supabase.auth.getSession()
        const user = session?.user ?? null

        // Redirect to login if not authenticated and trying to access protected routes
        if (
            !user &&
            isProtectedRoute
        ) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            // Preserve query params (like 'code') so login page can handle auth exchange or errors
            request.nextUrl.searchParams.forEach((value, key) => {
                url.searchParams.set(key, value)
            })
            return redirectWithAuthCookies(url)
        }

        // Redirect to dashboard if authenticated and trying to access auth pages (except callback/signout)
        if (
            user &&
            (isLoginRoute || isRegisterRoute)
        ) {
            const role = user.user_metadata?.role
            const url = request.nextUrl.clone()
            url.pathname = role === 'client' ? '/dashboard' : '/'
            return redirectWithAuthCookies(url)
        }

        // Redirect clients from coach routes to client dashboard
        const isCoachRoute = !pathname.startsWith('/dashboard') &&
            !pathname.startsWith('/onboarding') &&
            !isAuthUiRoute &&
            !pathname.startsWith('/auth')

        if (user && user.user_metadata?.role === 'client' && isCoachRoute) {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return redirectWithAuthCookies(url)
        }

        return supabaseResponse
    } catch (error) {
        // If middleware fails, log error but don't break the app
        console.error('Middleware error:', error)
        return supabaseResponse
    }
}
