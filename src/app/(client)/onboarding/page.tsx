import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from './_components/wizard'

export default async function OnboardingPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const isPreview = searchParams.preview === 'true'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: clientData, error } = await supabase
        .from('clients')
        .select('*, trainer:profiles(full_name)')
        .eq('user_id', user.id)
        .single()

    let client = clientData

    // If in preview mode and no client found (e.g. trainer exploring), use a mock
    if (isPreview && (!client || error)) {
        client = {
            id: 'mock-id',
            full_name: user.user_metadata?.full_name || 'Usuario de Prueba',
            email: user.email || 'preview@orbit.app',
            registered_email: user.email || 'preview@orbit.app',
            gender: 'male',
            height: 175,
            onboarding_status: 'pending',
            trainer: { full_name: 'Coach Orbit' }
        }
    } else if (error || !client) {
        return <div>Error cargando perfil. Contactá a soporte.</div>
    }

    let isServerAction = false
    try {
        const { headers } = await import('next/headers')
        const headersList = await headers()
        isServerAction = headersList.get('next-action') !== null
    } catch (e) {
        // Ignore errors
    }

    if (client.onboarding_status === 'completed' && !isPreview && !isServerAction) {
        redirect('/dashboard')
    }

    client = {
        ...client,
        registered_email: user.email || client.email || client.registered_email,
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <OnboardingWizard client={client} isPreview={isPreview} />
        </div>
    )
}
