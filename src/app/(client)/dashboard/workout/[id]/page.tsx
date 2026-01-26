import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getOrCreateSession, completeSession } from './actions'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Check } from 'lucide-react'
import { SessionExerciseList } from '@/components/workout-session/session-exercise-list'

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

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Header - Fixed on mobile, proper stacking - Adapted for Client */}
            <div className="fixed top-14 left-0 right-0 z-30 bg-background border-b px-4 py-4 md:static md:border-b-0 md:bg-transparent md:mb-6 md:p-0">
                <div className="flex items-center justify-between">
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
                    <form action={async () => {
                        'use server'
                        await completeSession(session.id)
                        redirect('/dashboard/workout')
                    }}>
                        <Button type="submit" variant="default" size="sm" className="gap-1">
                            <Check className="h-4 w-4" />
                            Terminar
                        </Button>
                    </form>
                </div>
            </div>

            {/* Spacer for fixed header on mobile */}
            <div className="h-[84px] md:hidden" />

            {/* Exercise List */}
            <div className="p-4 pt-0 md:p-4">
                <SessionExerciseList
                    sessionId={session.id}
                    exercises={exercises}
                    clientName="Tú"
                    workoutName={workout?.name || 'Rutina'}
                />
            </div>
        </div>
    )
}
