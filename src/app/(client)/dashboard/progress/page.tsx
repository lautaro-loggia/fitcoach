import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { ArrowLeft, TrendingUp, Calendar, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { WeightHistoryList } from '@/components/client/progress/weight-history-list'

export default async function ProgressPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/auth/login')

    const adminClient = createAdminClient()
    const { data: client } = await adminClient
        .from('clients')
        .select('id, full_name, main_goal')
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

    // Estimate Target (e.g. 3 times a week * 4 weeks = 12)
    // We should ideally fetch 'training_frequency' from client settings
    // Defaulting to 12 for MVP if not set
    const targetCount = 12
    const percentage = Math.min(100, Math.round(((completedCount || 0) / targetCount) * 100))

    // 2. Body Weight History (Last 10 Checkins)
    const { data: checkins } = await adminClient
        .from('checkins')
        .select('id, date, weight, body_fat, lean_mass, measurements, coach_note, coach_note_seen_at, status')
        .eq('client_id', client.id)
        .order('date', { ascending: false })
        .limit(10)

    const latestWeight = checkins && checkins.length > 0 ? checkins[0].weight : '--'
    const startWeight = checkins && checkins.length > 0 ? checkins[checkins.length - 1].weight : '--'
    const weightDiff = typeof latestWeight === 'number' && typeof startWeight === 'number'
        ? (latestWeight - startWeight).toFixed(1)
        : null

    return (
        <div className="p-4 space-y-6 pb-6">
            <div className="flex items-center gap-2">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">Mi Progreso</h1>
            </div>

            {/* Compliance Card */}
            <Card className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg overflow-hidden relative">
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-indigo-100 font-medium text-sm">Constancia (30 días)</p>
                            <h2 className="text-4xl font-bold mt-1">{percentage}%</h2>
                        </div>
                        <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Trophy className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <p className="text-sm text-indigo-100">
                        {completedCount} sesiones completadas de {targetCount} objetivo.
                    </p>
                    {/* Progress Bar */}
                    <div className="mt-4 h-2 bg-black/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white/90 rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                </div>
            </Card>

            {/* Weight Evolution */}
            <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Peso Corporal
                </h3>
                <Card className="p-4">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <p className="text-sm text-gray-500">Actual</p>
                            <p className="text-2xl font-bold text-gray-900">{latestWeight} kg</p>
                        </div>
                        {weightDiff && (
                            <div className={`text-right ${Number(weightDiff) < 0 ? 'text-green-600' : 'text-amber-600'}`}>
                                <p className="text-sm font-medium">Cambio</p>
                                <p className="text-lg font-bold">{Number(weightDiff) > 0 ? '+' : ''}{weightDiff} kg</p>
                            </div>
                        )}
                    </div>

                    {/* Interactive List Visualization */}
                    <WeightHistoryList checkins={checkins || []} />
                </Card>
            </div>

            {/* Note about Load Evolution */}
            <div className="bg-gray-50 p-4 rounded-lg border text-center">
                <p className="text-xs text-gray-500">
                    La evolución de cargas se actualizará automáticamente a medida que completes tus rutinas.
                </p>
            </div>
        </div>
    )
}
