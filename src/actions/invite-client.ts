'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function inviteClient(prevState: any, formData: FormData) {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // 1. Verify Coach Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: 'Unauthorized', success: false }
    }

    const email = formData.get('email') as string
    const fullName = formData.get('fullName') as string

    if (!email || !fullName) {
        return { error: 'Missing fields', success: false }
    }

    try {
        // 2. Check for existing client (Enforce 1-Client-1-Coach policy)
        // We check via Admin to see if this email is already assigned to ANY coach
        const { data: existingClients, error: searchError } = await adminSupabase
            .from('clients')
            .select('id, trainer_id, status')
            .eq('email', email)

        if (searchError) {
            console.error('Error searching client:', searchError)
            return { error: 'Database error checking client', success: false }
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

        console.log('Sending invite with redirect URL:', redirectUrl)

        const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
            redirectTo: redirectUrl,
            data: {
                full_name: fullName,
                role: 'client' // Optional meta
            }
        })

        if (inviteError) {
            // If user checks fail (e.g. already registered), we might need to just send a magic link?
            // inviteUserByEmail usually creates a new user. If user exists, we should use generateLink?
            // For MVP we assume new user or strict invite.
            console.error('Invite error:', inviteError)
            return { error: `Error enviando invitación: ${inviteError.message}`, success: false }
        }

        // 4. Create or Update Client Record in DB
        // We use the admin client to bypass the "Clients can't insert" policy if any, 
        // though the coach could insert via RLS if we set it up. 
        // Using admin guarantees we write the status/email correctly.
        const { error: dbError } = await adminSupabase
            .from('clients')
            .upsert({
                trainer_id: user.id,
                email: email,
                full_name: fullName,
                onboarding_status: 'invited',
                status: 'active', // Operational status
                user_id: inviteData.user.id // Link immediately since we created the user!
            }, { onConflict: 'email' })

        if (dbError) {
            console.error('DB Error upserting client:', dbError)
            return { msg: 'Invitación enviada, pero hubo error guardando en base de datos.', success: false } // Suspicious state
        }

        revalidatePath('/dashboard/clients')
        return { success: true, message: 'Invitación enviada correctamente' }

    } catch (err) {
        console.error('Unexpected error:', err)
        return { error: 'Error inesperado', success: false }
    }
}
