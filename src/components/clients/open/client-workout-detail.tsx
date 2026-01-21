'use client'

import { ArrowLeft, Clock, Dumbbell, Play, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Exercise {
    id: string
    name: string
    sets: number
    reps: string
    rpe?: string
    notes?: string
    rest?: string
    video_url?: string
}

interface Workout {
    id: string
    name: string
    structure: Exercise[]
    scheduled_days: string[]
    valid_until: string | null
    is_presential: boolean
    notes?: string
}

export default function ClientWorkoutDetail({ workout }: { workout: Workout }) {
    const router = useRouter()

    return (
        <div className="space-y-6 pb-24">
            {/* Header with Back Button */}
            <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold truncate flex-1">{workout.name}</h1>
            </div>

            {/* Info Card */}
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
                <div className="flex flex-wrap gap-4 text-sm text-blue-900">
                    <div className="flex items-center gap-1.5">
                        <Dumbbell className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold">{workout.structure.length} Ejercicios</span>
                    </div>
                </div>
                {workout.notes && (
                    <div className="mt-3 pt-3 border-t border-blue-200 text-sm text-blue-800">
                        <span className="font-semibold block mb-1">Notas del coach:</span>
                        {workout.notes}
                    </div>
                )}
            </Card>

            {/* Exercises List */}
            <div className="space-y-4">
                <h2 className="font-semibold text-lg">Ejercicios</h2>
                {workout.structure.map((exercise, idx) => (
                    <Card key={idx} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex gap-3">
                                <div className="flex items-center justify-center bg-gray-100 text-gray-500 font-bold h-6 w-6 rounded-full text-xs shrink-0 mt-0.5">
                                    {idx + 1}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{exercise.name}</h3>
                                    {exercise.notes && (
                                        <p className="text-xs text-amber-600 mt-1 bg-amber-50 px-2 py-1 rounded inline-block border border-amber-100">
                                            💡 {exercise.notes}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-100">
                            <div className="bg-gray-50 p-2 rounded text-center">
                                <span className="block text-[10px] uppercase text-gray-400 font-bold">Series</span>
                                <span className="font-mono font-medium text-gray-900">{exercise.sets || '-'}</span>
                            </div>
                            <div className="bg-gray-50 p-2 rounded text-center">
                                <span className="block text-[10px] uppercase text-gray-400 font-bold">Reps</span>
                                <span className="font-mono font-medium text-gray-900">{exercise.reps || '-'}</span>
                            </div>
                            {exercise.rpe && (
                                <div className="bg-gray-50 p-2 rounded text-center">
                                    <span className="block text-[10px] uppercase text-gray-400 font-bold">RPE</span>
                                    <span className="font-mono font-medium text-gray-900">{exercise.rpe}</span>
                                </div>
                            )}
                            {exercise.rest && (
                                <div className="bg-gray-50 p-2 rounded text-center">
                                    <span className="block text-[10px] uppercase text-gray-400 font-bold">Descanso</span>
                                    <span className="font-mono font-medium text-gray-900">{exercise.rest}</span>
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            {/* Start Button (Fixed Bottom) */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 md:relative md:border-0 md:bg-transparent md:p-0">
                <Button className="w-full h-12 text-lg font-bold shadow-lg bg-blue-600 hover:bg-blue-700">
                    <Play className="mr-2 h-5 w-5 fill-current" /> Comenzar Entrenamiento
                </Button>
            </div>
        </div>
    )
}
