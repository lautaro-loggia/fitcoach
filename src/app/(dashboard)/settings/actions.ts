'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfileWhatsAppTemplate(template: string) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    const safeTemplate = template?.trim()
    if (!safeTemplate) {
        return { error: 'La plantilla no puede estar vacía' }
    }

    if (safeTemplate.length > 500) {
        return { error: 'La plantilla es demasiado larga' }
    }

    const { error } = await supabase
        .from('profiles')
        .update({ whatsapp_message_template: safeTemplate })
        .eq('id', user.id)

    if (error) {
        console.error('Error updating whatsapp template:', error)
        return { error: 'Error al actualizar la plantilla' }
    }

    revalidatePath('/settings')
    return { success: true }
}
