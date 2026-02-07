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

        // 3. Send Supabase Auth Invite (Magic Link)
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://orbit-fit.vercel.app'
        // Remove query params to avoid encoding issues commonly seen with Magic Links
        const redirectUrl = `${baseUrl}/auth/callback`

        // Get coach name from profiles or user metadata
        const coachName = user.user_metadata?.full_name || 'Tu coach'

        console.log('Sending invite with redirect URL:', redirectUrl)

        const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
            redirectTo: redirectUrl,
            data: {
                full_name: fullName,
                trainer_name: coachName,
                role: 'client' // Optional meta
            }
        })

        let userId: string | null = null

        if (inviteError) {
            // Handle "Already Registered" case
            if (inviteError.message.includes('already been registered')) {
                console.log('User already exists, sending magic link instead.')

                // Trigger Magic Link for existing user
                // Note: We use the standard client (not admin) to behave like a normal login request
                const { error: otpError } = await supabase.auth.signInWithOtp({
                    email,
                    options: { emailRedirectTo: redirectUrl }
                })

                if (otpError) {
                    console.error('Error sending magic link to existing user:', otpError)
                    return { error: `Error enviando enlace de acceso: ${otpError.message}`, success: false }
                }
                // User ID is unknown right now (without listing all users), 
                // but will be automatically linked by 'auth/callback' on login.
                userId = null
            } else {
                console.error('Invite error:', inviteError)
                return { error: `Error enviando invitación: ${inviteError.message}`, success: false }
            }
        } else {
            userId = inviteData.user.id
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
