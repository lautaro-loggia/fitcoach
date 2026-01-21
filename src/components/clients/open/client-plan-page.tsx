'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, ChevronRight, Dumbbell, Play, Clock, Trophy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface Workout {
    id: string
    name: string
    structure: any[]
    scheduled_days: string[]
    valid_until: string | null
    is_presential: boolean
}

export default function ClientPlanPage({ workouts }: { workouts: Workout[] }) {
    const router = useRouter()

    if (!workouts || workouts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4">
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                    <Dumbbell className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900">No hay rutinas asignadas</h3>
                <p className="text-gray-500 mt-2 text-sm max-w-xs">
                    Tu entrenador aún no ha cargado tu plan de entrenamiento.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-20">
            <div>
                <h1 className="text-2xl font-bold">Tu Plan</h1>
                <p className="text-gray-500 text-sm">Rutinas asignadas para esta semana</p>
            </div>

            <div className="space-y-3">
                {workouts.map((workout) => (
                    <Card key={workout.id} className="p-4 flex flex-col gap-4 overflow-hidden relative">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg">{workout.name}</h3>
                                {workout.scheduled_days && workout.scheduled_days.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {workout.scheduled_days.map(day => (
                                            <span key={day} className="text-[10px] uppercase font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                {day}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="bg-blue-50 text-blue-700 p-2 rounded-full">
                                <Dumbbell className="h-5 w-5" />
                            </div>
                        </div>

                        {/* Details */}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1.5">
                                <Trophy className="h-4 w-4 text-amber-500" />
                                <span>{Array.isArray(workout.structure) ? workout.structure.length : 0} Ejercicios</span>
                            </div>
                            {workout.valid_until && (
                                <div className="flex items-center gap-1.5">
                                    <Clock className="h-4 w-4" />
                                    <span>Hasta {format(new Date(workout.valid_until), 'd MMM', { locale: es })}</span>
                                </div>
                            )}
                        </div>

                        {/* Action */}
                        <Button
                            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => router.push(`/dashboard/workout/${workout.id}`)}
                        >
                            <Play className="h-4 w-4 mr-2" fill="currentColor" /> Ver Rutina
                        </Button>
                    </Card>
                ))}
            </div>
        </div>
    )
}
