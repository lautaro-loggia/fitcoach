'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export type ActivityEvent = {
    id: string
    title: string
    description: string
    date: Date
    type: 'meal' | 'workout' | 'checkin' | 'payment'
    daysAgo?: string
}

export async function getClientActivity(clientId: string): Promise<ActivityEvent[]> {
    const supabase = createAdminClient()

    // 1. Fetch Meal Logs
    const { data: meals } = await supabase
        .from('meal_logs')
        .select('id, meal_type, created_at, status, coach_comment')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10)

    // 2. Fetch Workout Logs (Unified with Sessions later)
    const { data: workoutLogs } = await supabase
        .from('workout_logs')
        .select('id, completed_at, workout_id, feedback')
        .eq('client_id', clientId)
        .order('completed_at', { ascending: false })
        .limit(10)

    // 2b. Fetch Workout Sessions (The more detailed system)
    const { data: workoutSessions } = await supabase
        .from('workout_sessions')
        .select('id, ended_at, feedback, assigned_workouts(name)')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .order('ended_at', { ascending: false })
        .limit(10)

    // 3. Fetch Checkins
    const { data: checkins } = await supabase
        .from('checkins')
        .select('id, date, weight, observations, created_at')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(10)

    // 4. Fetch Payments
    const { data: payments } = await supabase
        .from('payments')
        .select('id, amount, paid_at, note, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10)

    const events: ActivityEvent[] = []

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
    const formatFeedback = (feedback: any) => {
        if (!feedback || typeof feedback !== 'object') return null
        const parts = []
        if (feedback.generalSensation) parts.push(feedback.generalSensation)
        if (feedback.rpe) parts.push(`RPE ${feedback.rpe}`)
        if (feedback.energy) parts.push(`Energía ${feedback.energy.toLowerCase()}`)
        return parts.length > 0 ? parts.join(' • ') : null
    }

    // Map Workout Logs
    workoutLogs?.forEach(w => {
        const feedbackStr = formatFeedback(w.feedback)
        events.push({
            id: w.id,
            title: 'Entrenamiento finalizado',
            description: feedbackStr || 'El asesorado completó su rutina diaria.',
            date: new Date(w.completed_at),
            type: 'workout'
        })
    })

    // Map Workout Sessions (If they are not duplicates by ID or similar)
    // We'll add them and let the date sort or unique ID handle it
    workoutSessions?.forEach(s => {
        // Skip if we already have a workout log with this date/time approx (though IDs are different)
        // Just adding them for now as they represent a more detailed entry
        const workoutName = (s.assigned_workouts as any)?.name || 'Rutina'
        const feedbackStr = formatFeedback(s.feedback)
        events.push({
            id: s.id,
            title: `Entreno: ${workoutName}`,
            description: feedbackStr || 'Sesión finalizada con éxito.',
            date: new Date(s.ended_at!),
            type: 'workout'
        })
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
