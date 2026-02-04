'use client'

import { useState } from 'react'
import { ArrowLeft, Check, CheckCircle2, Dumbbell, Trophy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner' // Assuming sonner is used, if not we'll use standard toast
import { completeWorkout } from '@/app/(client)/dashboard/workout/actions'
import confetti from 'canvas-confetti'
import WorkoutFeedbackForm, { WorkoutFeedback } from './workout-feedback-form'

interface Exercise {
    id: string
    name: string
    sets: number
    reps: string
    rpe?: string
    notes?: string
    rest?: string
}

interface Workout {
    id: string
    name: string
    structure: Exercise[]
    notes?: string
}

export default function ActiveWorkoutView({ workout, clientId }: { workout: Workout; clientId: string }) {
    const router = useRouter()
    const [checkedState, setCheckedState] = useState<Record<number, boolean>>({})
    const [showFeedback, setShowFeedback] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const toggleExercise = (index: number) => {
        setCheckedState(prev => ({
            ...prev,
            [index]: !prev[index]
        }))
    }

    const completedCount = Object.values(checkedState).filter(Boolean).length
    const totalExercises = workout.structure.length
    const progress = Math.round((completedCount / totalExercises) * 100)

    const handleFinishClick = () => {
        setShowFeedback(true)
    }

    const handleFinalSubmit = async (feedback: WorkoutFeedback) => {
        setIsSubmitting(true)
        try {
            const result = await completeWorkout({
                workoutId: workout.id,
                clientId: clientId,
                exercisesLog: checkedState,
                feedback // Pass feedback data
            })

            if (result.error) {
                toast.error(result.error)
                return
            }

            // Success Effect
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            })

            toast.success('¡Entrenamiento completado!')
            router.push('/dashboard')
        } catch (error) {
            toast.error('Ocurrió un error inesperado')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (showFeedback) {
        return <WorkoutFeedbackForm onSubmit={handleFinalSubmit} isSubmitting={isSubmitting} />
    }

    return (
        <div className="space-y-6 pb-32"> {/* Increased padding for floating bottom bar */}

            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md py-4 border-b">
                <div className="flex items-center gap-2 mb-2 px-1">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2 h-8 w-8">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-lg font-bold truncate flex-1">{workout.name}</h1>
                </div>

                {/* Progress Bar */}
                <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-green-500 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between items-center mt-1 px-1">
                    <span className="text-xs text-gray-500 font-medium">{completedCount} de {totalExercises} ejercicios</span>
                    <span className="text-xs text-green-600 font-bold">{progress}%</span>
                </div>
            </div>

            {/* Exercises List */}
            <div className="space-y-4">
                {workout.structure.map((exercise, idx) => {
                    const isChecked = checkedState[idx] || false
                    return (
                        <Card
                            key={idx}
                            onClick={() => toggleExercise(idx)}
                            className={`p-4 transition-all duration-200 cursor-pointer border-2 ${isChecked ? 'border-green-500 bg-green-50/30' : 'border-transparent hover:border-gray-200'}`}
                        >
                            <div className="flex gap-3">
                                {/* Checkbox Indicator */}
                                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${isChecked ? 'bg-green-500 border-green-500' : 'border-gray-300 bg-white'}`}>
                                    {isChecked && <Check className="h-3.5 w-3.5 text-white stroke-[3px]" />}
                                </div>

                                <div className="flex-1">
                                    <h3 className={`font-bold text-base leading-tight ${isChecked ? 'text-green-900' : 'text-gray-900'}`}>
                                        {exercise.name}
                                    </h3>

                                    {/* Quick Stats Grid */}
                                    <div className="grid grid-cols-3 gap-2 mt-3 w-full max-w-[300px]">
                                        <div className="bg-white/50 rounded py-1 px-2 border border-gray-100">
                                            <span className="block text-[10px] uppercase text-gray-400 font-bold">Series</span>
                                            <span className="font-mono text-sm font-semibold text-gray-700">{exercise.sets || '-'}</span>
                                        </div>
                                        <div className="bg-white/50 rounded py-1 px-2 border border-gray-100">
                                            <span className="block text-[10px] uppercase text-gray-400 font-bold">Reps</span>
                                            <span className="font-mono text-sm font-semibold text-gray-700">{exercise.reps || '-'}</span>
                                        </div>
                                        {/* Optional 3rd metric based on availability */}
                                        <div className="bg-white/50 rounded py-1 px-2 border border-gray-100">
                                            <span className="block text-[10px] uppercase text-gray-400 font-bold">Peso</span>
                                            <span className="font-mono text-sm font-semibold text-gray-400 italic">--</span>
                                        </div>
                                    </div>

                                    {exercise.notes && (
                                        <p className="text-xs text-amber-700 mt-2 bg-amber-50 px-2 py-1 rounded inline-block">
                                            💡 {exercise.notes}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Card>
                    )
                })}
            </div>

            {/* Finish Action */}
            <div className="fixed bottom-20 left-4 right-4 z-20">
                <Button
                    onClick={handleFinishClick}
                    disabled={isSubmitting}
                    className={`w-full h-14 text-lg font-bold shadow-xl transition-all ${completedCount === totalExercises
                        ? 'bg-green-600 hover:bg-green-700 text-white animate-pulse'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                >
                    {isSubmitting ? (
                        "Guardando..."
                    ) : (
                        completedCount === totalExercises ? (
                            <span className="flex items-center gap-2"><Trophy className="h-5 w-5" /> Finalizar Rutina</span>
                        ) : (
                            <span className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> Finalizar ({completedCount}/{totalExercises})</span>
                        )
                    )}
                </Button>
            </div>
        </div>
    )
}
