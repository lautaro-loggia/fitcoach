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
        .select('id, meal_type, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10)

    // 2. Fetch Workout Logs
    const { data: workouts } = await supabase
        .from('workout_logs')
        .select('id, completed_at, workout_id')
        .eq('client_id', clientId)
        .order('completed_at', { ascending: false })
        .limit(10)

    // 3. Fetch Checkins
    const { data: checkins } = await supabase
        .from('checkins')
        .select('id, date, weight, created_at')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(10)

    // 4. Fetch Payments
    const { data: payments } = await supabase
        .from('payments')
        .select('id, amount, paid_at, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10)

    const events: ActivityEvent[] = []

    // Map Meal Logs
    meals?.forEach(m => {
        events.push({
            id: m.id,
            title: 'Comida registrada',
            description: `Se subió una foto de ${m.meal_type}.`,
            date: new Date(m.created_at),
            type: 'meal'
        })
    })

    // Map Workout Logs
    workouts?.forEach(w => {
        events.push({
            id: w.id,
            title: 'Entrenamiento completado',
            description: `El asesorado finalizó su rutina de hoy.`,
            date: new Date(w.completed_at),
            type: 'workout'
        })
    })

    // Map Checkins
    checkins?.forEach(c => {
        events.push({
            id: c.id,
            title: 'Actualización corporal',
            description: `Nuevo check-in registrado (${c.weight}kg).`,
            date: new Date(c.created_at || c.date), // prefers created_at for sorting
            type: 'checkin'
        })
    })

    // Map Payments
    payments?.forEach(p => {
        events.push({
            id: p.id,
            title: 'Pago registrado',
            description: `Se registró un pago de $${p.amount}.`,
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
