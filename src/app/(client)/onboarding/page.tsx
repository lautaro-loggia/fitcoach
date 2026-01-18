import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from './_components/wizard'

export default async function OnboardingPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/auth/login')

    const { data: client, error } = await supabase
        .from('clients')
        .select('*, trainer:profiles(full_name)')
        .eq('user_id', user.id)
        .single()

    if (error || !client) {
        // Handle error or no client found
        return <div>Error loading profile. Please contact support.</div>
    }

    if (client.onboarding_status === 'completed') {
        redirect('/dashboard')
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <OnboardingWizard client={client} />
        </div>
    )
}
