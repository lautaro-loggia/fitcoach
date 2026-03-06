import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CoachOnboardingWrapper } from '@/components/onboarding/coach-onboarding-wrapper'
import { getCoachHomeData, syncCoachHomeNotifications } from '@/lib/actions/coach-home'
import { CoachMetricCards } from '@/components/dashboard/coach-metric-cards'
import { CoachUrgentActionsTable } from '@/components/dashboard/coach-urgent-actions-table'
import { CoachComplianceCard } from '@/components/dashboard/coach-compliance-card'
import { CoachRetentionAlerts } from '@/components/dashboard/coach-retention-alerts'
import { CoachWeeklyMilestones } from '@/components/dashboard/coach-weekly-milestones'
import { MotionEnter, MotionStagger } from '@/components/motion/orbit-motion'
import { CoachHomeUserMenu } from '@/components/dashboard/coach-home-user-menu'

const LAST_ONBOARDING_STEP = 5

function normalizeCoachOnboardingStep(value: string | string[] | undefined) {
    const raw = Array.isArray(value) ? value[0] : value
    const parsed = Number.parseInt(raw ?? '0', 10)
    if (!Number.isFinite(parsed)) return 0
    return Math.min(Math.max(parsed, 0), LAST_ONBOARDING_STEP)
}

export default async function DashboardPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const coachOnboardingStep = normalizeCoachOnboardingStep(searchParams.coachOnboardingStep)

    const supabase = await createClient()
    const {
        data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
        return null
    }

    if (user.user_metadata?.role === 'client') {
        const { data: client } = await supabase
            .from('clients')
            .select('onboarding_status')
            .eq('user_id', user.id)
            .single()

        if (client && client.onboarding_status !== 'completed') {
            redirect('/onboarding')
        } else {
            redirect('/dashboard')
        }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

    const metadataFullName =
        typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : ''
    const coachFullName = profile?.full_name?.trim() || metadataFullName || user.email?.split('@')[0] || 'Coach'
    const coachAvatarUrl =
        profile?.avatar_url ||
        (typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null)

    const homeData = await getCoachHomeData()

    // Persist coach home notifications as in-app alerts with cooldown dedupe.
    await syncCoachHomeNotifications({
        urgentActions: homeData.urgentActions,
        retentionAlerts: homeData.retentionAlerts,
        weeklyMilestones: homeData.weeklyMilestones
    })

    return (
        <div className="min-h-full bg-[#f9f9fa] px-4 py-6 md:px-8 md:py-8">
            <MotionStagger className="space-y-4 md:space-y-6">
                <MotionEnter preset="page">
                    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start justify-between gap-3 min-w-0 md:block">
                            <div className="min-w-0">
                                <h1 className="text-[30px] leading-[36px] tracking-[-0.75px] text-[#0e0e0e]">
                                    {homeData.greeting}, <span className="font-bold">{homeData.coachName}</span>
                                </h1>
                                <p className="text-[16px] leading-6 text-[#8c929c] mt-1">Este es tu estado hoy</p>
                            </div>
                            <CoachHomeUserMenu
                                fullName={coachFullName}
                                avatarUrl={coachAvatarUrl}
                                className="shrink-0 mt-0.5 md:hidden"
                            />
                        </div>

                        <Link href="/clients?new=true" className="block w-full sm:w-auto">
                            <Button className="h-10 w-full sm:w-auto rounded-xl bg-[#0e0e0e] hover:bg-[#1a1a1a] text-white text-sm font-medium px-4 gap-2">
                                <UserPlus className="h-4 w-4" />
                                Nuevo asesorado
                            </Button>
                        </Link>
                    </header>
                </MotionEnter>

                <MotionEnter index={1}>
                    <CoachOnboardingWrapper initialStep={coachOnboardingStep} />
                </MotionEnter>

                <MotionEnter index={2}>
                    <CoachMetricCards metrics={homeData.metrics} />
                </MotionEnter>

                <MotionEnter index={3}>
                    <section className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
                        <CoachUrgentActionsTable actions={homeData.urgentActions} />
                        <CoachComplianceCard compliance={homeData.compliance} />
                    </section>
                </MotionEnter>

                <MotionEnter index={4}>
                    <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-4">
                        <CoachRetentionAlerts alerts={homeData.retentionAlerts} />
                        <CoachWeeklyMilestones milestones={homeData.weeklyMilestones} />
                    </section>
                </MotionEnter>
            </MotionStagger>
        </div>
    )
}
