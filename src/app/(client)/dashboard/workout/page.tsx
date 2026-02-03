import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card } from '@/components/ui/card'
import { Calendar, ChevronRight, Dumbbell, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function WorkoutPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/auth/login')

    const adminClient = createAdminClient()
    const { data: client } = await adminClient
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (!client) return <div>Error loading client</div>

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

    const todayName = format(new Date(), 'EEEE', { locale: es }).toLowerCase()
    const todayWorkout = workouts?.find(w =>
        w.scheduled_days?.map((d: string) => d.toLowerCase()).includes(todayName)
    )

    // We could Auto-Redirect if today has a workout? 
    // if (todayWorkout) redirect(`/dashboard/workout/${todayWorkout.id}`)
    // Commented out to allow browsing others if needed.

    return (
        <div className="p-4 space-y-6 pb-24">
            <div className="flex items-center gap-2">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">Mis Rutinas</h1>
            </div>

            {todayWorkout && (
                <div className="mb-6">
                    <p className="text-sm text-gray-500 font-medium mb-2 uppercase tracking-wide">Hoy</p>
                    <Link href={`/dashboard/workout/${todayWorkout.id}`}>
                        <Card className="p-5 bg-blue-600 text-white shadow-lg shadow-blue-200">
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
                    </Link>
                </div>
            )}

            <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Todas las rutinas</p>
            <div className="space-y-6">
                {workouts?.map(workout => (
                    <Link key={workout.id} href={`/dashboard/workout/${workout.id}`}>
                        <Card className="p-4 flex flex-row items-center justify-between hover:bg-gray-50 rounded-2xl border-gray-200 transition-all">
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
                    </Link>
                ))}
            </div>

            {(!workouts || workouts.length === 0) && (
                <div className="text-center py-10 text-gray-400">
                    <Dumbbell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No tenés rutinas asignadas.</p>
                </div>
            )}
        </div>
    )
}
