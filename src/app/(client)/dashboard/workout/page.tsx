import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { ChevronRight, Dumbbell, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getNormalizedARTWeekday, getTodayString, normalizeText } from '@/lib/utils'
import { MotionEnter, MotionStagger, MotionStaggerItem } from '@/components/motion/orbit-motion'

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

    const { data: workouts } = await adminClient
        .from('assigned_workouts')
        .select('id, name, structure, scheduled_days')
        .eq('client_id', client.id)

    const todayName = getNormalizedARTWeekday()
    const todayWorkout = workouts?.find((workout) =>
        workout.scheduled_days?.some((day: string) => normalizeText(day) === todayName)
    )

    let isTodayCompleted = false
    if (todayWorkout) {
        const todayStr = getTodayString()

        const { count } = await adminClient
            .from('workout_logs')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', client.id)
            .eq('workout_id', todayWorkout.id)
            .eq('date', todayStr)

        isTodayCompleted = (count || 0) > 0
    }

    return (
        <div className="p-6 space-y-6 flex-1">
            <MotionEnter preset="page">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold">Mis Rutinas</h1>
                </div>
            </MotionEnter>

            {todayWorkout && !isTodayCompleted && (
                <MotionEnter className="mb-6" index={1}>
                    <p className="text-sm text-gray-500 font-medium mb-2 uppercase tracking-wide">Hoy</p>
                    <Link href={`/dashboard/workout/${todayWorkout.id}`} className="block">
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
                    </Link>
                </MotionEnter>
            )}

            <MotionEnter index={2}>
                <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Todas las rutinas</p>
                <MotionStagger className="flex flex-col gap-4 mt-4">
                    {workouts?.map((workout, index) => (
                        <MotionStaggerItem key={workout.id} index={index}>
                            <Link href={`/dashboard/workout/${workout.id}`} className="block">
                                <Card className="p-4 flex flex-row items-center justify-between hover:bg-gray-50 rounded-2xl border border-gray-200 shadow-none transition-all cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                                            <Dumbbell className="h-5 w-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{workout.name}</h3>
                                            <p className="text-xs text-gray-500">
                                                {workout.scheduled_days?.join(', ') || 'Sin días fijos'}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-400" />
                                </Card>
                            </Link>
                        </MotionStaggerItem>
                    ))}
                </MotionStagger>
            </MotionEnter>

            {(!workouts || workouts.length === 0) && (
                <MotionEnter className="flex flex-col items-center justify-center py-12 px-4 text-center" index={3}>
                    <div className="relative w-full max-w-[280px] aspect-square mb-6">
                        <Image
                            src="/images/training-empty-state.png"
                            alt="No hay rutinas"
                            fill
                            sizes="(max-width: 768px) 280px, 320px"
                            className="object-contain opacity-90"
                        />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Sin rutinas asignadas</h3>
                    <p className="text-gray-500 max-w-[250px]">
                        Tu coach todavía no te asignó rutinas. ¡Pronto aparecerán acá!
                    </p>
                </MotionEnter>
            )}
        </div>
    )
}
