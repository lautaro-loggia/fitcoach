import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // Support generic 'next' or specific 'redirect_to' params if Supabase uses them
    const next = searchParams.get('next') ?? '/'

    const error = searchParams.get('error')
    const error_description = searchParams.get('error_description')

    if (error) {
        console.error('Auth Callback Error from Params:', error, error_description)
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description || error)}`)
    }

    if (code) {
        const supabase = await createClient()
        const { data: { user }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

        if (sessionError) {
            console.error('Exchange Code Error:', sessionError)
            return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(sessionError.message)}`)
        }

        if (user && user.email) {
            console.log('Auth Callback Success for:', user.email, 'Redirecting to:', next)
            // Secure Account Linking: 
            // Attempt to link this Auth User to a Client Record by Email.
            // Only acts if the Client Record has NO user_id set.
            const adminSupabase = createAdminClient()


            // Secure Account Linking: 
            const { error: linkError } = await adminSupabase
                .from('clients')
                .update({ user_id: user.id })
                .eq('email', user.email)
                .is('user_id', null)

            if (linkError) {
                console.error('Account Linking Error:', linkError)
            }

            // Check Client Status to determine redirect
            const { data: clientData } = await adminSupabase
                .from('clients')
                .select('onboarding_status')
                .eq('email', user.email)
                .single()

            let finalRedirect = next

            // If explicit 'next' was just root, try to be smarter
            if (next === '/') {
                if (clientData) {
                    // It is a client
                    if (clientData.onboarding_status === 'completed') {
                        finalRedirect = '/dashboard'
                    } else {
                        finalRedirect = '/onboarding'
                    }
                } else {
                    // Maybe a trainer? Default to dashboard
                    finalRedirect = '/dashboard'
                }
            }

            return NextResponse.redirect(`${origin}${finalRedirect}`)
        }
    }

    console.warn('Auth Callback: No code or user found')
    return NextResponse.redirect(`${origin}/login?error=no_code_or_user`)
}
