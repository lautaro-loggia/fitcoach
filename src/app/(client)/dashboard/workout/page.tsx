import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card } from '@/components/ui/card'
import { Calendar, ChevronRight, Dumbbell, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getARTDate } from '@/lib/utils'
import { WorkoutStartDialog } from '@/components/clients/workout-start-dialog'

export default async function WorkoutPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const adminClient = createAdminClient()
    const { data: client } = await adminClient
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (!client) return <div>Error cargando cliente</div>

    // Get all workouts
    const { data: workouts } = await adminClient
        .from('assigned_workouts')
        .select('*')
        .eq('client_id', client.id)

    // Check for today's workout to auto-redirect or highlight
    // Actually, asking the user to click again might be better than auto-redirect if they want to browse.
    // But let's verify requirements. "2. Entrenamiento - Rutina del día" implies this IS the workout screen.
    // If I redirect, the URL changes.
    // Maybe show "Rutina de Hoy" big card, and other routines below?

    // Let's match existing dash style: 
    // If there is ONLY ONE workout active schedule, just show it? 
    // Implementing a list view for now to satisfy "Lista de ejercicios" (which is inside the specific routine).

    const todayName = format(getARTDate(), 'EEEE', { locale: es }).toLowerCase()
    const todayWorkout = workouts?.find(w =>
        w.scheduled_days?.map((d: string) => d.toLowerCase()).includes(todayName)
    )

    // Check if today's workout is completed
    let isTodayCompleted = false
    if (todayWorkout) {
        const todayStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date())

        const { count } = await adminClient
            .from('workout_logs')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id)
            .eq('workout_id', todayWorkout.id)
            .eq('date', todayStr)

        isTodayCompleted = (count || 0) > 0
    }

    return (
        <div className="p-6 space-y-6 flex-1">
            <div className="flex items-center gap-2">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">Mis Rutinas</h1>
            </div>

            {todayWorkout && !isTodayCompleted && (
                <div className="mb-6">
                    <p className="text-sm text-gray-500 font-medium mb-2 uppercase tracking-wide">Hoy</p>
                    <WorkoutStartDialog
                        workoutId={todayWorkout.id}
                        workoutName={todayWorkout.name}
                        exercisesCount={todayWorkout.structure?.length || 0}
                    >
                        <Card className="p-5 bg-blue-600 text-white shadow-none cursor-pointer transition-transform active:scale-[0.98]">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg">{todayWorkout.name}</h3>
                                    <p className="text-blue-100 text-sm">{todayWorkout.structure?.length || 0} ejercicios</p>
                                </div>
                                <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                                    <ChevronRight className="h-6 w-6 text-white" />
                                </div>
                            </div>
                        </Card>
                    </WorkoutStartDialog>
                </div>
            )}

            <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Todas las rutinas</p>
            <div className="flex flex-col gap-4">
                {workouts?.map(workout => (
                    <WorkoutStartDialog
                        key={workout.id}
                        workoutId={workout.id}
                        workoutName={workout.name}
                        exercisesCount={workout.structure?.length || 0}
                        estimatedTime={`${(workout.structure?.length || 0) * 4} min aprox.`}
                    >
                        <Card className="p-4 flex flex-row items-center justify-between hover:bg-gray-50 rounded-2xl border border-gray-200 shadow-none transition-all cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                                    <Dumbbell className="h-5 w-5 text-gray-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{workout.name}</h3>
                                    <p className="text-xs text-gray-500">
                                        {workout.scheduled_days?.join(', ') || "Sin días fijos"}
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                        </Card>
                    </WorkoutStartDialog>
                ))}
            </div>

            {(!workouts || workouts.length === 0) && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="relative w-full max-w-[280px] aspect-square mb-6">
                        <img
                            src="/images/training-empty-state.png"
                            alt="No hay rutinas"
                            className="w-full h-full object-contain opacity-90"
                        />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Sin rutinas asignadas</h3>
                    <p className="text-gray-500 max-w-[250px]">
                        Tu coach todavía no te asignó rutinas. ¡Pronto aparecerán acá!
                    </p>
                </div>
            )}
        </div>
    )
}
