'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/lib/notifications'
import { dateOnlyToLocalNoon, formatDateInART, getTodayString } from '@/lib/utils'
import { calculateNextDueDate, calculatePaymentStatus } from '@/lib/payments/payment-cycle'

export interface ClientWithPayment {
    id: string
    full_name: string
    email: string | null
    phone: string | null
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

async function syncClientPaymentState(
    supabase: Awaited<ReturnType<typeof createClient>>,
    clientId: string,
    trainerId: string
) {
    const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('billing_frequency')
        .eq('id', clientId)
        .eq('trainer_id', trainerId)
        .single()

    if (clientError) {
        throw clientError
    }

    const { data: latestPayment, error: paymentError } = await supabase
        .from('payments')
        .select('paid_at, amount, created_at')
        .eq('client_id', clientId)
        .eq('trainer_id', trainerId)
        .order('paid_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (paymentError) {
        throw paymentError
    }

    if (!latestPayment) {
        const { error: clearError } = await supabase
            .from('clients')
            .update({
                last_paid_at: null,
                next_due_date: null,
                payment_status: 'pending'
            })
            .eq('id', clientId)
            .eq('trainer_id', trainerId)

        if (clearError) {
            throw clearError
        }

        return
    }

    const nextDueDate = calculateNextDueDate(latestPayment.paid_at, client.billing_frequency)
    const paymentStatus = calculatePaymentStatus(nextDueDate)

    const { error: updateError } = await supabase
        .from('clients')
        .update({
            last_paid_at: latestPayment.paid_at,
            next_due_date: nextDueDate,
            payment_status: paymentStatus,
            price_monthly: latestPayment.amount
        })
        .eq('id', clientId)
        .eq('trainer_id', trainerId)

    if (updateError) {
        throw updateError
    }
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

        // Update selected plan (can be null for "Personalizado")
        const { error: planUpdateError } = await supabase
            .from('clients')
            .update({
                plan_id: data.planId || null,
            })
            .eq('id', data.clientId)
            .eq('trainer_id', user.id)

        if (planUpdateError) {
            console.error('Client plan update error:', planUpdateError)
            return { error: `Error al actualizar plan del cliente: ${planUpdateError.message}` }
        }

        await syncClientPaymentState(supabase, data.clientId, user.id)

        revalidatePath('/pagos')
        revalidatePath('/')
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

    // Update each client's status based on their due date
    for (const client of clients) {
        const newStatus = calculatePaymentStatus(client.next_due_date)

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

// Send payment reminder
export async function sendPaymentReminder(clientId: string) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'No estás autenticado' }

        const { data: client, error } = await supabase
            .from('clients')
            .select('full_name, user_id, payment_status, next_due_date')
            .eq('id', clientId)
            .eq('trainer_id', user.id)
            .single()

        if (error || !client) {
            return { error: 'No se encontró el asesorado' }
        }

        if (!client.user_id) {
            return { error: 'El asesorado no tiene usuario vinculado para notificar' }
        }

        const firstName = client.full_name?.split(' ')[0] || 'tu'
        const dueDateLabel = client.next_due_date
            ? dateOnlyToLocalNoon(client.next_due_date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
            : null

        const isOverdue = client.payment_status === 'overdue'
        const title = isOverdue ? 'Pago vencido' : 'Recordatorio de pago'
        const body = isOverdue
            ? `Hola ${firstName}, tenés un pago vencido${dueDateLabel ? ` (vencía el ${dueDateLabel})` : ''}.`
            : `Hola ${firstName}, te recordamos tu próximo vencimiento${dueDateLabel ? ` (${dueDateLabel})` : ''}.`

        await createNotification({
            userId: client.user_id,
            type: 'payment_registered',
            title,
            body,
            data: {
                url: '/dashboard'
            }
        })

        return { success: true, message: `Recordatorio enviado a ${client.full_name}` }
    } catch (error) {
        console.error('sendPaymentReminder error:', error)
        return { error: 'No se pudo enviar el recordatorio' }
    }
}

// Send bulk reminders
export async function sendBulkReminders(clientIds: string[]) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'No estás autenticado' }

        let sent = 0
        let failed = 0

        for (const clientId of clientIds) {
            const result = await sendPaymentReminder(clientId)
            if (result?.success) {
                sent += 1
            } else {
                failed += 1
            }
        }

        return { success: true, sent, failed, message: `Recordatorios enviados a ${sent} de ${clientIds.length} asesorados` }
    } catch (error) {
        console.error('sendBulkReminders error:', error)
        return { error: 'No se pudieron enviar los recordatorios masivos' }
    }
}

// ==================== PLAN ACTIONS ====================

export interface Plan {
    id: string
    trainer_id: string
    name: string
    price_monthly: number
    description: string | null
    routine_frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biannual' | null
    calls_frequency: 'none' | 'monthly' | 'weekly' | null
    includes_nutrition: boolean
    includes_presential: boolean
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
    routine_frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biannual'
    calls_frequency: 'none' | 'monthly' | 'weekly'
    includes_nutrition: boolean
    includes_presential: boolean
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
                description: plan.description || null,
                routine_frequency: plan.routine_frequency,
                calls_frequency: plan.calls_frequency,
                includes_nutrition: plan.includes_nutrition,
                includes_presential: plan.includes_presential
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
    routine_frequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biannual'
    calls_frequency?: 'none' | 'monthly' | 'weekly'
    includes_nutrition?: boolean
    includes_presential?: boolean
    notifyClients?: boolean
}) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'No estás autenticado' }

        // Remove notifyClients from updates before sending to DB as it's not a column
        // Destructure to separate notifyClients from the rest of the updates
        const { notifyClients, ...dbUpdates } = updates

        // Update the plan
        const { error } = await supabase
            .from('plans')
            .update(dbUpdates)
            .eq('id', planId)
            .eq('trainer_id', user.id)

        if (error) {
            console.error('Update plan error:', error)
            return { error: `Error al actualizar el plan: ${error.message}` }
        }

        // If price was updated, update all clients with this plan
        if (updates.price_monthly !== undefined) {
            // First get the clients to notify them if needed
            let clientsToNotify: Array<{ id: string; full_name: string | null; email: string | null }> = []

            if (notifyClients) {
                const { data: clients } = await supabase
                    .from('clients')
                    .select('id, full_name, email')
                    .eq('plan_id', planId)
                    .eq('trainer_id', user.id)
                    .is('deleted_at', null)

                clientsToNotify = clients || []
            }

            // Update prices
            const { error: clientsError } = await supabase
                .from('clients')
                .update({ price_monthly: updates.price_monthly })
                .eq('plan_id', planId)
                .eq('trainer_id', user.id)

            if (clientsError) {
                console.error('Error updating clients prices:', clientsError)
            } else if (notifyClients && clientsToNotify.length > 0) {
                // Determine currency format
                const formattedPrice = new Intl.NumberFormat('es-AR', {
                    style: 'currency',
                    currency: 'ARS',
                    minimumFractionDigits: 0
                }).format(updates.price_monthly)

                // Simulate sending emails
                for (const client of clientsToNotify) {
                    if (client.email) {
                        // In a real implementation effectively call an email service here
                        console.log(`[EMAIL SIMULATION] Sending price update email to ${client.email}: "Hola ${client.full_name}, el precio de tu plan ha sido actualizado a ${formattedPrice}."`)
                    }
                }
            }
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

// Change a client's plan
export async function changeClientPlan(data: {
    clientId: string
    planId: string
}) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'No estás autenticado' }

        // Get the plan details
        const { data: plan, error: planError } = await supabase
            .from('plans')
            .select('price_monthly')
            .eq('id', data.planId)
            .eq('trainer_id', user.id)
            .single()

        if (planError) {
            console.error('Plan fetch error:', planError)
            return { error: 'Error al obtener el plan' }
        }

        // Update the client's plan and price
        const { error: updateError } = await supabase
            .from('clients')
            .update({
                plan_id: data.planId,
                price_monthly: plan.price_monthly
            })
            .eq('id', data.clientId)
            .eq('trainer_id', user.id)

        if (updateError) {
            console.error('Client update error:', updateError)
            return { error: `Error al actualizar el cliente: ${updateError.message}` }
        }

        revalidatePath('/pagos')
        return { success: true }
    } catch (error) {
        console.error('Unexpected error in changeClientPlan:', error)
        return { error: 'Error inesperado al cambiar el plan' }
    }
}
// ==================== HISTORY ACTIONS ====================

export interface PaymentWithClient extends Payment {
    client: {
        full_name: string
        plan: {
            name: string
        } | null
    } | null
}

export async function getAllPayments(): Promise<PaymentWithClient[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
        .from('payments')
        .select(`
            *,
            client:clients(
                full_name,
                plan:plans(name)
            )
        `)
        .eq('trainer_id', user.id)
        .order('paid_at', { ascending: false })

    if (error) throw error
    return data as PaymentWithClient[]
}

export async function updatePayment(paymentId: string, data: {
    amount?: number
    method?: string
    note?: string
    paidAt?: string
}) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'Not authenticated' }

        const { data: existingPayment, error: existingPaymentError } = await supabase
            .from('payments')
            .select('client_id')
            .eq('id', paymentId)
            .eq('trainer_id', user.id)
            .single()

        if (existingPaymentError || !existingPayment) {
            return { error: 'Pago no encontrado' }
        }

        const updates: Record<string, unknown> = {}
        if (data.amount !== undefined) updates.amount = data.amount
        if (data.method !== undefined) updates.method = data.method
        if (data.note !== undefined) updates.note = data.note
        if (data.paidAt !== undefined) updates.paid_at = data.paidAt

        const { error } = await supabase
            .from('payments')
            .update(updates)
            .eq('id', paymentId)
            .eq('trainer_id', user.id)

        if (error) {
            console.error('Update payment error:', error)
            return { error: 'Error al actualizar el pago' }
        }

        await syncClientPaymentState(supabase, existingPayment.client_id, user.id)

        revalidatePath('/pagos')
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Update payment error:', error)
        return { error: 'Error inesperado' }
    }
}

export async function deletePayment(paymentId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'Not authenticated' }

        const { data: existingPayment, error: existingPaymentError } = await supabase
            .from('payments')
            .select('client_id')
            .eq('id', paymentId)
            .eq('trainer_id', user.id)
            .single()

        if (existingPaymentError || !existingPayment) {
            return { error: 'Pago no encontrado' }
        }

        const { error } = await supabase
            .from('payments')
            .delete()
            .eq('id', paymentId)
            .eq('trainer_id', user.id)

        if (error) {
            console.error('Delete payment error:', error)
            return { error: 'Error al eliminar el pago' }
        }

        await syncClientPaymentState(supabase, existingPayment.client_id, user.id)

        revalidatePath('/pagos')
        revalidatePath('/') // Update dashboard income stats
        return { success: true }
    } catch (error) {
        console.error('Delete payment error:', error)
        return { error: 'Error inesperado' }
    }
}

export interface IncomeData {
    month: string
    amount: number
}


export async function getIncomeHistory(startDate?: Date, endDate?: Date): Promise<IncomeData[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    // Default to last 6 months if no dates provided
    let fromDateStr: string
    let toDateStr: string

    if (startDate && endDate) {
        fromDateStr = getTodayString(startDate)
        toDateStr = getTodayString(endDate)
    } else {
        const base = new Date()
        base.setMonth(base.getMonth() - 5)
        fromDateStr = `${getTodayString(base).slice(0, 7)}-01`
        toDateStr = getTodayString()
    }

    const { data: payments } = await supabase
        .from('payments')
        .select('amount, paid_at')
        .eq('trainer_id', user.id)
        .gte('paid_at', fromDateStr)
        .lte('paid_at', toDateStr)
        .order('paid_at', { ascending: true })

    if (!payments) return []

    const buckets: { key: string; month: string; amount: number }[] = []
    const [startYearRaw, startMonthRaw] = fromDateStr.split('-')
    const [endYearRaw, endMonthRaw] = toDateStr.split('-')

    let loopYear = Number(startYearRaw)
    let loopMonth = Number(startMonthRaw)
    const endYear = Number(endYearRaw)
    const endMonth = Number(endMonthRaw)

    while (loopYear < endYear || (loopYear === endYear && loopMonth <= endMonth)) {
        const monthLabelRaw = formatDateInART(
            new Date(Date.UTC(loopYear, loopMonth - 1, 15)),
            { month: 'short' }
        )

        buckets.push({
            key: `${loopYear}-${String(loopMonth).padStart(2, '0')}`,
            month: monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1),
            amount: 0
        })

        loopMonth += 1
        if (loopMonth > 12) {
            loopMonth = 1
            loopYear += 1
        }
    }

    payments.forEach(payment => {
        const [year, month] = payment.paid_at.split('-')
        const key = `${year}-${month}`
        const match = buckets.find((bucket) => bucket.key === key)
        if (match) {
            match.amount += Number(payment.amount)
        }
    })

    return buckets.map(b => ({
        month: b.month,
        amount: b.amount
    }))
}
