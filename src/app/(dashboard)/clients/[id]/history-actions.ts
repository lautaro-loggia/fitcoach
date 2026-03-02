'use server'

import { createClient } from '@/lib/supabase/server'

type SessionFeedback = {
    generalSensation?: string
    rpe?: number | string
    energy?: string
    performance?: string
    [key: string]: unknown
}

export interface SessionHistoryItem {
    id: string
    started_at: string
    ended_at: string | null
    status: string
    workout_name: string
    feedback?: SessionFeedback | null // JSONB
    exercises: Array<{
        id: string
        exercise_name: string
        notes: string | null
        sets: Array<{
            set_number: number
            reps: number
            weight: number
            is_completed: boolean
            completed_at: string | null
        }>
    }>
}

type RawSetLog = {
    set_number: number
    reps: number
    weight: number
    is_completed: boolean
    completed_at: string | null
}

type RawExerciseCheckin = {
    id: string
    exercise_name: string
    notes: string | null
    set_logs: RawSetLog[] | null
}

type RawWorkoutSession = {
    id: string
    started_at: string
    ended_at: string | null
    status: string
    feedback: SessionFeedback | null
    assigned_workouts: { name?: string | null } | { name?: string | null }[] | null
    exercise_checkins: RawExerciseCheckin[] | null
}

export async function getClientWorkoutHistory(clientId: string): Promise<{ sessions: SessionHistoryItem[], error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { sessions: [], error: 'No autorizado' }
    }

    // Get all sessions for this client
    const { data: sessions, error } = await supabase
        .from('workout_sessions')
        .select(`
            id,
            started_at,
            ended_at,
            status,
            feedback,
            assigned_workouts (
                name
            ),
            exercise_checkins (
                id,
                exercise_name,
                notes,
                set_logs (
                    set_number,
                    reps,
                    weight,
                    is_completed,
                    completed_at
                )
            )
        `)
        .eq('client_id', clientId)
        .eq('trainer_id', user.id)
        .order('started_at', { ascending: false })
        .limit(20)

    if (error) {
        console.error('Error fetching workout history:', error)
        return { sessions: [], error: 'Error al obtener historial' }
    }

    // Transform data
    const transformedSessions: SessionHistoryItem[] = ((sessions || []) as RawWorkoutSession[]).map((session) => {
        const assignedWorkout = Array.isArray(session.assigned_workouts)
            ? session.assigned_workouts[0]
            : session.assigned_workouts

        return {
            id: session.id,
            started_at: session.started_at,
            ended_at: session.ended_at,
            status: session.status,
            workout_name: assignedWorkout?.name || 'Rutina sin nombre',
            feedback: session.feedback,
            exercises: (session.exercise_checkins || []).map((checkin) => ({
                id: checkin.id,
                exercise_name: checkin.exercise_name,
                notes: checkin.notes,
                sets: (checkin.set_logs || []).sort((a, b) => a.set_number - b.set_number)
            }))
        }
    })
        .filter((session) =>
            session.exercises.some((exercise) =>
                exercise.sets.some((set) => set.is_completed)
            )
        )

    return { sessions: transformedSessions }
}
