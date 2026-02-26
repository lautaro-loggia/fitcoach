import { redirect } from 'next/navigation'

export default function OnboardingTestPage() {
    redirect('/onboarding?preview=true')
}
