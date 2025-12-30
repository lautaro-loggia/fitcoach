'use server'

import { createClient } from '@/lib/supabase/server'

export interface SessionHistoryItem {
    id: string
    started_at: string
    ended_at: string | null
    status: string
    workout_name: string
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
    const transformedSessions: SessionHistoryItem[] = (sessions || []).map((session: any) => ({
        id: session.id,
        started_at: session.started_at,
        ended_at: session.ended_at,
        status: session.status,
        workout_name: session.assigned_workouts?.name || 'Rutina sin nombre',
        exercises: (session.exercise_checkins || []).map((checkin: any) => ({
            id: checkin.id,
            exercise_name: checkin.exercise_name,
            notes: checkin.notes,
            sets: (checkin.set_logs || []).sort((a: any, b: any) => a.set_number - b.set_number)
        }))
    }))

    return { sessions: transformedSessions }
}
