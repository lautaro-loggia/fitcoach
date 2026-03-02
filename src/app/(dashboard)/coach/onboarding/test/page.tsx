import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CoachOnboardingTestHarness } from '@/components/onboarding/coach-onboarding-test-harness'

const TOTAL_STEPS = 6

function normalizeStep(stepParam: string | string[] | undefined) {
    const rawValue = Array.isArray(stepParam) ? stepParam[0] : stepParam
    const parsed = Number.parseInt(rawValue ?? '0', 10)

    if (!Number.isFinite(parsed)) return 0

    return Math.min(Math.max(parsed, 0), TOTAL_STEPS - 1)
}

export default async function CoachOnboardingTestPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const initialStep = normalizeStep(searchParams.step)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    if (user.user_metadata?.role === 'client') {
        redirect('/dashboard')
    }

    return <CoachOnboardingTestHarness initialStep={initialStep} />
}
