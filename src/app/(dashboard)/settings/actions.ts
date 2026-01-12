'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfileWhatsAppTemplate(userId: string, template: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('profiles')
        .update({ whatsapp_message_template: template })
        .eq('id', userId)

    if (error) {
        console.error('Error updating whatsapp template:', error)
        return { error: 'Error al actualizar la plantilla' }
    }

    revalidatePath('/settings')
    return { success: true }
}
