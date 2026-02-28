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

export default async function DashboardPage() {
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

    const homeData = await getCoachHomeData()

    // Persist coach home notifications as in-app alerts with cooldown dedupe.
    await syncCoachHomeNotifications({
        urgentActions: homeData.urgentActions,
        retentionAlerts: homeData.retentionAlerts,
        weeklyMilestones: homeData.weeklyMilestones
    })

    return (
        <div className="min-h-full bg-[#f9f9fa] px-4 py-6 md:px-8 md:py-8">
            <div className="space-y-4 md:space-y-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-[30px] leading-[36px] tracking-[-0.75px] text-[#0e0e0e]">
                            {homeData.greeting}, <span className="font-bold">{homeData.coachName}</span>
                        </h1>
                        <p className="text-[16px] leading-6 text-[#8c929c] mt-1">Este es tu estado hoy</p>
                    </div>
                    <Link href="/clients?new=true">
                        <Button className="h-10 rounded-xl bg-[#0e0e0e] hover:bg-[#1a1a1a] text-white text-sm font-medium px-4 gap-2">
                            <UserPlus className="h-4 w-4" />
                            Nuevo asesorado
                        </Button>
                    </Link>
                </header>

                <CoachOnboardingWrapper />

                <CoachMetricCards metrics={homeData.metrics} />

                <section className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
                    <CoachUrgentActionsTable actions={homeData.urgentActions} />
                    <CoachComplianceCard compliance={homeData.compliance} />
                </section>

                <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-4">
                    <CoachRetentionAlerts alerts={homeData.retentionAlerts} />
                    <CoachWeeklyMilestones milestones={homeData.weeklyMilestones} />
                </section>
            </div>
        </div>
    )
}
