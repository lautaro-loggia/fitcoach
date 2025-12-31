'use server'

import { createClient } from '@/lib/supabase/server'

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

export async function getDashboardStats(): Promise<DashboardStats> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // 1. Active Clients
    const { count: activeClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', user.id)
        .eq('status', 'active')

    // 2. Monthly Income (Paid this month)
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('trainer_id', user.id)
        .gte('paid_at', firstDayOfMonth)

    const monthlyIncome = payments?.reduce((sum, p) => sum + p.amount, 0) || 0

    // 3. Pending Payments Count & Projected Income
    const { data: pendingClients } = await supabase
        .from('clients')
        .select('price_monthly, payment_status')
        .eq('trainer_id', user.id)
        .in('payment_status', ['pending', 'overdue'])

    const pendingPaymentsCount = pendingClients?.length || 0
    const projectedIncome = pendingClients?.reduce((sum, c) => sum + (c.price_monthly || 0), 0) || 0

    // 4. Pending Check-ins Count (Due today or overdue)
    const todayStr = new Date().toISOString().split('T')[0]
    const { count: pendingCheckins } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', user.id)
        .eq('status', 'active')
        .lte('next_checkin_date', todayStr)

    const pendingCheckinsCount = pendingCheckins || 0

    // 5. New Clients This Month
    const { count: newClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', user.id)
        .gte('created_at', firstDayOfMonth)

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
    let endDate = rangeEnd || new Date()

    if (!startDate) {
        startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 5)
        startDate.setDate(1)
    }

    const { data: payments } = await supabase
        .from('payments')
        .select('amount, paid_at')
        .eq('trainer_id', user.id)
        .gte('paid_at', startDate.toISOString())
        .lte('paid_at', endDate.toISOString())
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

    const today = new Date()
    const sevenDaysLater = new Date()
    sevenDaysLater.setDate(today.getDate() + 7)

    const { data: clients } = await supabase
        .from('clients')
        .select(`
            id, 
            full_name, 
            next_due_date, 
            price_monthly,
            payment_status,
            plan:plans(name)
        `)
        .eq('trainer_id', user.id)
        .in('payment_status', ['pending', 'overdue'])
        .lte('next_due_date', sevenDaysLater.toISOString()) // Due in next 7 days or overdue
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
            avatar_url: null,
            plan_name: planName,
            next_due_date: client.next_due_date,
            price_monthly: client.price_monthly || 0,
            status: client.payment_status as 'pending' | 'overdue'
        }
    })
}
