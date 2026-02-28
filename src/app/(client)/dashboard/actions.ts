'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function touchClientPresence() {
    const supabase = await createClient()
    const {
        data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'No autorizado' }
    }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
        .from('clients')
        .update({
            last_app_opened_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

    if (error) {
        console.error('touchClientPresence error:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}
