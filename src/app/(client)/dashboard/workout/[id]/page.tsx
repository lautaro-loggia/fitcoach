import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { SessionExerciseList } from '@/components/workout-session/session-exercise-list'
import { FinishWorkoutButton } from './finish-workout-button'
import { getOrCreateSession, getSessionCheckins } from './actions'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    // Get or create session for this workout
    const { session, error } = await getOrCreateSession(id)

    if (error || !session) {
        console.error("Error loading session:", error)
        redirect('/dashboard/workout')
    }

    const assignedWorkouts = (session as any).assigned_workouts
    const workout = Array.isArray(assignedWorkouts) ? assignedWorkouts[0] : assignedWorkouts

    // Parse structure if it's JSON, though usually Supabase returns it as object if column is jsonb
    const exercises = workout?.structure || []

    // OPTIMIZATION: Fetch all exercise checkins in bulk
    const existingCheckins = await getSessionCheckins(session.id)

    return (
        <div className="flex-1 flex flex-col">
            {/* Header - Fixed on mobile, proper stacking - Adapted for Client */}
            <div className="fixed top-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 py-4 md:static md:border-b-0 md:bg-transparent md:mb-6 md:p-0">
                <div className="flex items-center justify-between max-w-md mx-auto">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/workout">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold">{workout?.name}</h1>
                            <p className="text-sm text-muted-foreground">Tu entrenamiento</p>
                        </div>
                    </div>
                    <FinishWorkoutButton sessionId={session.id} />
                </div>
            </div>

            {/* Spacer for fixed header on mobile */}
            <div className="h-[84px] md:hidden" />

            {/* Exercise List */}
            <div className="p-4 pt-2 flex-1">
                <SessionExerciseList
                    sessionId={session.id}
                    exercises={exercises}
                    clientName="Tú"
                    workoutName={workout?.name || 'Rutina'}
                    initialCheckins={existingCheckins}
                />
            </div>
        </div>
    )
}
