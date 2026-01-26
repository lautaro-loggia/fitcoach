'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

// Get or create a session for today for the CLIENT
export async function getOrCreateSession(assignedWorkoutId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    // Get Client ID
    const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (!client) {
        return { error: 'Cliente no encontrado' }
    }

    // Determine Trainer ID from the assigned workout - USING ADMIN CLIENT to bypass potential RLS
    // but strictly checking client_id ownership
    const adminSupabase = createAdminClient()
    const { data: workout } = await adminSupabase
        .from('assigned_workouts')
        .select('trainer_id, client_id')
        .eq('id', assignedWorkoutId)
        .single()

    if (!workout) {
        return { error: 'Rutina no encontrada' }
    }

    // SECURITY CHECK: This workout MUST belong to this client
    if (workout.client_id !== client.id) {
        return { error: 'No autorizado para acceder a esta rutina' }
    }

    // Check for existing session today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)



    const { data: existingSession } = await adminSupabase
        .from('workout_sessions')
        .select(`
            *,
            assigned_workouts (
                id,
                name,
                structure
            )
        `)
        .eq('client_id', client.id)
        .eq('assigned_workout_id', assignedWorkoutId)
        .gte('started_at', today.toISOString())
        .lt('started_at', tomorrow.toISOString())
        .eq('status', 'in_progress')
        .single()

    if (existingSession) {
        return { session: existingSession as WorkoutSession }
    }

    // Create new session
    const { data: newSession, error } = await adminSupabase
        .from('workout_sessions')
        .insert({
            trainer_id: workout.trainer_id,
            client_id: client.id,
            assigned_workout_id: assignedWorkoutId,
            started_at: new Date().toISOString(),
            status: 'in_progress'
        })
        .select(`
            *,
            assigned_workouts (
                id,
                name,
                structure
            )
        `)
        .single()

    if (error) {
        console.error('Error creating session:', error)
        return { error: 'Error al crear la sesión' }
    }

    return { session: newSession as WorkoutSession }
}

// Get session with workout details for the CLIENT
export async function getSessionWithWorkout(sessionId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    // Get Client ID
    const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (!client) {
        return { error: 'Cliente no encontrado' }
    }

    // Use admin client to read session + workout to avoid RLS issues on related tables if any
    const adminSupabase = createAdminClient()
    const { data: session, error } = await adminSupabase
        .from('workout_sessions')
        .select(`
            *,
            assigned_workouts (
                id,
                name,
                structure
            )
        `)
        .eq('id', sessionId)
        .single()

    if (error) {
        console.error('Error fetching session:', error)
        return { error: 'Sesión no encontrada' }
    }

    // SECURITY CHECK: Verify this session belongs to the requesting client
    if (session.client_id !== client.id) {
        return { error: 'No autorizado' }
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
    const adminSupabase = createAdminClient()

    // Try to get existing
    const { data: existing } = await adminSupabase
        .from('exercise_checkins')
        .select('*')
        .eq('session_id', sessionId)
        .eq('exercise_index', exerciseIndex)
        .single()

    if (existing) {
        return { checkin: existing as ExerciseCheckin }
    }

    // Create new
    const { data: newCheckin, error } = await adminSupabase
        .from('exercise_checkins')
        .insert({
            session_id: sessionId,
            exercise_index: exerciseIndex,
            exercise_name: exerciseName,
            rest_seconds: defaultRestSeconds,
            rest_enabled: false // Default to off as per design request? Or maybe just default.
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
    const adminSupabase = createAdminClient()

    const { data: checkin, error } = await adminSupabase
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
    const adminSupabase = createAdminClient()

    // Upsert the set log
    const { data, error } = await adminSupabase
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
    const adminSupabase = createAdminClient()

    const { error } = await adminSupabase
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
    const adminSupabase = createAdminClient()

    const { error } = await adminSupabase
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
    const adminSupabase = createAdminClient()

    const { error } = await adminSupabase
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
    const adminSupabase = createAdminClient()

    const { error } = await adminSupabase
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

    // Use layout to update everything
    revalidatePath('/dashboard', 'layout')
    return { success: true }
}
