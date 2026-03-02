'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { getTodayString } from '@/lib/utils'

export type ActivityEvent = {
    id: string
    title: string
    description: string
    date: Date
    type: 'meal' | 'workout' | 'checkin' | 'payment'
    daysAgo?: string
}

type ActivityWorkoutSession = {
    id: string
    started_at: string | null
    ended_at: string | null
    assigned_workout_id: string | null
    feedback: Record<string, unknown> | null
    assigned_workouts: { name?: string | null } | { name?: string | null }[] | null
    exercise_checkins: Array<{
        set_logs: Array<{ is_completed: boolean | null }> | null
    }> | null
}

function toDateStringFromTimestamp(timestamp: string | null | undefined) {
    if (!timestamp) return null
    return getTodayString(new Date(timestamp))
}

export async function getClientActivity(clientId: string): Promise<ActivityEvent[]> {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return []
    }

    const { data: clientAuth } = await supabase
        .from('clients')
        .select('id')
        .eq('id', clientId)
        .eq('trainer_id', user.id)
        .maybeSingle()

    if (!clientAuth) {
        return []
    }

    const adminSupabase = createAdminClient()

    // 1. Fetch Meal Logs
    const { data: meals } = await adminSupabase
        .from('meal_logs')
        .select('id, meal_type, created_at, status, coach_comment')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10)

    // 2. Fetch Workout Logs (Unified with Sessions later)
    const { data: workoutLogs } = await adminSupabase
        .from('workout_logs')
        .select('id, date, completed_at, workout_id, feedback')
        .eq('client_id', clientId)
        .order('completed_at', { ascending: false })
        .limit(30)

    // 2b. Fetch Workout Sessions (The more detailed system)
    const { data: workoutSessions } = await adminSupabase
        .from('workout_sessions')
        .select(`
            id,
            started_at,
            ended_at,
            assigned_workout_id,
            feedback,
            assigned_workouts(name),
            exercise_checkins(
                set_logs(
                    is_completed
                )
            )
        `)
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .order('ended_at', { ascending: false })
        .limit(30)

    // 3. Fetch Checkins
    const { data: checkins } = await adminSupabase
        .from('checkins')
        .select('id, date, weight, observations, created_at')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(10)

    // 4. Fetch Payments
    const { data: payments } = await adminSupabase
        .from('payments')
        .select('id, amount, paid_at, note, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10)

    const events: ActivityEvent[] = []

    const sessionsWithActivity = ((workoutSessions || []) as ActivityWorkoutSession[]).filter((session) =>
        (session.exercise_checkins || []).some((checkin) =>
            (checkin.set_logs || []).some((setLog) => !!setLog.is_completed)
        )
    )
    const activeSessionIds = new Set(sessionsWithActivity.map((session) => session.id))

    const validSessionSignatures = new Set(
        sessionsWithActivity
            .map((session) => {
                const date = toDateStringFromTimestamp(session.ended_at || session.started_at)
                if (!date) return null
                return `${date}:${session.assigned_workout_id || 'log'}`
            })
            .filter((signature): signature is string => !!signature)
    )

    const invalidSessionSignatures = new Set(
        ((workoutSessions || []) as ActivityWorkoutSession[])
            .filter((session) => !activeSessionIds.has(session.id))
            .map((session) => {
                const date = toDateStringFromTimestamp(session.ended_at || session.started_at)
                if (!date) return null
                return `${date}:${session.assigned_workout_id || 'log'}`
            })
            .filter((signature): signature is string => !!signature)
    )

    const invalidOnlySessionSignatures = new Set(
        [...invalidSessionSignatures].filter((signature) => !validSessionSignatures.has(signature))
    )

    // Map Meal Logs
    meals?.forEach(m => {
        const hasComment = m.coach_comment && m.coach_comment.trim() !== ''
        events.push({
            id: m.id,
            title: m.status === 'reviewed' ? 'Comida revisada' : 'Comida registrada',
            description: hasComment ? m.coach_comment : `Se subió una foto de ${m.meal_type || 'comida'}.`,
            date: new Date(m.created_at),
            type: 'meal'
        })
    })

    // Helper to format workout feedback
    const formatFeedback = (feedback: unknown) => {
        if (!feedback || typeof feedback !== 'object') return null
        const feedbackData = feedback as {
            generalSensation?: string
            rpe?: string | number
            energy?: string
        }
        const parts = []
        if (feedbackData.generalSensation) parts.push(feedbackData.generalSensation)
        if (feedbackData.rpe) parts.push(`RPE ${feedbackData.rpe}`)
        if (feedbackData.energy) parts.push(`Energía ${feedbackData.energy.toLowerCase()}`)
        return parts.length > 0 ? parts.join(' • ') : null
    }

    // Map Workout Sessions (The more detailed system) - Prioritize these
    sessionsWithActivity.slice(0, 10).forEach(s => {
        const assignedWorkout = Array.isArray(s.assigned_workouts)
            ? s.assigned_workouts[0]
            : s.assigned_workouts
        const workoutName = assignedWorkout?.name || 'Rutina'
        const feedbackStr = formatFeedback(s.feedback)
        events.push({
            id: s.id,
            title: `Entreno: ${workoutName}`,
            description: feedbackStr || 'Sesión finalizada con éxito.',
            date: new Date(s.ended_at!),
            type: 'workout'
        })
    })

    // Map Workout Logs (Legacy or simple logs) - Add only if not already covered by a session
    workoutLogs?.forEach(w => {
        const signature = `${w.date}:${w.workout_id || 'log'}`
        if (invalidOnlySessionSignatures.has(signature)) {
            return
        }

        const logDate = new Date(w.completed_at)
        // Check if there's already a workout event within 2 minutes (to explain minor clock differences)
        const isDuplicate = events.some(e =>
            e.type === 'workout' &&
            Math.abs(e.date.getTime() - logDate.getTime()) < 120000 // 2 minutes
        )

        if (!isDuplicate) {
            const feedbackStr = formatFeedback(w.feedback)
            events.push({
                id: w.id,
                title: 'Entrenamiento finalizado',
                description: feedbackStr || 'El asesorado completó su rutina diaria.',
                date: logDate,
                type: 'workout'
            })
        }
    })

    // Map Checkins
    checkins?.forEach(c => {
        const hasObservations = c.observations && c.observations.trim() !== ''
        events.push({
            id: c.id,
            title: 'Actualización corporal',
            description: hasObservations
                ? `${c.observations} — Peso: ${c.weight}kg`
                : `Nuevo check-in registrado (${c.weight}kg).`,
            date: new Date(c.created_at || c.date), // prefers created_at for sorting
            type: 'checkin'
        })
    })

    // Map Payments
    payments?.forEach(p => {
        const hasNote = p.note && p.note.trim() !== ''
        events.push({
            id: p.id,
            title: 'Pago registrado',
            description: hasNote ? p.note : `Se registró un pago de $${p.amount}.`,
            date: new Date(p.created_at || p.paid_at),
            type: 'payment'
        })
    })

    // Sort by date desc and format
    return events
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 10)
        .map(e => ({
            ...e,
            daysAgo: formatDistanceToNow(e.date, { addSuffix: true, locale: es })
        }))
}
