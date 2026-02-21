
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

        const {
            data: { user },
        } = await supabase.auth.getUser()

        // Redirect to login if not authenticated and trying to access protected routes
        if (
            !user &&
            !request.nextUrl.pathname.startsWith('/login') &&
            !request.nextUrl.pathname.startsWith('/register') &&
            !request.nextUrl.pathname.startsWith('/forgot-password') &&
            !request.nextUrl.pathname.startsWith('/reset-password') &&
            !request.nextUrl.pathname.startsWith('/auth/callback')
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
            (request.nextUrl.pathname.startsWith('/login') ||
                request.nextUrl.pathname.startsWith('/register'))
        ) {
            const role = user.user_metadata?.role
            const url = request.nextUrl.clone()
            url.pathname = role === 'client' ? '/dashboard' : '/'
            return redirectWithAuthCookies(url)
        }

        // Redirect clients from coach routes to client dashboard
        const isCoachRoute = !request.nextUrl.pathname.startsWith('/dashboard') &&
            !request.nextUrl.pathname.startsWith('/onboarding') &&
            !request.nextUrl.pathname.startsWith('/login') &&
            !request.nextUrl.pathname.startsWith('/register') &&
            !request.nextUrl.pathname.startsWith('/forgot-password') &&
            !request.nextUrl.pathname.startsWith('/reset-password') &&
            !request.nextUrl.pathname.startsWith('/auth')

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
