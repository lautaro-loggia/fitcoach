import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateClientOAuthAccess } from '@/lib/auth-callback-client-guard'
import { createNotification } from '@/lib/notifications'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    // Support generic 'next' or specific 'redirect_to' params if Supabase uses them
    const next = searchParams.get('next') ?? '/'
    const safeNext = next.startsWith('/') ? next : '/'
    const redirectToLoginWithError = (message: string) =>
        NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`)

    const error = searchParams.get('error')
    const error_description = searchParams.get('error_description')

    if (error) {
        console.error('Auth Callback Error from Params:', error, error_description)
        return redirectToLoginWithError(error_description || error)
    }

    const supabase = await createClient()
    let verifiedUser = null

    if (code) {
        const { data: { user }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

        if (sessionError) {
            console.error('Exchange Code Error:', sessionError)
            return redirectToLoginWithError(sessionError.message)
        }
        verifiedUser = user
    } else if (token_hash && type) {
        // Handle invite / magiclink / signup with PKCE
        const { data, error: sessionError } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as import('@supabase/supabase-js').EmailOtpType,
        })

        if (sessionError) {
            console.error('Verify OTP Error:', sessionError)
            return redirectToLoginWithError(sessionError.message)
        }
        verifiedUser = data?.user
    }

    if (verifiedUser && verifiedUser.email) {
        const normalizedEmail = verifiedUser.email.toLowerCase()
        const isClientUser = verifiedUser.user_metadata?.role === 'client'
        const adminSupabase = createAdminClient()
        let clientOnboardingStatus: string | null = null

        // Ensure notification preferences exist so scheduled reminders can run for this user.
        const { error: notificationPreferencesError } = await adminSupabase
            .from('notification_preferences')
            .upsert({ user_id: verifiedUser.id }, { onConflict: 'user_id' })

        if (notificationPreferencesError) {
            console.error('Notification preferences upsert error:', notificationPreferencesError)
        }

        if (isClientUser) {
            const validationResult = await validateClientOAuthAccess({
                linkClientByEmail: async () => {
                    // Secure account linking for invited clients:
                    // only link rows that match the email and are still unlinked.
                    const { error: linkError } = await adminSupabase
                        .from('clients')
                        .update({ user_id: verifiedUser.id })
                        .eq('email', normalizedEmail)
                        .is('user_id', null)
                        .is('deleted_at', null)

                    return { error: linkError }
                },
                lookupLinkedClients: async () => {
                    const { data, count, error: lookupError } = await adminSupabase
                        .from('clients')
                        .select('id, onboarding_status', { count: 'exact' })
                        .eq('user_id', verifiedUser.id)
                        .is('deleted_at', null)
                        .limit(2)

                    return {
                        data,
                        count,
                        error: lookupError,
                    }
                },
                signOut: async () => {
                    await supabase.auth.signOut()
                },
                logError: (context, error) => {
                    console.error(`${context}:`, error)
                },
            })

            if (!validationResult.allowed) {
                return redirectToLoginWithError(validationResult.message)
            }

            clientOnboardingStatus = validationResult.onboardingStatus

            const { data: linkedClient, error: linkedClientError } = await adminSupabase
                .from('clients')
                .select('id, trainer_id, full_name, onboarding_status')
                .eq('user_id', verifiedUser.id)
                .is('deleted_at', null)
                .maybeSingle()

            if (linkedClientError) {
                console.error('Linked client lookup error:', linkedClientError)
            } else if (linkedClient?.onboarding_status === 'invited') {
                const { data: updatedClient, error: updateStatusError } = await adminSupabase
                    .from('clients')
                    .update({ onboarding_status: 'in_progress', status: 'pending' })
                    .eq('id', linkedClient.id)
                    .eq('onboarding_status', 'invited')
                    .select('id')
                    .maybeSingle()

                if (updateStatusError) {
                    console.error('Client onboarding status update error:', updateStatusError)
                } else if (updatedClient) {
                    clientOnboardingStatus = 'in_progress'

                    if (linkedClient.trainer_id) {
                        const clientFirstName = linkedClient.full_name?.trim().split(' ')[0] || 'Tu asesorado'
                        const notificationResult = await createNotification({
                            userId: linkedClient.trainer_id,
                            type: 'new_client',
                            title: 'Invitación aceptada',
                            body: `${clientFirstName} aceptó tu invitación.`,
                            data: {
                                clientId: linkedClient.id,
                                url: `/clients/${linkedClient.id}`
                            }
                        })

                        if ('error' in notificationResult && notificationResult.error) {
                            console.error('New client notification error:', notificationResult.error)
                        }
                    }
                }
            }
        }

        let finalRedirect = safeNext

        // If explicit 'next' was just root, try to be smarter
        if (safeNext === '/') {
            if (isClientUser) {
                // It is a client
                if (clientOnboardingStatus === 'completed') {
                    finalRedirect = '/dashboard'
                } else {
                    finalRedirect = '/onboarding'
                }
            } else {
                // Coach default entry point
                finalRedirect = '/'
            }
        }

        console.log('Auth Callback Success for:', normalizedEmail, 'Redirecting to:', finalRedirect)
        return NextResponse.redirect(`${origin}${finalRedirect}`)
    }

    console.warn('Auth Callback: No code or token_hash found')
    return redirectToLoginWithError('No pudimos completar el inicio de sesión')
}
