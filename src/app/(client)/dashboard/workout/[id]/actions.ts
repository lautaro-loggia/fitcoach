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

    // Determine Trainer ID and check for existing session in PARALLEL
    const adminSupabase = createAdminClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [workoutResult, existingSessionResult] = await Promise.all([
        adminSupabase
            .from('assigned_workouts')
            .select('trainer_id, client_id')
            .eq('id', assignedWorkoutId)
            .single(),
        adminSupabase
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
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle()
    ])

    const workout = workoutResult.data
    const existingSession = existingSessionResult.data

    if (existingSession) {
        return { session: existingSession as WorkoutSession }
    }

    if (!workout) {
        return { error: 'Rutina no encontrada' }
    }

    // SECURITY CHECK: This workout MUST belong to this client
    if (workout.client_id !== client.id) {
        return { error: 'No autorizado para acceder a esta rutina' }
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

// Get all exercise checkins for the session with sets
export async function getSessionCheckins(sessionId: string) {
    const adminSupabase = createAdminClient()

    const { data: checkins, error } = await adminSupabase
        .from('exercise_checkins')
        .select(`
            *,
            set_logs (*)
        `)
        .eq('session_id', sessionId)
        .order('exercise_index')

    if (error) {
        console.error('Error fetching session checkins:', error)
        return []
    }

    return checkins || []
}

// Get exercise checkin with set logs (Legacy single fetch, keeping for compatibility if needed or specific refreshes)
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
    checkinId: string | null, // Allow null for lazy creation
    sessionId: string,
    exerciseIndex: number,
    exerciseName: string,
    setNumber: number,
    reps: number,
    weight: number,
    isCompleted: boolean
) {
    const adminSupabase = createAdminClient()
    let finalCheckinId = checkinId

    // 1. If no checkinId, create the checkin first
    if (!finalCheckinId) {
        // Double check if it exists (race condition)
        const { data: existing } = await adminSupabase
            .from('exercise_checkins')
            .select('id')
            .eq('session_id', sessionId)
            .eq('exercise_index', exerciseIndex)
            .single()

        if (existing) {
            finalCheckinId = existing.id
        } else {
            // Create
            const { data: newCheckin, error: createError } = await adminSupabase
                .from('exercise_checkins')
                .insert({
                    session_id: sessionId,
                    exercise_index: exerciseIndex,
                    exercise_name: exerciseName,
                    rest_seconds: 90, // Default
                    rest_enabled: false
                })
                .select('id')
                .single()

            if (createError || !newCheckin) {
                console.error('Error creating checkin lazily:', createError)
                return { error: 'Error al crear la sesión del ejercicio' }
            }
            finalCheckinId = newCheckin.id
        }
    }

    // Upsert the set log
    const { data, error } = await adminSupabase
        .from('set_logs')
        .upsert({
            exercise_checkin_id: finalCheckinId,
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

    return { setLog: data as SetLog, checkinId: finalCheckinId }
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
export async function completeSession(sessionId: string, feedback?: any) {
    const adminSupabase = createAdminClient()

    const { error } = await adminSupabase
        .from('workout_sessions')
        .update({
            status: 'completed',
            ended_at: new Date().toISOString(),
            feedback: feedback || {}
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

// Get workouts assigned for today
export async function getTodaysWorkouts() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { workouts: [], error: 'No autorizado' }
    }

    // Get Client ID
    const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (!client) {
        return { workouts: [], error: 'Cliente no encontrado' }
    }

    const { data: workouts } = await supabase
        .from('assigned_workouts')
        .select(`
            id,
            name,
            structure,
            scheduled_days
        `)
        .eq('client_id', client.id)
        .is('valid_until', null) // Active

    if (!workouts) return { workouts: [] }

    const daysOfWeek = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const todayIndex = new Date().getDay()
    const todayName = daysOfWeek[todayIndex]

    const todaysWorkouts = workouts.filter(w => {
        // @ts-ignore
        if (!w.scheduled_days || w.scheduled_days.length === 0) return true
        // @ts-ignore
        return w.scheduled_days.map(d => d.toLowerCase()).includes(todayName)
    })

    const { data: clientInfo } = await supabase.from('clients').select('id, full_name').eq('id', client.id).single()

    const enrichedWorkouts = todaysWorkouts.map(w => ({
        ...w,
        clients: clientInfo ? [clientInfo] : []
    }))


    return { workouts: enrichedWorkouts }
}

// Validate if session is ready to be completed
export async function validateSessionCompletionStatus(sessionId: string) {
    const adminSupabase = createAdminClient()

    // 1. Get session and structure
    const { data: session } = await adminSupabase
        .from('workout_sessions')
        .select(`
            *,
            assigned_workouts (
                structure
            )
        `)
        .eq('id', sessionId)
        .single()

    if (!session) return { valid: false, message: 'Sesión no encontrada' }

    const exercises = session.assigned_workouts?.structure || []
    if (exercises.length === 0) return { valid: true } // Empty workout is trivially complete

    // 2. Get all checkins with completed sets
    const { data: checkins } = await adminSupabase
        .from('exercise_checkins')
        .select(`
            exercise_index,
            set_logs (
                id,
                is_completed
            )
        `)
        .eq('session_id', sessionId)

    const checkinsMap = new Map()
    checkins?.forEach(c => {
        // @ts-ignore
        const hasCompletedSet = c.set_logs?.some(s => s.is_completed)
        if (hasCompletedSet) {
            checkinsMap.set(c.exercise_index, true)
        }
    })

    // 3. Check coverage
    // We expect every exercise index from 0 to exercises.length - 1 to have a 'completed' entry
    const missingExercises = []

    for (let i = 0; i < exercises.length; i++) {
        if (!checkinsMap.has(i)) {
            missingExercises.push(exercises[i].name)
        }
    }

    if (missingExercises.length > 0) {
        return {
            valid: false,
            message: `Debes completar al menos 1 serie de cada ejercicio. Faltan: ${missingExercises.slice(0, 2).join(', ')}${missingExercises.length > 2 ? '...' : ''}`
        }
    }

    return { valid: true }
}
