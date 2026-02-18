'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function inviteClient(prevState: any, formData: FormData) {
    try {
        const supabase = await createClient()

        // This might throw if SUPABASE_SERVICE_ROLE_KEY is missing
        const adminSupabase = createAdminClient()

        // 1. Verify Coach Authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { error: 'No autorizado - Intenta iniciar sesión nuevamente', success: false }
        }

        const email = formData.get('email') as string
        const fullName = formData.get('fullName') as string
        const phone = formData.get('phone') as string

        if (!email || !fullName) {
            return { error: 'Faltan campos requeridos', success: false }
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

        let { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email, inviteOptions)

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
        const clientData = {
            trainer_id: user.id,
            email: email,
            full_name: fullName,
            phone: phone || null,
            onboarding_status: 'invited',
            status: 'active', // Operational status
            user_id: userId // Link immediately or defer check on callback
        }

        let dbError

        if (existingClients && existingClients.length > 0) {
            // Update existing
            const { error } = await adminSupabase
                .from('clients')
                .update(clientData)
                .eq('id', existingClients[0].id)
            dbError = error
        } else {
            // Insert new
            const { error } = await adminSupabase
                .from('clients')
                .insert(clientData)
            dbError = error
        }

        if (dbError) {
            console.error('DB Error upserting client:', dbError)
            return { msg: 'Invitación enviada, pero hubo error guardando en base de datos.', success: false }
        }
        revalidatePath('/dashboard/clients')
        return { success: true, message: 'Invitación enviada correctamente' }

    } catch (err: any) {
        console.error('Unexpected error in inviteClient:', err)
        // Check for specific Supabase Env error
        if (err.message && (err.message.includes('supabaseKey is required') || err.message.includes('service_role'))) {
            return { error: 'Error de configuración del servidor: Falta Service Role Key', success: false }
        }
        return { error: `Error inesperado: ${err.message || 'Desconocido'}`, success: false }
    }
}
