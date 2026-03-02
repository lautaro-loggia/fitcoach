import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingWizard, type OnboardingClient } from '../_components/wizard'

const TOTAL_STEPS = 9

function normalizeStep(stepParam: string | string[] | undefined) {
    const rawValue = Array.isArray(stepParam) ? stepParam[0] : stepParam
    const parsed = Number.parseInt(rawValue ?? '0', 10)

    if (!Number.isFinite(parsed)) return 0

    return Math.min(Math.max(parsed, 0), TOTAL_STEPS - 1)
}

export default async function OnboardingTestPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const initialStep = normalizeStep(searchParams.step)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const mockClient: OnboardingClient = {
        id: 'qa-mock-client',
        full_name: user.user_metadata?.full_name || 'Usuario QA',
        email: user.email || 'qa@orbit.app',
        registered_email: user.email || 'qa@orbit.app',
        onboarding_status: 'pending',
        trainer: { full_name: 'Coach Orbit QA' },
        gender: 'male',
        height: 175,
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <OnboardingWizard
                client={mockClient}
                isPreview={true}
                qaMode={true}
                initialStep={initialStep}
            />
        </div>
    )
}
