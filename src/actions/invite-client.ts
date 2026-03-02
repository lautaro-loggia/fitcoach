'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calculateNextDueDate, calculatePaymentStatus } from '@/lib/payments/payment-cycle'

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
        const firstDueDate = ((formData.get('firstDueDate') as string) || '').trim()
        const paymentMethodRaw = ((formData.get('paymentMethod') as string) || 'bank_transfer').trim()
        const paymentAmount = Number(paymentAmountRaw)

        const validMethods = new Set(['cash', 'bank_transfer', 'mercado_pago', 'other'])
        const paymentMethod = validMethods.has(paymentMethodRaw) ? paymentMethodRaw : 'other'

        if (!email || !fullName) {
            return { error: 'Faltan campos requeridos', success: false }
        }
        if (!paymentAmountRaw || Number.isNaN(paymentAmount) || paymentAmount <= 0) {
            return { error: 'El monto inicial debe ser mayor a 0', success: false }
        }
        if (paymentSetup === 'paid' && !paidAt) {
            return { error: 'La fecha de pago inicial es obligatoria', success: false }
        }
        if (paymentSetup === 'pending' && !firstDueDate) {
            return { error: 'El primer vencimiento es obligatorio', success: false }
        }

        // 2. Check for existing client (Enforce 1-Client-1-Coach policy)
        // We check via Admin to see if this email is already assigned to ANY coach
        const { data: existingClients, error: searchError } = await adminSupabase
            .from('clients')
            .select('id, trainer_id, status')
            .eq('email', email)

        if (searchError) {
            console.error('Error searching client:', searchError)
            return { error: 'Error verificando existencia del cliente', success: false }
        }

        if (existingClients && existingClients.length > 0) {
            const existing = existingClients[0]
            if (existing.trainer_id !== user.id) {
                // Client exists with ANOTHER coach
                return { error: 'Este email ya está registrado con otro entrenador.', success: false }
            }
            // Client exists with THIS coach -> Allow Re-invite logic (update name? currently just invite)
        }
        const existingClientId = existingClients?.[0]?.id ?? null
        const isReinvite = Boolean(existingClientId)

        // 3. Send Supabase Auth Invite
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://orbit-fit.vercel.app'
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
            status: 'active', // Operational status
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
                clientData.plan_id = planId
                clientData.billing_frequency = billingFrequency
                clientData.price_monthly = paymentAmount
                clientData.last_paid_at = null
                clientData.next_due_date = firstDueDate
                clientData.payment_status = calculatePaymentStatus(firstDueDate)
            }
        }

        let dbError
        let targetClientId = existingClientId

        if (isReinvite && existingClientId) {
            // Update existing
            const { data: updatedClient, error } = await adminSupabase
                .from('clients')
                .update(clientData)
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
                ? 'Invitación reenviada correctamente'
                : 'Invitación enviada y estado de pago inicial registrado'
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
