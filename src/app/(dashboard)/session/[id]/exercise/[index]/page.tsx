import { redirect } from 'next/navigation'
import { getSessionWithWorkout } from '../../../actions'
import { ExerciseCheckinMobile } from '@/components/workout-session/exercise-checkin-mobile'

interface ExercisePageProps {
    params: Promise<{ id: string; index: string }>
}

export default async function ExercisePage({ params }: ExercisePageProps) {
    const { id, index } = await params
    const exerciseIndex = parseInt(index)

    const { session, error } = await getSessionWithWorkout(id)

    if (error || !session) {
        redirect('/')
    }

    const workout = (session as any).assigned_workouts
    const client = (session as any).clients
    const exercises = workout?.structure || []
    const exercise = exercises[exerciseIndex]

    if (!exercise) {
        redirect(`/session/${id}`)
    }

    return (
        <ExerciseCheckinMobile
            sessionId={id}
            exerciseIndex={exerciseIndex}
            exercise={exercise}
            clientName={client?.full_name || 'Cliente'}
        />
    )
}
