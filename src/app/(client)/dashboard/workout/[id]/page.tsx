import { redirect } from 'next/navigation'
import { SessionExerciseList } from '@/components/workout-session/session-exercise-list'
import { FinishWorkoutButton } from './finish-workout-button'
import { StartWorkoutButton } from './start-workout-button'
import { WorkoutBackButton } from './workout-back-button'
import { getOrCreateSession, getSessionCheckins } from './actions'
import { WorkoutSessionProvider } from '@/components/workout-session/workout-session-context'
import { formatEstimatedWorkoutDuration } from '@/lib/workout-time-estimate'

type SessionExercise = {
    name: string
    exercise_id?: string
    category?: string
    gif_url?: string
    instructions?: string[]
    sets_detail?: Array<{ reps: string; weight: string; rest: string }>
    cardio_config?: {
        type: 'continuous' | 'intervals'
        duration?: number
        intensity?: 'low' | 'medium' | 'high' | 'hiit'
        work_time?: number
        rest_time?: number
        rounds?: number
    }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    // Preview mode by default: entering this screen should not start a session automatically.
    const { session, workout, error } = await getOrCreateSession(id, false)

    if (error || !workout) {
        console.error("Error loading session:", error)
        redirect('/dashboard/workout')
    }

    // Parse structure if it's JSON, though usually Supabase returns it as object if column is jsonb
    const exercises: SessionExercise[] = Array.isArray(workout?.structure)
        ? (workout.structure as SessionExercise[])
        : []

    // OPTIMIZATION: Fetch all exercise checkins in bulk
    const existingCheckins = session ? await getSessionCheckins(session.id) : []
    const typedCheckins = existingCheckins as Array<{
        exercise_index: number
        set_logs?: Array<{ is_completed?: boolean | null }> | null
    }>

    const initialCompletedIndices = session
        ? typedCheckins
            .filter(c => c.set_logs?.some((s) => Boolean(s.is_completed)))
            .map(c => c.exercise_index)
        : []

    return (
        <WorkoutSessionProvider
            initialCompletedIndices={initialCompletedIndices}
            initialTotalCount={exercises.length}
        >
            <div className="flex-1 flex flex-col">
                {/* Header - Fixed on mobile, proper stacking - Adapted for Client */}
                <div className="fixed top-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 py-4 md:static md:border-b-0 md:bg-transparent md:mb-6 md:p-0">
                    <div className="flex items-center justify-between max-w-md mx-auto">
                        <div className="flex items-center gap-3">
                            <WorkoutBackButton />
                            <div>
                                <h1 className="text-lg font-bold">{workout?.name}</h1>
                                <p className="text-sm text-muted-foreground">Tu entrenamiento</p>
                            </div>
                        </div>
                        {session ? (
                            <FinishWorkoutButton sessionId={session.id} />
                        ) : (
                            <StartWorkoutButton
                                workoutId={id}
                                workoutName={workout?.name || 'Rutina'}
                                exercisesCount={exercises.length}
                                estimatedTime={formatEstimatedWorkoutDuration(exercises)}
                            />
                        )}
                    </div>
                </div>

                {/* Spacer for fixed header on mobile */}
                <div className="h-[84px] md:hidden" />

                {/* Exercise List */}
                <div className="p-4 pt-2 flex-1">
                    {!session && (
                        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            Estás viendo la rutina en modo vista previa. Tocá <span className="font-semibold">Comenzar</span> para iniciar el entrenamiento y registrar tus series.
                        </div>
                    )}
                    <SessionExerciseList
                        sessionId={session?.id}
                        exercises={exercises}
                        initialCheckins={existingCheckins}
                        isReadOnly={!session}
                    />
                </div>
            </div>
        </WorkoutSessionProvider>
    )
}
