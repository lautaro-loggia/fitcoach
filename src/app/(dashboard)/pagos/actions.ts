'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ClientWithPayment {
    id: string
    full_name: string
    email: string | null
    plan_name: string | null
    price_monthly: number | null
    billing_frequency: string
    payment_status: string
    next_due_date: string | null
    last_paid_at: string | null
    plan_id: string | null
    plan: {
        name: string
        price_monthly: number
    } | null
    status: string
}

export interface Payment {
    id: string
    client_id: string
    paid_at: string
    amount: number
    method: string
    note: string | null
    created_at: string
}

export interface PaymentStats {
    activeClients: number
    paidClients: number
    pendingClients: number
    overdueClients: number
    paidMonthlyIncome: number
}

// Get all clients with payment info
export async function getClientsWithPayments() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
        .from('clients')
        .select(`
            *,
            plan:plans(name, price_monthly)
        `)
        .eq('trainer_id', user.id)
        .is('deleted_at', null)
        .order('full_name')

    if (error) throw error
    return data as ClientWithPayment[]
}

// OPTIMIZED: Get all payment data in a single call
export async function getAllPaymentData() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Single query to get all clients with plans
    const { data: clients, error } = await supabase
        .from('clients')
        .select(`
            *,
            plan:plans(*)
        `)
        .eq('trainer_id', user.id)
        .is('deleted_at', null)
        .order('full_name')

    if (error) throw error

    const clientsWithPayments = clients as ClientWithPayment[]

    // Calculate stats from the same data
    const activeClients = clients?.filter(c => c.status === 'active').length || 0
    const paidClients = clients?.filter(c => c.payment_status === 'paid').length || 0
    const pendingClients = clients?.filter(c => c.payment_status === 'pending').length || 0
    const overdueClients = clients?.filter(c => c.payment_status === 'overdue').length || 0
    const paidMonthlyIncome = clients
        ?.filter(c => c.payment_status === 'paid')
        .reduce((sum, c) => sum + (c.price_monthly || 0), 0) || 0

    const stats: PaymentStats = {
        activeClients,
        paidClients,
        pendingClients,
        overdueClients,
        paidMonthlyIncome
    }

    return {
        clients: clientsWithPayments,
        stats
    }
}

// Get payment statistics
export async function getPaymentStats(): Promise<PaymentStats> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .eq('trainer_id', user.id)
        .is('deleted_at', null)

    if (error) throw error

    const activeClients = clients?.filter(c => c.status === 'active').length || 0
    const paidClients = clients?.filter(c => c.payment_status === 'paid').length || 0
    const pendingClients = clients?.filter(c => c.payment_status === 'pending').length || 0
    const overdueClients = clients?.filter(c => c.payment_status === 'overdue').length || 0

    const paidMonthlyIncome = clients
        ?.filter(c => c.payment_status === 'paid')
        .reduce((sum, c) => sum + (c.price_monthly || 0), 0) || 0

    return {
        activeClients,
        paidClients,
        pendingClients,
        overdueClients,
        paidMonthlyIncome
    }
}

// Register a new payment
export async function registerPayment(data: {
    clientId: string
    paidAt: string
    amount: number
    method: string
    note?: string
    planId?: string
}) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'No estás autenticado' }

        // Insert payment
        const { error: paymentError } = await supabase
            .from('payments')
            .insert({
                trainer_id: user.id,
                client_id: data.clientId,
                paid_at: data.paidAt,
                amount: data.amount,
                method: data.method,
                note: data.note || null
            })

        if (paymentError) {
            console.error('Payment insert error:', paymentError)
            return { error: `Error al insertar pago: ${paymentError.message}` }
        }

        // Get client to calculate next due date
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('billing_frequency')
            .eq('id', data.clientId)
            .single()

        if (clientError) {
            console.error('Client fetch error:', clientError)
            return { error: `Error al obtener cliente: ${clientError.message}` }
        }

        // Calculate next due date
        // Parse date as local time to avoid timezone issues
        const [year, month, day] = data.paidAt.split('-').map(Number)
        const paidDate = new Date(year, month - 1, day)
        let nextDueDate: Date

        switch (client.billing_frequency) {
            case 'weekly':
                nextDueDate = new Date(paidDate)
                nextDueDate.setDate(paidDate.getDate() + 7)
                break
            case 'monthly':
            default:
                nextDueDate = new Date(paidDate)
                nextDueDate.setMonth(paidDate.getMonth() + 1)
                break
        }

        // Update client
        const { error: updateError } = await supabase
            .from('clients')
            .update({
                last_paid_at: data.paidAt,
                next_due_date: `${nextDueDate.getFullYear()}-${String(nextDueDate.getMonth() + 1).padStart(2, '0')}-${String(nextDueDate.getDate()).padStart(2, '0')}`,
                payment_status: 'paid',
                plan_id: data.planId || null,
                price_monthly: data.amount
            })
            .eq('id', data.clientId)

        if (updateError) {
            console.error('Client update error:', updateError)
            return { error: `Error al actualizar cliente: ${updateError.message}` }
        }

        revalidatePath('/pagos')
        return { success: true }
    } catch (error) {
        console.error('Unexpected error in registerPayment:', error)
        return { error: 'Error inesperado al registrar el pago' }
    }
}

// Get payments for a client
export async function getClientPayments(clientId: string): Promise<Payment[]> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('client_id', clientId)
        .eq('trainer_id', user.id)
        .order('paid_at', { ascending: false })

    if (error) throw error
    return data as Payment[]
}

// Update payment statuses based on due dates
export async function updatePaymentStatuses() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get all clients to update their statuses
    const { data: clients, error } = await supabase
        .from('clients')
        .select('id, next_due_date, payment_status')
        .eq('trainer_id', user.id)
        .is('deleted_at', null)

    if (error || !clients) return

    const today = new Date()
    const PENDING_DAYS_THRESHOLD = 7

    // Update each client's status based on their due date
    for (const client of clients) {
        if (!client.next_due_date) continue

        const dueDate = new Date(client.next_due_date)
        const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        let newStatus: string

        if (daysUntilDue < 0) {
            // Vencido
            newStatus = 'overdue'
        } else if (daysUntilDue <= PENDING_DAYS_THRESHOLD) {
            // Pendiente (vence en 7 días o menos)
            newStatus = 'pending'
        } else {
            // Pagado (vence en más de 7 días)
            newStatus = 'paid'
        }

        // Solo actualizar si el estado cambió
        if (client.payment_status !== newStatus) {
            await supabase
                .from('clients')
                .update({ payment_status: newStatus })
                .eq('id', client.id)
        }
    }

    revalidatePath('/pagos')
}

// Send payment reminder (placeholder)
export async function sendPaymentReminder(clientId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get client details
    const { data: client } = await supabase
        .from('clients')
        .select('full_name, email')
        .eq('id', clientId)
        .single()

    // Log reminder (in production, this would send an actual email/notification)
    console.log(`[REMINDER] Sending payment reminder to ${client?.full_name} (${client?.email})`)

    return { success: true, message: `Recordatorio enviado a ${client?.full_name}` }
}

// Send bulk reminders
export async function sendBulkReminders(clientIds: string[]) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    let successCount = 0

    for (const clientId of clientIds) {
        try {
            await sendPaymentReminder(clientId)
            successCount++
        } catch (error) {
            console.error(`Failed to send reminder to client ${clientId}:`, error)
        }
    }

    return {
        success: true,
        message: `Recordatorios enviados a ${successCount} de ${clientIds.length} clientes`
    }
}

// ==================== PLAN ACTIONS ====================

export interface Plan {
    id: string
    trainer_id: string
    name: string
    price_monthly: number
    description: string | null
    created_at: string
    updated_at: string
}

// Get all plans for the authenticated trainer
export async function getPlans(): Promise<Plan[]> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data as Plan[]
}

// Create a new plan
export async function createPlan(plan: {
    name: string
    price_monthly: number
    description?: string
}) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'No estás autenticado' }

        const { error } = await supabase
            .from('plans')
            .insert({
                trainer_id: user.id,
                name: plan.name,
                price_monthly: plan.price_monthly,
                description: plan.description || null
            })

        if (error) {
            console.error('Create plan error:', error)
            return { error: `Error al crear el plan: ${error.message}` }
        }

        revalidatePath('/pagos')
        return { success: true }
    } catch (error) {
        console.error('Create plan error:', error)
        return { error: 'No se pudo crear el plan' }
    }
}

// Update an existing plan
export async function updatePlan(planId: string, updates: {
    name?: string
    price_monthly?: number
    description?: string
}) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'No estás autenticado' }

        const { error } = await supabase
            .from('plans')
            .update(updates)
            .eq('id', planId)
            .eq('trainer_id', user.id)

        if (error) {
            console.error('Update plan error:', error)
            return { error: `Error al actualizar el plan: ${error.message}` }
        }

        revalidatePath('/pagos')
        return { success: true }
    } catch (error) {
        console.error('Update plan error:', error)
        return { error: 'No se pudo actualizar el plan' }
    }
}

// Delete a plan
export async function deletePlan(planId: string) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'No estás autenticado' }

        // Check if any clients are using this plan
        const { data: clients, error: checkError } = await supabase
            .from('clients')
            .select('id')
            .eq('plan_id', planId)
            .limit(1)

        if (checkError) {
            console.error('Check clients error:', checkError)
            return { error: 'Error al verificar clientes asociados' }
        }

        if (clients && clients.length > 0) {
            return { error: 'No se puede eliminar un plan que tiene clientes asignados' }
        }

        const { error } = await supabase
            .from('plans')
            .delete()
            .eq('id', planId)
            .eq('trainer_id', user.id)

        if (error) {
            console.error('Delete plan error:', error)
            return { error: `Error al eliminar el plan: ${error.message}` }
        }

        revalidatePath('/pagos')
        return { success: true }
    } catch (error) {
        console.error('Delete plan error:', error)
        return { error: 'No se pudo eliminar el plan' }
    }
}

// Get client count for a plan
export async function getClientCountByPlan(planId: string): Promise<number> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { count, error } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('plan_id', planId)
        .eq('trainer_id', user.id)
        .is('deleted_at', null)

    if (error) throw error
    return count || 0
}
