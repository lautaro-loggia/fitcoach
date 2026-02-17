'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updateClientAvatar(clientId: string, avatarUrl: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('No autorizado')
    }

    const adminClient = createAdminClient()

    // Verify ownership
    const { data: client, error: fetchError } = await adminClient
        .from('clients')
        .select('user_id')
        .eq('id', clientId)
        .single()

    if (fetchError || !client) {
        throw new Error('Cliente no encontrado')
    }

    if (client.user_id !== user.id) {
        throw new Error('No autorizado: solo podés actualizar tu propio perfil')
    }

    // Update clients table
    const { error: updateClientError } = await adminClient
        .from('clients')
        .update({ avatar_url: avatarUrl })
        .eq('id', clientId)

    if (updateClientError) {
        throw new Error(`Error al actualizar perfil: ${updateClientError.message}`)
    }

    // Update profiles table if it exists
    const { error: updateProfileError } = await adminClient
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id)

    if (updateProfileError) {
        console.error('Failed to update profiles table:', updateProfileError)
        // We don't throw here to avoid blocking client update if profile update fails
    }

    revalidatePath('/dashboard/profile')
    return { success: true }
}
