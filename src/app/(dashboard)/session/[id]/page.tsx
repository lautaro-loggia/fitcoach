import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionWithWorkout, completeSession } from '../actions'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Check } from 'lucide-react'
import { SessionExerciseList } from '@/components/workout-session/session-exercise-list'

interface SessionPageProps {
    params: Promise<{ id: string }>
}

export default async function SessionPage({ params }: SessionPageProps) {
    const { id } = await params
    const { session, error } = await getSessionWithWorkout(id)

    if (error || !session) {
        redirect('/')
    }

    const workout = (session as any).assigned_workouts
    const client = (session as any).clients
    const exercises = workout?.structure || []

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background border-b">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <Link href="/">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold">{workout?.name}</h1>
                            <p className="text-sm text-muted-foreground">{client?.full_name}</p>
                        </div>
                    </div>
                    <form action={async () => {
                        'use server'
                        await completeSession(id)
                        redirect('/')
                    }}>
                        <Button type="submit" variant="outline" size="sm" className="gap-1">
                            <Check className="h-4 w-4" />
                            Terminar
                        </Button>
                    </form>
                </div>
            </div>

            {/* Exercise List - All exercises in one scrollable view */}
            <div className="p-4">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                    Ejercicios ({exercises.length})
                </h2>

                <SessionExerciseList
                    sessionId={id}
                    exercises={exercises}
                    clientName={client?.full_name || 'Cliente'}
                    workoutName={workout?.name || 'Rutina'}
                />
            </div>
        </div>
    )
}
