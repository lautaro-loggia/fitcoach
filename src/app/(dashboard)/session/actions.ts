'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Types
export interface WorkoutSession {
    id: string
    trainer_id: string
    client_id: string
    assigned_workout_id: string
    started_at: string
    ended_at: string | null
    status: 'in_progress' | 'completed' | 'abandoned'
}

export interface ExerciseCheckin {
    id: string
    session_id: string
    exercise_index: number
    exercise_name: string
    notes: string | null
    rest_enabled: boolean
    rest_seconds: number
}

export interface SetLog {
    id: string
    exercise_checkin_id: string
    set_number: number
    reps: number
    weight: number
    is_completed: boolean
    completed_at: string | null
}

// Get or create a session for today
export async function getOrCreateSession(clientId: string, assignedWorkoutId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    // Check for existing session today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data: existingSession } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('client_id', clientId)
        .eq('assigned_workout_id', assignedWorkoutId)
        .eq('trainer_id', user.id)
        .gte('started_at', today.toISOString())
        .lt('started_at', tomorrow.toISOString())
        .eq('status', 'in_progress')
        .single()

    if (existingSession) {
        return { session: existingSession as WorkoutSession }
    }

    // Create new session
    const { data: newSession, error } = await supabase
        .from('workout_sessions')
        .insert({
            trainer_id: user.id,
            client_id: clientId,
            assigned_workout_id: assignedWorkoutId,
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating session:', error)
        return { error: 'Error al crear la sesión' }
    }

    return { session: newSession as WorkoutSession }
}

// Get session with workout details
export async function getSessionWithWorkout(sessionId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    const { data: session, error } = await supabase
        .from('workout_sessions')
        .select(`
            *,
            assigned_workouts (
                id,
                name,
                structure,
                client_id
            ),
            clients (
                id,
                full_name
            )
        `)
        .eq('id', sessionId)
        .eq('trainer_id', user.id)
        .single()

    if (error) {
        console.error('Error fetching session:', error)
        return { error: 'Sesión no encontrada' }
    }

    return { session }
}

// Get or create exercise checkin
export async function getOrCreateExerciseCheckin(
    sessionId: string,
    exerciseIndex: number,
    exerciseName: string,
    defaultRestSeconds: number = 90
) {
    const supabase = await createClient()

    // Try to get existing
    const { data: existing } = await supabase
        .from('exercise_checkins')
        .select('*')
        .eq('session_id', sessionId)
        .eq('exercise_index', exerciseIndex)
        .single()

    if (existing) {
        return { checkin: existing as ExerciseCheckin }
    }

    // Create new
    const { data: newCheckin, error } = await supabase
        .from('exercise_checkins')
        .insert({
            session_id: sessionId,
            exercise_index: exerciseIndex,
            exercise_name: exerciseName,
            rest_seconds: defaultRestSeconds
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating exercise checkin:', error)
        return { error: 'Error al crear check-in' }
    }

    return { checkin: newCheckin as ExerciseCheckin }
}

// Get exercise checkin with set logs
export async function getExerciseCheckinWithSets(sessionId: string, exerciseIndex: number) {
    const supabase = await createClient()

    const { data: checkin, error } = await supabase
        .from('exercise_checkins')
        .select(`
            *,
            set_logs (*)
        `)
        .eq('session_id', sessionId)
        .eq('exercise_index', exerciseIndex)
        .single()

    if (error && error.code !== 'PGRST116') { // Not found is ok
        console.error('Error fetching checkin:', error)
        return { error: 'Error al obtener check-in' }
    }

    return { checkin }
}

// Save or update a set log
export async function saveSetLog(
    checkinId: string,
    setNumber: number,
    reps: number,
    weight: number,
    isCompleted: boolean
) {
    const supabase = await createClient()

    // Upsert the set log
    const { data, error } = await supabase
        .from('set_logs')
        .upsert({
            exercise_checkin_id: checkinId,
            set_number: setNumber,
            reps,
            weight,
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'exercise_checkin_id,set_number'
        })
        .select()
        .single()

    if (error) {
        console.error('Error saving set log:', error)
        return { error: 'Error al guardar serie' }
    }

    return { setLog: data as SetLog }
}

// Delete a set log
export async function deleteSetLog(setLogId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('set_logs')
        .delete()
        .eq('id', setLogId)

    if (error) {
        console.error('Error deleting set log:', error)
        return { error: 'Error al eliminar serie' }
    }

    return { success: true }
}

// Update exercise notes
export async function updateExerciseNotes(checkinId: string, notes: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('exercise_checkins')
        .update({ notes })
        .eq('id', checkinId)

    if (error) {
        console.error('Error updating notes:', error)
        return { error: 'Error al guardar notas' }
    }

    return { success: true }
}

// Update rest settings
export async function updateRestSettings(checkinId: string, enabled: boolean, seconds: number) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('exercise_checkins')
        .update({
            rest_enabled: enabled,
            rest_seconds: seconds
        })
        .eq('id', checkinId)

    if (error) {
        console.error('Error updating rest settings:', error)
        return { error: 'Error al guardar configuración de descanso' }
    }

    return { success: true }
}

// Complete session
export async function completeSession(sessionId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('workout_sessions')
        .update({
            status: 'completed',
            ended_at: new Date().toISOString()
        })
        .eq('id', sessionId)

    if (error) {
        console.error('Error completing session:', error)
        return { error: 'Error al completar sesión' }
    }

    return { success: true }
}

// Get today's scheduled workouts
export async function getTodaysWorkouts() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const today = days[new Date().getDay()]

    const { data: workouts, error } = await supabase
        .from('assigned_workouts')
        .select(`
            id,
            name,
            structure,
            scheduled_days,
            clients (
                id,
                full_name
            )
        `)
        .eq('trainer_id', user.id)
        .contains('scheduled_days', [today])

    if (error) {
        console.error('Error fetching todays workouts:', error)
        return { error: 'Error al obtener entrenamientos' }
    }

    return { workouts: workouts || [] }
}

// Get previous set data (from previous set in same session)
export async function getPreviousSetData(checkinId: string, currentSetNumber: number) {
    if (currentSetNumber <= 1) {
        return { previousSet: null }
    }

    const supabase = await createClient()

    const { data: previousSet } = await supabase
        .from('set_logs')
        .select('*')
        .eq('exercise_checkin_id', checkinId)
        .eq('set_number', currentSetNumber - 1)
        .single()

    return { previousSet: previousSet as SetLog | null }
}
