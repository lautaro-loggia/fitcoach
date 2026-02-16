import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Bell, Flame, Dumbbell, Target } from 'lucide-react'
import Link from 'next/link'
import { format, subDays, isToday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { WeightChart } from '@/components/client/progress/weight-chart'
import { RecentHistoryList } from '@/components/client/progress/recent-history-list'

export default async function ProgressPage({
    searchParams
}: {
    searchParams: Promise<{ checkinId: string }>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const adminClient = createAdminClient()

    // Fetch Client Data including detailed stats
    const { data: client } = await adminClient
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single()

    if (!client) return <div>Client not found</div>

    // 1. Calculate Compliance (Last 30 Days)
    const startDate = subDays(new Date(), 30).toISOString()
    const { count: completedCount } = await adminClient
        .from('workout_logs')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .gte('date', startDate)

    // Obtener entrenamientos para calcular meta real
    const { data: workouts } = await adminClient
        .from('assigned_workouts')
        .select('scheduled_days')
        .eq('client_id', client.id)

    let sessionsPerWeek = 0
    workouts?.forEach(w => {
        if (w.scheduled_days) {
            sessionsPerWeek += w.scheduled_days.length
        }
    })

    // Meta mensual = sesiones por semana * 4 semanas
    // Fallback a 12 solo si no tiene nada asignado
    const targetCount = sessionsPerWeek > 0 ? sessionsPerWeek * 4 : 12
    const actualCount = completedCount || 0
    const percentage = Math.min(100, Math.round((actualCount / targetCount) * 100))

    // 2. Fetch Checkins History
    const { data: checkins } = await adminClient
        .from('checkins')
        .select('*')
        .eq('client_id', client.id)
        .order('date', { ascending: false })
        .limit(10)

    const latestCheckin = checkins && checkins.length > 0 ? checkins[0] : null
    const startCheckin = checkins && checkins.length > 0 ? checkins[checkins.length - 1] : null

    // Determine values for UI
    const currentWeight = latestCheckin?.weight || client.current_weight || client.initial_weight || 0
    // If we have history, start from the oldest fetched, else initial
    const startWeight = startCheckin?.weight || client.initial_weight || currentWeight

    // Formatting Data for Chart
    const chartData = checkins?.map(c => ({
        date: format(new Date(c.date), 'dd MMM', { locale: es }),
        weight: c.weight || 0
    })) || []

    // Translations
    const GOAL_MAP: Record<string, string> = {
        'lose_fat': 'Pérdida de grasa',
        'gain_muscle': 'Ganancia muscular',
        'recomp': 'Recomp. corporal',
        'maintenance': 'Mantenimiento',
        'strength': 'Fuerza',
        'improve_endurance': 'Resistencia',
        'lose_weight': 'Bajada de peso'
    }

    const ACTIVITY_MAP: Record<string, string> = {
        'sedentary': 'Sedentario',
        'light': 'Ligero',
        'moderate': 'Moderado',
        'active': 'Activo',
        'very_active': 'Muy activo'
    }

    const goalLabel = client.main_goal ? (GOAL_MAP[client.main_goal] || client.main_goal) : 'Recomp. corporal'
    const activityLabel = client.activity_level ? (ACTIVITY_MAP[client.activity_level] || client.activity_level) : 'Moderado'

    return (
        <div className="min-h-screen bg-gray-50/30 font-sans">
            <div className="p-6 space-y-8 max-w-md mx-auto">
                {/* 1. Header */}
                <header className="flex justify-between items-start">
                    <div className="space-y-1">
                        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Seguimiento de tu evolución</p>
                        <h1 className="text-[28px] font-bold text-gray-900 leading-tight">Tu Progreso</h1>
                    </div>
                </header>

                {/* 2. Constancia Card */}
                {/* Custom gradient card to match "violet -> blue" */}
                <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#7F56D9] to-[#3B82F6] p-0 shadow-none border border-gray-200/20">
                    <div className="relative h-full w-full bg-gradient-to-r from-violet-500 to-blue-500 p-7 text-white/90 overflow-hidden">

                        {/* Background stylistic flame icon */}
                        <div className="absolute top-5 right-5 opacity-20 transform">
                            <Flame className="h-6 w-6 text-white" fill="white" />
                        </div>

                        <div className="relative z-10 flex flex-col h-full justify-between space-y-10">
                            <div>
                                <h3 className="text-white font-medium text-base mb-1">Constancia este mes</h3>
                                <p className="text-xs text-indigo-100 font-light opacity-80">Sigue así, vas muy bien.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-bold tracking-tighter text-white">{percentage}%</span>
                                    <span className="text-base text-indigo-100/90 font-medium">completado</span>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-[11px] font-semibold text-indigo-100/70 uppercase tracking-widest px-1">
                                        <span>Sesión {actualCount}</span>
                                        <span>Total {targetCount}</span>
                                    </div>
                                    {/* Progress Bar Custom */}
                                    <div className="h-2.5 w-full bg-black/20 rounded-full backdrop-blur-sm overflow-hidden border border-white/10">
                                        <div
                                            className="h-full bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.6)]"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Evolución de peso */}
                <WeightChart
                    data={chartData}
                    currentWeight={currentWeight}
                    startWeight={startWeight}
                    targetWeight={client.target_weight || null}
                />

                {/* 4. Metrics Grid 2x2 */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Card 1: Fase Actual */}
                    <Card className="bg-white p-5 rounded-[28px] border border-gray-200 shadow-none ring-0 aspect-[1.1] flex flex-col justify-between relative overflow-hidden group">
                        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Fase Actual</div>
                        <div className="text-base font-bold text-gray-900 leading-snug mt-1 capitalize">
                            {goalLabel}
                        </div>
                        <div className="absolute top-4 right-4 opacity-10">
                            <Dumbbell className="h-6 w-6" />
                        </div>
                    </Card>

                    {/* Card 2: Actividad */}
                    <Card className="bg-white p-5 rounded-[28px] border border-gray-200 shadow-none ring-0 aspect-[1.1] flex flex-col justify-between relative overflow-hidden group">
                        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Actividad</div>
                        <div className="text-base font-bold text-gray-900 leading-snug mt-1 capitalize">
                            {activityLabel}
                        </div>
                        <div className="absolute top-4 right-4 opacity-10">
                            <Flame className="h-6 w-6" />
                        </div>
                    </Card>

                    {/* Card 3: Grasa Corporal */}
                    <Card className="bg-white p-5 rounded-[28px] border border-gray-200 shadow-none ring-0 aspect-[1.1] flex flex-col justify-between relative overflow-hidden group">
                        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Grasa Corporal</div>
                        <div className="text-2xl font-bold text-gray-900 leading-none">
                            {latestCheckin?.body_fat ? `${latestCheckin.body_fat}%` : '20%'}
                        </div>
                        <div className="absolute top-4 right-4 opacity-10">
                            <Target className="h-6 w-6" />
                        </div>
                    </Card>

                    {/* Card 4: Último Check-in */}
                    <Card className="bg-white p-5 rounded-[28px] border border-gray-200 shadow-none aspect-[1.1] flex flex-col justify-between relative overflow-hidden">
                        <div className="text-[10px] uppercase font-bold text-violet-500 tracking-wider">Último Check-in</div>
                        <div className="flex items-center gap-2 mt-auto">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse ring-2 ring-green-100"></span>
                            <div className="text-base font-bold text-gray-900">
                                {latestCheckin ? (isToday(parseISO(latestCheckin.date)) ? 'Hoy' : format(parseISO(latestCheckin.date), 'dd MMM', { locale: es })) : 'Pendiente'}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* 5. Historial Reciente */}
                <RecentHistoryList checkins={checkins || []} />
            </div>
        </div>
    )
}
