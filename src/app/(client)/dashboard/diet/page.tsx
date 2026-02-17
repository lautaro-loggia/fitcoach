import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getDailyMealLogs } from '@/app/(dashboard)/clients/[id]/meal-plan-actions'
import { getARTDate, getTodayString } from '@/lib/utils'
import { NutritionView } from '@/components/clients/nutrition/nutrition-view'

export default async function DietPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const adminClient = createAdminClient()
    // Fetch Client with Macros
    const { data: client } = await adminClient
        .from('clients')
        .select('*, trainer:profiles(full_name)')
        .eq('user_id', user.id)
        .single()

    if (!client) return <div>Cliente no encontrado</div>

    // Fetch Active Meal Plan
    const { data: mealPlan } = await adminClient
        .from('weekly_meal_plans')
        .select('*, days:weekly_meal_plan_days(*, meals:weekly_meal_plan_meals(*, items:weekly_meal_plan_items(*, recipe:recipes(*))))')
        .eq('client_id', client.id)
        .eq('status', 'active')
        .single() // Assuming one active plan

    // Filter logic for "Plan del día"
    // ART Date day calculation
    const artNow = getARTDate()
    const jsDay = artNow.getDay()
    const dbDay = jsDay === 0 ? 7 : jsDay

    const todayPlan = mealPlan?.days?.find((d: any) => d.day_of_week === dbDay)

    // Fetch Daily Logs using ART date string
    const todayStr = getTodayString()
    const { logs: dailyLogs } = await getDailyMealLogs(client.id, todayStr)

    // Calculate Progress
    const plannedMealNames = todayPlan?.meals?.map((m: any) => m.name) || []
    const loggedMealTypes = new Set((dailyLogs || []).map((l: any) => l.meal_type))
    const completedCount = plannedMealNames.filter((name: string) => loggedMealTypes.has(name)).length
    const totalCount = plannedMealNames.length

    // Prepare data for the View
    // Structure expected by NutritionView: { meals: [...] }
    const viewMealPlan = todayPlan ? { meals: todayPlan.meals } : null

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="h-5 w-5 text-gray-700" />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Nutrición</h1>
            </div>

            <NutritionView
                client={client}
                mealPlan={viewMealPlan}
                dailyLogs={dailyLogs || []}
            />
        </div>
    )
}
