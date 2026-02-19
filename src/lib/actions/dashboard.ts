'use server'

import { createClient } from '@/lib/supabase/server'
import { getTodayString } from '@/lib/utils'

export interface DashboardStats {
    activeClients: number
    monthlyIncome: number
    pendingPaymentsCount: number
    projectedIncome: number
    pendingCheckinsCount: number
    newClientsCount: number
}

export interface IncomeData {
    month: string
    amount: number
}

export interface ClientDue {
    id: string
    full_name: string
    avatar_url: string | null
    plan_name: string | null
    next_due_date: string
    price_monthly: number
    status: 'pending' | 'overdue'
}

export interface CheckinDue {
    id: string
    full_name: string
    avatar_url: string | null
    next_checkin_date: string
    status: 'pending' | 'overdue'
}

export async function getDashboardStats(): Promise<DashboardStats> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

    // 4. Pending Check-ins Count (Due today or overdue)
    const todayStr = getTodayString()

    const [
        { count: activeClients },
        { data: payments },
        { data: pendingClients },
        { count: pendingCheckins },
        { count: newClients },
    ] = await Promise.all([
        supabase
            .from('clients')
            .select('id', { count: 'exact', head: true })
            .eq('trainer_id', user.id)
            .eq('status', 'active'),
        supabase
            .from('payments')
            .select('amount')
            .eq('trainer_id', user.id)
            .gte('paid_at', firstDayOfMonth),
        supabase
            .from('clients')
            .select('price_monthly')
            .eq('trainer_id', user.id)
            .in('payment_status', ['pending', 'overdue']),
        supabase
            .from('clients')
            .select('id', { count: 'exact', head: true })
            .eq('trainer_id', user.id)
            .eq('status', 'active')
            .lte('next_checkin_date', todayStr),
        supabase
            .from('clients')
            .select('id', { count: 'exact', head: true })
            .eq('trainer_id', user.id)
            .gte('created_at', firstDayOfMonth),
    ])

    const monthlyIncome = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0
    const pendingPaymentsCount = pendingClients?.length || 0
    const projectedIncome = pendingClients?.reduce((sum, client) => sum + (client.price_monthly || 0), 0) || 0
    const pendingCheckinsCount = pendingCheckins || 0

    return {
        activeClients: activeClients || 0,
        monthlyIncome,
        pendingPaymentsCount,
        projectedIncome,
        pendingCheckinsCount,
        newClientsCount: newClients || 0
    }
}

export async function getIncomeHistory(rangeStart?: Date, rangeEnd?: Date): Promise<IncomeData[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Default to last 6 months if not provided
    let startDate = rangeStart
    const endDate = rangeEnd || new Date()

    if (!startDate) {
        startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 5)
        startDate.setDate(1)
    }

    const { data: payments } = await supabase
        .from('payments')
        .select('amount, paid_at')
        .eq('trainer_id', user.id)
        .gte('paid_at', startDate.toISOString().split('T')[0])
        .lte('paid_at', endDate.toISOString().split('T')[0])
        .order('paid_at', { ascending: true })

    if (!payments) return []

    // Group by month
    const grouped = payments.reduce((acc, payment) => {
        const date = new Date(payment.paid_at)
        // Use full month name + year if needed, but for now stick to previous format or smart format
        // Let's use "MMM" format.
        const key = date.toLocaleDateString('es-AR', { month: 'short' })
        const monthName = key.charAt(0).toUpperCase() + key.slice(1)

        // We might want to include year if the range spans multiple years, 
        // but for simplicity in current UI request (Trimestral/Semestral/Anual), month name is usually enough unique identifier 
        // UNLESS it's a very long range. Let's stick to simple month buckets for now.
        // Actually, for correct sorting and display in a custom range, we should map them properly.

        // Let's create a "YYYY-MM" key for sorting/grouping first
        const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        if (!acc[sortKey]) {
            acc[sortKey] = { amount: 0, label: monthName }
        }
        acc[sortKey].amount += payment.amount
        return acc
    }, {} as Record<string, { amount: number, label: string }>)

    // Generate all months in range to fill gaps with 0
    const result: IncomeData[] = []
    const current = new Date(startDate)

    // Normalize to start of month to avoid skipping via day mismatch
    // But wait, user might select custom days (01/07 to 28/12). 
    // We should iterate month by month from start to end.
    const loopDate = new Date(current.getFullYear(), current.getMonth(), 1)
    const endLoopDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1)

    while (loopDate <= endLoopDate) {
        const sortKey = `${loopDate.getFullYear()}-${String(loopDate.getMonth() + 1).padStart(2, '0')}`
        const key = loopDate.toLocaleDateString('es-AR', { month: 'short' })
        const monthName = key.charAt(0).toUpperCase() + key.slice(1)

        result.push({
            month: monthName,
            amount: grouped[sortKey]?.amount || 0
        })

        loopDate.setMonth(loopDate.getMonth() + 1)
    }

    return result
}

export async function getUpcomingPayments(): Promise<ClientDue[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const sevenDaysLater = new Date()
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
    const sevenDaysLaterStr = sevenDaysLater.toISOString().split('T')[0]

    const { data: clients } = await supabase
        .from('clients')
        .select(`
            id, 
            full_name,
            avatar_url,
            next_due_date, 
            price_monthly,
            payment_status,
            plan:plans(name)
        `)
        .eq('trainer_id', user.id)
        .in('payment_status', ['pending', 'overdue'])
        .lte('next_due_date', sevenDaysLaterStr) // Due in next 7 days or overdue
        .order('next_due_date', { ascending: true })
        .limit(10)

    if (!clients) return []

    return clients.map(client => {
        // Handle potential array or object for plan relation
        const planData = Array.isArray(client.plan) ? client.plan[0] : client.plan
        const planName = planData?.name || 'Plan Personalizado'

        return {
            id: client.id,
            full_name: client.full_name,
            avatar_url: client.avatar_url || null,
            plan_name: planName,
            next_due_date: client.next_due_date,
            price_monthly: client.price_monthly || 0,
            status: client.payment_status as 'pending' | 'overdue'
        }
    })
}

export async function getPendingCheckins(): Promise<CheckinDue[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const todayStr = getTodayString()

    const { data: clients } = await supabase
        .from('clients')
        .select(`
            id, 
            full_name,
            avatar_url,
            next_checkin_date
        `)
        .eq('trainer_id', user.id)
        .eq('status', 'active')
        .lte('next_checkin_date', todayStr)
        .order('next_checkin_date', { ascending: true })
        .limit(10)

    if (!clients) return []

    return clients.map(client => {
        // Calculate status based on date
        const checkinDate = new Date(client.next_checkin_date)
        const today = new Date()
        checkinDate.setHours(0, 0, 0, 0)
        today.setHours(0, 0, 0, 0)

        // If checkin date is before today, it's overdue (atrasado)
        // If checkin date is today, it's pending (pendiente hoy)
        const status = checkinDate < today ? 'overdue' : 'pending'

        return {
            id: client.id,
            full_name: client.full_name,
            avatar_url: client.avatar_url || null,
            next_checkin_date: client.next_checkin_date,
            status: status
        }
    })
}

export interface PresentialTraining {
    id: string
    clientName: string
    clientAvatar: string | null
    workoutName: string
    clientPhone: string | null
    startTime: string | null
    messageTemplate: string
}

export async function getTodayPresentialTrainings(): Promise<PresentialTraining[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const today = new Date()
    // Helper to get day name in 'Lunes', 'Martes' format
    const dayName = today.toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'America/Argentina/Buenos_Aires' })
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1)
    const todayStr = getTodayString()

    interface PresentialWorkoutRow {
        id: string
        name: string | null
        start_time: string | null
        client: {
            full_name: string | null
            avatar_url: string | null
            phone: string | null
        }[] | null
    }

    const { data } = await supabase
        .from('assigned_workouts')
        .select(`
            id,
            name,
            start_time,
            client:clients(full_name, avatar_url, phone)
        `)
        .eq('trainer_id', user.id)
        .eq('is_presential', true)
        .gte('valid_until', todayStr)
        .contains('scheduled_days', [capitalizedDay])

    if (!data) return []

    // Fetch trainer's whatsapp template
    const { data: trainerProfile } = await supabase
        .from('profiles')
        .select('whatsapp_message_template')
        .eq('id', user.id)
        .single()

    const messageTemplate = trainerProfile?.whatsapp_message_template || 'Hola {nombre}, recuerda que tenemos entrenamiento {hora}'

    const rows = data as PresentialWorkoutRow[]

    return rows.map((item) => {
        const client = Array.isArray(item.client) ? item.client[0] : null

        return {
        id: item.id,
        clientName: client?.full_name || 'Cliente',
        clientAvatar: client?.avatar_url || null,
        workoutName: item.name || 'Entrenamiento',
        clientPhone: client?.phone || null,
        startTime: item.start_time || null,
        messageTemplate
        }
    })
}
