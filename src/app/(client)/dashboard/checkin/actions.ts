'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createCheckin(data: {
    weight: number
    body_fat?: number
    observations?: string
    // photos?: string[] // Skipping implementation for now
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    const adminSupabase = createAdminClient()

    // 1. Get Client
    const { data: client, error: clientError } = await adminSupabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single()

    if (clientError || !client) {
        return { error: 'Cliente no encontrado' }
    }

    // 2. Create Check-in
    const { error: insertError } = await adminSupabase
        .from('checkins')
        .insert({
            client_id: client.id,
            trainer_id: client.trainer_id,
            date: new Date().toISOString().split('T')[0],
            weight: data.weight,
            body_fat: data.body_fat || null,
            observations: data.observations || null,
            // photos: [] 
        })

    if (insertError) {
        console.error('Checkin Error:', insertError)
        return { error: 'Error al guardar el check-in' }
    }

    // 3. Update Client Current Weight
    await adminSupabase
        .from('clients')
        .update({
            current_weight: data.weight,
            // current_body_fat? No column, maybe `target_fat` is target. 
            updated_at: new Date().toISOString()
        })
        .eq('id', client.id)

    revalidatePath('/dashboard', 'layout')
    return { success: true }
}
