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

    if (!user) redirect('/auth/login')

    let { data: client, error } = await supabase
        .from('clients')
        .select('*, trainer:profiles(full_name)')
        .eq('user_id', user.id)
        .single()

    // If in preview mode and no client found (e.g. trainer exploring), use a mock
    if (isPreview && (!client || error)) {
        client = {
            id: 'mock-id',
            full_name: user.user_metadata?.full_name || 'Usuario de Prueba',
            gender: 'male',
            height: 175,
            onboarding_status: 'pending',
            trainer: { full_name: 'Coach Orbit' }
        }
    } else if (error || !client) {
        return <div>Error loading profile. Please contact support.</div>
    }

    if (client.onboarding_status === 'completed' && !isPreview) {
        redirect('/dashboard')
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <OnboardingWizard client={client} isPreview={isPreview} />
        </div>
    )
}
