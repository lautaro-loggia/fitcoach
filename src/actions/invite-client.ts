'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { calculateNextDueDate, calculatePaymentStatus } from '@/lib/payments/payment-cycle'

const MAX_ACTIVE_CLIENTS_PER_TRAINER = 15

async function resolveBaseUrl() {
    const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim()
    if (envBaseUrl) return envBaseUrl.replace(/\/+$/, '')

    const headersList = await headers()
    const origin = headersList.get('origin')?.trim()
    if (origin) return origin.replace(/\/+$/, '')

    const host = headersList.get('x-forwarded-host') || headersList.get('host')
    if (host) {
        const proto = headersList.get('x-forwarded-proto') || 'https'
        return `${proto}://${host}`.replace(/\/+$/, '')
    }

    return 'https://orbit-fit.vercel.app'
}

export async function inviteClient(_prevState: unknown, formData: FormData) {
    try {
        const supabase = await createClient()

        // This might throw if SUPABASE_SERVICE_ROLE_KEY is missing
        const adminSupabase = createAdminClient()

        // 1. Verify Coach Authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { error: 'No autorizado - Intenta iniciar sesión nuevamente', success: false }
        }

        const email = ((formData.get('email') as string) || '').trim().toLowerCase()
        const fullName = ((formData.get('fullName') as string) || '').trim()
        const phone = ((formData.get('phone') as string) || '').trim()
        const paymentSetupRaw = (formData.get('paymentSetup') as string) || 'pending'
        const paymentSetup = paymentSetupRaw === 'paid' ? 'paid' : 'pending'
        const planId = ((formData.get('planId') as string) || '').trim() || null
        const paymentAmountRaw = ((formData.get('paymentAmount') as string) || '').trim()
        const paidAt = ((formData.get('paidAt') as string) || '').trim()
        const paymentMethodRaw = ((formData.get('paymentMethod') as string) || 'bank_transfer').trim()
        const paymentAmount = Number(paymentAmountRaw)

        const validMethods = new Set(['cash', 'bank_transfer', 'mercado_pago', 'other'])
        const paymentMethod = validMethods.has(paymentMethodRaw) ? paymentMethodRaw : 'other'

        if (!email || !fullName) {
            return { error: 'Faltan campos requeridos', success: false }
        }
        if (paymentSetup === 'paid') {
            if (!paymentAmountRaw || Number.isNaN(paymentAmount) || paymentAmount <= 0) {
                return { error: 'El monto inicial debe ser mayor a 0', success: false }
            }
            if (!paidAt) {
                return { error: 'La fecha de pago inicial es obligatoria', success: false }
            }
        }

        // 2. Check for existing client (Enforce 1-Client-1-Coach policy)
        // Buscamos incluyendo soft-deleted para detectar re-invitaciones de asesorados eliminados.
        const { data: existingClients, error: searchError } = await adminSupabase
            .from('clients')
            .select('id, trainer_id, status, deleted_at')
            .eq('email', email)

        if (searchError) {
            console.error('Error searching client:', searchError)
            return { error: 'Error verificando existencia del cliente', success: false }
        }

        if (existingClients && existingClients.length > 0) {
            const existing = existingClients[0]
            const isSoftDeleted = Boolean(existing.deleted_at)

            if (existing.trainer_id !== user.id) {
                if (isSoftDeleted) {
                    // Fue eliminado de este coach y ahora otro quiere invitar al mismo email.
                    // Bloqueamos solo si hay un registro activo (no deleted) con otro coach.
                    const activeWithOtherCoach = existingClients.find(
                        c => !c.deleted_at && c.trainer_id !== user.id
                    )
                    if (activeWithOtherCoach) {
                        return { error: 'Este email ya está registrado con otro entrenador.', success: false }
                    }
                    // Si el único registro es de otro coach pero soft-deleted, permitimos la re-invitación
                } else {
                    // Client exists with ANOTHER coach (activo)
                    return { error: 'Este email ya está registrado con otro entrenador.', success: false }
                }
            }
            // Client exists with THIS coach (active or soft-deleted) -> Re-invite logic
        }

        // Encontrar el registro de este coach (activo o soft-deleted)
        const existingClient = existingClients?.find(c => c.trainer_id === user.id) ?? null
        const existingClientId = existingClient?.id ?? null
        const isReinvite = Boolean(existingClientId)
        const wasSoftDeleted = Boolean(existingClient?.deleted_at)
        const requiresActiveSlot = !isReinvite || wasSoftDeleted

        if (requiresActiveSlot) {
            const { count: activeClientsCount, error: activeClientsCountError } = await adminSupabase
                .from('clients')
                .select('id', { count: 'exact', head: true })
                .eq('trainer_id', user.id)
                .is('deleted_at', null)

            if (activeClientsCountError) {
                console.error('Error counting active clients:', activeClientsCountError)
                return { error: 'No se pudo validar el cupo de asesorados activos', success: false }
            }

            if ((activeClientsCount ?? 0) >= MAX_ACTIVE_CLIENTS_PER_TRAINER) {
                return {
                    error: `Alcanzaste el límite de ${MAX_ACTIVE_CLIENTS_PER_TRAINER} asesorados activos. Eliminá uno para liberar un cupo.`,
                    success: false
                }
            }
        }

        // 3. Send Supabase Auth Invite
        const baseUrl = await resolveBaseUrl()
        const redirectUrl = `${baseUrl}/auth/callback`

        // Get coach name from profiles or user metadata
        const coachName = user.user_metadata?.full_name || 'Tu coach'

        console.log('Sending invite with redirect URL:', redirectUrl)

        const inviteOptions = {
            redirectTo: redirectUrl,
            data: {
                full_name: fullName,
                trainer_name: coachName,
                role: 'client',
                needs_password: true
            }
        }

        const { data: initialInviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email, inviteOptions)
        let inviteData = initialInviteData

        let userId: string | null = null

        if (inviteError) {
            if (inviteError.message.includes('already been registered')) {
                // El usuario ya existe en auth (ej: fue eliminado como cliente pero su auth user quedó).
                // Lo eliminamos de auth y reenviamos la invitación normal.
                console.log('User already exists in auth, deleting and re-inviting...')

                // Buscar el usuario existente por email
                const { data: existingUsers } = await adminSupabase.auth.admin.listUsers()
                const existingAuthUser = existingUsers?.users?.find(u => u.email === email)

                if (existingAuthUser) {
                    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(existingAuthUser.id)
                    if (deleteError) {
                        console.error('Error deleting existing auth user:', deleteError)
                        return { error: `Error preparando re-invitación: ${deleteError.message}`, success: false }
                    }
                    console.log('Existing auth user deleted, re-sending invite...')
                }

                // Reintentar la invitación ahora que el usuario fue eliminado
                const retryResult = await adminSupabase.auth.admin.inviteUserByEmail(email, inviteOptions)

                if (retryResult.error) {
                    console.error('Retry invite error:', retryResult.error)
                    return { error: `Error enviando invitación: ${retryResult.error.message}`, success: false }
                }

                inviteData = retryResult.data
                userId = retryResult.data.user.id
            } else {
                console.error('Invite error:', inviteError)
                return { error: `Error enviando invitación: ${inviteError.message}`, success: false }
            }
        } else {
            userId = inviteData?.user?.id ?? null
        }

        // 4. Create or Update Client Record in DB
        // NOTE: We manually handle Update vs Insert because the 'email' column 
        // effectively requires uniqueness for 'upsert' to work with ON CONFLICT, 
        // but we skipped adding that constraint to the DB.
        const clientData: Record<string, unknown> = {
            trainer_id: user.id,
            email: email,
            full_name: fullName,
            phone: phone || null,
            onboarding_status: 'invited',
            status: 'pending', // Operational status until onboarding is completed
            user_id: userId // Link immediately or defer check on callback
        }

        if (!isReinvite) {
            const billingFrequency = 'monthly'
            if (paymentSetup === 'paid') {
                const nextDueDate = calculateNextDueDate(paidAt, billingFrequency)
                clientData.plan_id = planId
                clientData.billing_frequency = billingFrequency
                clientData.price_monthly = paymentAmount
                clientData.last_paid_at = paidAt
                clientData.next_due_date = nextDueDate
                clientData.payment_status = calculatePaymentStatus(nextDueDate)
            } else {
                clientData.plan_id = null
                clientData.billing_frequency = billingFrequency
                clientData.price_monthly = null
                clientData.last_paid_at = null
                clientData.next_due_date = null
                clientData.payment_status = 'pending'
            }
        }

        let dbError
        let targetClientId = existingClientId

        if (isReinvite && existingClientId) {
            // Update existing (incluye limpiar deleted_at si fue soft-deleted)
            const updatePayload: Record<string, unknown> = {
                ...clientData,
                deleted_at: null,             // Restaurar si estaba soft-deleted
                onboarding_status: 'invited', // Resetear onboarding
            }

            if (wasSoftDeleted) {
                // Si fue eliminado, reseteamos también datos de pago para que el coach los configure de nuevo
                updatePayload.plan_id = planId
                updatePayload.billing_frequency = 'monthly'
                if (paymentSetup === 'paid') {
                    const nextDueDate = calculateNextDueDate(paidAt, 'monthly')
                    updatePayload.price_monthly = paymentAmount
                    updatePayload.last_paid_at = paidAt
                    updatePayload.next_due_date = nextDueDate
                    updatePayload.payment_status = calculatePaymentStatus(nextDueDate)
                } else {
                    updatePayload.price_monthly = null
                    updatePayload.last_paid_at = null
                    updatePayload.next_due_date = null
                    updatePayload.payment_status = 'pending'
                }
            }

            const { data: updatedClient, error } = await adminSupabase
                .from('clients')
                .update(updatePayload)
                .eq('id', existingClientId)
                .select('id')
                .single()
            dbError = error
            targetClientId = updatedClient?.id || existingClientId
        } else {
            // Insert new
            const { data: insertedClient, error } = await adminSupabase
                .from('clients')
                .insert(clientData)
                .select('id')
                .single()
            dbError = error
            targetClientId = insertedClient?.id || null
        }

        if (dbError) {
            console.error('DB Error upserting client:', dbError)

            const dbErrorMessage = typeof dbError.message === 'string' ? dbError.message : ''
            if (dbErrorMessage.includes('active_client_limit_reached')) {
                if (userId) {
                    const { error: rollbackInviteError } = await adminSupabase.auth.admin.deleteUser(userId)
                    if (rollbackInviteError) {
                        console.error('Error rolling back invited auth user after active limit hit:', rollbackInviteError)
                    }
                }
                return {
                    error: `Alcanzaste el límite de ${MAX_ACTIVE_CLIENTS_PER_TRAINER} asesorados activos. Eliminá uno para liberar un cupo.`,
                    success: false
                }
            }

            return { error: 'Invitación enviada, pero hubo error guardando en base de datos.', success: false }
        }

        if (!targetClientId) {
            return { error: 'No se pudo identificar el asesorado creado para inicializar pagos', success: false }
        }

        let warning: string | null = null

        if (!isReinvite && paymentSetup === 'paid') {
            const { error: paymentInsertError } = await adminSupabase
                .from('payments')
                .insert({
                    trainer_id: user.id,
                    client_id: targetClientId,
                    paid_at: paidAt,
                    amount: paymentAmount,
                    method: paymentMethod,
                    note: 'Pago inicial registrado durante la invitación'
                })

            if (paymentInsertError) {
                console.error('Error creating initial payment on invite:', paymentInsertError)
                warning = 'La invitación se envió, pero el pago inicial no se pudo registrar automáticamente.'
            }
        }

        revalidatePath('/dashboard/clients')
        revalidatePath('/clients')
        revalidatePath('/pagos')

        return {
            success: true,
            warning,
            message: isReinvite
                ? wasSoftDeleted
                    ? 'Asesorado reactivado e invitación enviada correctamente'
                    : 'Invitación reenviada correctamente'
                : paymentSetup === 'paid'
                    ? 'Invitación enviada y pago inicial registrado'
                    : 'Invitación enviada correctamente'
        }

    } catch (err: unknown) {
        console.error('Unexpected error in inviteClient:', err)
        const errorMessage = err instanceof Error ? err.message : 'Desconocido'
        // Check for specific Supabase Env error
        if (errorMessage.includes('supabaseKey is required') || errorMessage.includes('service_role')) {
            return { error: 'Error de configuración del servidor: Falta Service Role Key', success: false }
        }
        return { error: `Error inesperado: ${errorMessage}`, success: false }
    }
}
