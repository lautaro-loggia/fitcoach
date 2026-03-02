'use client'

import { Play } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { WorkoutStartDialog } from '@/components/clients/workout-start-dialog'
import { startWorkoutSession } from './actions'

interface StartWorkoutButtonProps {
    workoutId: string
    workoutName: string
    exercisesCount: number
    estimatedTime: string
}

export function StartWorkoutButton({
    workoutId,
    workoutName,
    exercisesCount,
    estimatedTime,
}: StartWorkoutButtonProps) {
    const router = useRouter()

    const handleStart = async () => {
        const result = await startWorkoutSession(workoutId)

        if (result.error) {
            toast.error(result.error)
            return
        }

        toast.success('Entrenamiento iniciado')
        router.push(`/dashboard/workout/${workoutId}?started=1`)
    }

    return (
        <WorkoutStartDialog
            workoutId={workoutId}
            workoutName={workoutName}
            exercisesCount={exercisesCount}
            estimatedTime={estimatedTime}
            onStart={handleStart}
        >
            <Button
                variant="outline"
                size="sm"
                className="gap-1 font-semibold shadow-sm transition-all duration-300 bg-white hover:bg-gray-50 text-black border-gray-200"
            >
                <Play className="h-4 w-4 text-black fill-black" />
                Comenzar
            </Button>
        </WorkoutStartDialog>
    )
}
