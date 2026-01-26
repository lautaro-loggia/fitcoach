import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { ArrowLeft, CheckCircle2, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MealLogger } from '@/components/clients/meal-logger'
import Link from 'next/link'

export default async function DietPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/auth/login')

    const adminClient = createAdminClient()
    // Fetch Client with Macros
    const { data: client } = await adminClient
        .from('clients')
        .select('*, trainer:profiles(full_name)')
        .eq('user_id', user.id)
        .single()

    if (!client) return <div>Client not found</div>

    // Fetch Active Meal Plan
    const { data: mealPlan } = await adminClient
        .from('weekly_meal_plans')
        .select('*, days:weekly_meal_plan_days(*, meals:weekly_meal_plan_meals(*, items:weekly_meal_plan_items(*, recipe:recipes(*))))')
        .eq('client_id', client.id)
        .eq('status', 'active')
        .single() // Assuming one active plan

    // Filter logic for "Plan del día"
    // JS Date day: 0=Sun, 1=Mon... DB day: 1=Mon...7=Sun
    const jsDay = new Date().getDay()
    const dbDay = jsDay === 0 ? 7 : jsDay

    const todayPlan = mealPlan?.days?.find((d: any) => d.day_of_week === dbDay)

    return (
        <div className="p-4 space-y-6 pb-24">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">Nutrición</h1>
            </div>

            {/* Macros Card */}
            <Card className="p-5 bg-white border shadow-sm space-y-4">
                <h2 className="font-semibold text-gray-900">Objetivo Diario</h2>

                <div className="flex justify-between items-end mb-1">
                    <span className="text-3xl font-bold text-gray-900">{client.target_calories || 2000}</span>
                    <span className="text-sm text-gray-500 mb-1.5">kcal</span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <MacroItem label="Proteína" value={client.target_protein} color="bg-blue-500" />
                    <MacroItem label="Carbos" value={client.target_carbs} color="bg-amber-500" />
                    <MacroItem label="Grasas" value={client.target_fats} color="bg-rose-500" />
                </div>
            </Card>

            {/* Meal Logger Action */}
            <Card className="p-4 bg-gray-50 border-dashed border-2 flex flex-col items-center text-center gap-2">
                <Utensils className="h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-500">Subí una foto de tu comida para que tu coach la revise.</p>
                <div className="w-full max-w-xs mt-2">
                    <MealLogger clientId={client.id} />
                </div>
            </Card>

            {/* Weekly/Daily Plan */}
            <div>
                <h2 className="text-lg font-semibold mb-3">Tu Menú de Hoy</h2>
                <p className="text-xs text-gray-500 uppercase font-bold mb-3">
                    {format(new Date(), 'EEEE d', { locale: es })}
                </p>

                {todayPlan ? (
                    <div className="space-y-3">
                        {todayPlan.meals?.sort((a: any, b: any) => a.sort_order - b.sort_order).map((meal: any) => (
                            <Card key={meal.id} className="p-4">
                                <h3 className="font-semibold text-blue-900 mb-2 text-sm">{meal.name}</h3>
                                <div className="space-y-2">
                                    {meal.items?.map((item: any, idx: number) => (
                                        <div key={idx} className="flex gap-2 items-start text-sm">
                                            <div className="mt-0.5 min-w-[4px] h-[4px] rounded-full bg-blue-300" />
                                            <div>
                                                <p className="text-gray-800 font-medium">
                                                    {item.custom_name || item.recipe?.name || "Sin nombre"}
                                                </p>
                                                {item.recipe && (
                                                    <p className="text-xs text-gray-500">
                                                        {item.portions > 1 ? `${item.portions} porciones` : ""}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {(!meal.items || meal.items.length === 0) && (
                                        <p className="text-xs text-gray-400 italic">Sin comidas asignadas</p>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <p className="text-gray-500 text-sm">No hay plan cargado para hoy.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function MacroItem({ label, value, color }: { label: string, value?: number, color: string }) {
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs">
                <span className="font-medium text-gray-600">{label}</span>
                <span className="text-gray-900 font-bold">{value || 0}g</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: '100%' }} />
                {/* Fixed at 100% just as visual target, since we don't track intake yet */}
            </div>
        </div>
    )
}
