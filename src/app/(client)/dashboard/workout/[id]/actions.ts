'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/lib/notifications'
import { getARTDayBounds, getNormalizedARTWeekday, getTodayString, normalizeText } from '@/lib/utils'

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

type ClientContext = {
    clientId: string
}

async function getAuthenticatedClientContext(): Promise<{ error?: string; context?: ClientContext }> {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!client) {
        return { error: 'Cliente no encontrado' }
    }

    return {
        context: {
            clientId: client.id,
        },
    }
}

async function getOwnedSession(
    adminSupabase: ReturnType<typeof createAdminClient>,
    sessionId: string,
    clientId: string
) {
    const { data: session } = await adminSupabase
        .from('workout_sessions')
        .select('id, client_id, trainer_id, assigned_workout_id, status')
        .eq('id', sessionId)
        .maybeSingle()

    if (!session || session.client_id !== clientId) {
        return null
    }

    return session
}

type AssignedWorkoutSummary = {
    id: string
    trainer_id: string
    client_id: string
    name: string
    structure: unknown[]
}

type SessionWithWorkout = WorkoutSession & {
    assigned_workouts?: {
        id: string
        name: string
        structure: unknown[]
    } | {
        id: string
        name: string
        structure: unknown[]
    }[]
}

// Get (or optionally create) today's session for the CLIENT
export async function getOrCreateSession(assignedWorkoutId: string, createIfMissing: boolean = true) {
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
    const { startISO, endISO } = getARTDayBounds()

    const [workoutResult, existingSessionResult] = await Promise.all([
        adminSupabase
            .from('assigned_workouts')
            .select('id, trainer_id, client_id, name, structure')
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
            .in('status', ['in_progress', 'completed'])
            .gte('started_at', startISO)
            .lt('started_at', endISO)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle()
    ])

    const workout = workoutResult.data as AssignedWorkoutSummary | null
    const existingSession = existingSessionResult.data as SessionWithWorkout | null

    if (existingSession) {
        const sessionWorkout = Array.isArray(existingSession.assigned_workouts)
            ? existingSession.assigned_workouts[0]
            : existingSession.assigned_workouts

        return {
            session: existingSession as WorkoutSession,
            workout: sessionWorkout || (workout ? {
                id: workout.id,
                name: workout.name,
                structure: workout.structure || [],
            } : null)
        }
    }

    if (!workout) {
        return { error: 'Rutina no encontrada' }
    }

    // SECURITY CHECK: This workout MUST belong to this client
    if (workout.client_id !== client.id) {
        return { error: 'No autorizado para acceder a esta rutina' }
    }

    if (!createIfMissing) {
        return {
            session: null,
            workout: {
                id: workout.id,
                name: workout.name,
                structure: workout.structure || [],
            }
        }
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

    const newSessionWithWorkout = newSession as SessionWithWorkout
    const newSessionWorkout = Array.isArray(newSessionWithWorkout.assigned_workouts)
        ? newSessionWithWorkout.assigned_workouts[0]
        : newSessionWithWorkout.assigned_workouts

    return {
        session: newSession as WorkoutSession,
        workout: newSessionWorkout || {
            id: workout.id,
            name: workout.name,
            structure: workout.structure || [],
        }
    }
}

// Explicit start action: only creates session when client confirms "Comenzar"
export async function startWorkoutSession(assignedWorkoutId: string) {
    const result = await getOrCreateSession(assignedWorkoutId, true)

    if (result.error || !result.session) {
        return { error: result.error || 'No se pudo iniciar la sesión' }
    }

    revalidatePath(`/dashboard/workout/${assignedWorkoutId}`)
    revalidatePath('/dashboard', 'layout')

    return { session: result.session }
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
    const auth = await getAuthenticatedClientContext()
    if (!auth.context) {
        return { error: auth.error || 'No autorizado' }
    }

    const adminSupabase = createAdminClient()
    const ownedSession = await getOwnedSession(adminSupabase, sessionId, auth.context.clientId)
    if (!ownedSession) {
        return { error: 'No autorizado' }
    }

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
    const auth = await getAuthenticatedClientContext()
    if (!auth.context) {
        return []
    }

    const adminSupabase = createAdminClient()
    const ownedSession = await getOwnedSession(adminSupabase, sessionId, auth.context.clientId)
    if (!ownedSession) {
        return []
    }

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
    const auth = await getAuthenticatedClientContext()
    if (!auth.context) {
        return { error: auth.error || 'No autorizado' }
    }

    const adminSupabase = createAdminClient()
    const ownedSession = await getOwnedSession(adminSupabase, sessionId, auth.context.clientId)
    if (!ownedSession) {
        return { error: 'No autorizado' }
    }

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
    const auth = await getAuthenticatedClientContext()
    if (!auth.context) {
        return { error: auth.error || 'No autorizado' }
    }

    const adminSupabase = createAdminClient()
    const ownedSession = await getOwnedSession(adminSupabase, sessionId, auth.context.clientId)
    if (!ownedSession) {
        return { error: 'No autorizado' }
    }

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
    const auth = await getAuthenticatedClientContext()
    if (!auth.context) {
        return { error: auth.error || 'No autorizado' }
    }

    const adminSupabase = createAdminClient()
    const { data: setLog } = await adminSupabase
        .from('set_logs')
        .select('id, exercise_checkin_id')
        .eq('id', setLogId)
        .maybeSingle()

    if (!setLog) {
        return { error: 'Serie no encontrada' }
    }

    const { data: checkin } = await adminSupabase
        .from('exercise_checkins')
        .select('session_id')
        .eq('id', setLog.exercise_checkin_id)
        .maybeSingle()

    if (!checkin) {
        return { error: 'Serie no encontrada' }
    }

    const ownedSession = await getOwnedSession(adminSupabase, checkin.session_id, auth.context.clientId)
    if (!ownedSession) {
        return { error: 'No autorizado' }
    }

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
    const auth = await getAuthenticatedClientContext()
    if (!auth.context) {
        return { error: auth.error || 'No autorizado' }
    }

    const adminSupabase = createAdminClient()
    const { data: checkin } = await adminSupabase
        .from('exercise_checkins')
        .select('session_id')
        .eq('id', checkinId)
        .maybeSingle()

    if (!checkin) {
        return { error: 'Ejercicio no encontrado' }
    }

    const ownedSession = await getOwnedSession(adminSupabase, checkin.session_id, auth.context.clientId)
    if (!ownedSession) {
        return { error: 'No autorizado' }
    }

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
    const auth = await getAuthenticatedClientContext()
    if (!auth.context) {
        return { error: auth.error || 'No autorizado' }
    }

    const adminSupabase = createAdminClient()
    const { data: checkin } = await adminSupabase
        .from('exercise_checkins')
        .select('session_id')
        .eq('id', checkinId)
        .maybeSingle()

    if (!checkin) {
        return { error: 'Ejercicio no encontrado' }
    }

    const ownedSession = await getOwnedSession(adminSupabase, checkin.session_id, auth.context.clientId)
    if (!ownedSession) {
        return { error: 'No autorizado' }
    }

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
// Complete session and log it to history
export async function completeSession(sessionId: string, feedback?: Record<string, unknown>) {
    const auth = await getAuthenticatedClientContext()
    if (!auth.context) {
        return { error: auth.error || 'No autorizado' }
    }

    const adminSupabase = createAdminClient()

    // 1. Fetch session details first
    const session = await getOwnedSession(adminSupabase, sessionId, auth.context.clientId)

    if (!session) {
        return { error: 'Sesión no encontrada o no autorizada' }
    }

    if (session.status === 'completed') {
        return { success: true, idempotent: true }
    }

    const completionDate = getTodayString()
    const feedbackPayload = feedback || {}

    const { data: existingWorkoutLog } = await adminSupabase
        .from('workout_logs')
        .select('id')
        .eq('client_id', session.client_id)
        .eq('workout_id', session.assigned_workout_id)
        .eq('date', completionDate)
        .maybeSingle()

    // 2. Log to workout_logs (Vital for Dashboard stats)
    // We try to log it. If it fails, we log error but continue closing session.
    if (!existingWorkoutLog) {
        const { error: logError } = await adminSupabase
            .from('workout_logs')
            .insert({
                client_id: session.client_id,
                workout_id: session.assigned_workout_id,
                date: completionDate,
                completed_at: new Date().toISOString(),
                exercises_log: [], // storing empty for now, detail is in set_logs
                feedback: feedbackPayload
            })

        if (logError) {
            console.error('Error linking to workout_logs:', logError)
        }
    }

    // 3. Close the session
    const { data: updatedSession, error } = await adminSupabase
        .from('workout_sessions')
        .update({
            status: 'completed',
            ended_at: new Date().toISOString(),
            feedback: feedbackPayload
        })
        .eq('id', sessionId)
        .eq('status', 'in_progress')
        .select('id, client_id, trainer_id')
        .maybeSingle()

    if (error) {
        console.error('Error completing session:', error)
        return { error: 'Error al completar sesión' }
    }

    if (!updatedSession) {
        const { data: latestSession } = await adminSupabase
            .from('workout_sessions')
            .select('status')
            .eq('id', sessionId)
            .maybeSingle()

        if (latestSession?.status === 'completed') {
            return { success: true, idempotent: true }
        }

        return { error: 'No se pudo completar sesión' }
    }

    // Notify Coach
    // Need trainer_id and client name. Session has client_id and trainer_id.
    // We fetch client name for the body.
    const { data: clientNameRes } = await adminSupabase.from('clients').select('full_name').eq('id', session.client_id).single()
    const clientName = clientNameRes?.full_name || 'Asesorado'

    await createNotification({
        userId: updatedSession.trainer_id,
        type: 'workout_completed',
        title: 'Entrenamiento completado',
        body: `${clientName} completó su rutina de hoy.`,
        data: {
            clientId: updatedSession.client_id,
            url: `/clients/${updatedSession.client_id}?tab=training`
        }
    })

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

    const todayName = getNormalizedARTWeekday()

    type AssignedWorkoutForToday = {
        id: string
        name: string
        structure: unknown[]
        scheduled_days: unknown
    }

    const todaysWorkouts = workouts.filter(w => {
        const typedWorkout = w as AssignedWorkoutForToday
        const scheduledDays = Array.isArray(typedWorkout.scheduled_days)
            ? typedWorkout.scheduled_days.filter((day): day is string => typeof day === 'string')
            : []

        if (scheduledDays.length === 0) return true
        return scheduledDays.map((day) => normalizeText(day)).includes(todayName)
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
    const auth = await getAuthenticatedClientContext()
    if (!auth.context) {
        return { valid: false, message: auth.error || 'No autorizado' }
    }

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

    if (!session || session.client_id !== auth.context.clientId) {
        return { valid: false, message: 'Sesión no encontrada o no autorizada' }
    }

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

    const checkinsMap = new Map<number, boolean>()
    checkins?.forEach((c) => {
        const setLogs = Array.isArray(c.set_logs)
            ? (c.set_logs as Array<{ is_completed?: boolean | null }>)
            : []
        const hasCompletedSet = setLogs.some((setLog) => Boolean(setLog.is_completed))
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
            message: `Debes completar al menos 1 serie de cada ejercicio. Faltan: ${missingExercises.slice(0, 2).join(', ')}${missingExercises.length > 2 ? '...' : ''}`,
            missingExercises
        }
    }

    return { valid: true, missingExercises: [] }
}
