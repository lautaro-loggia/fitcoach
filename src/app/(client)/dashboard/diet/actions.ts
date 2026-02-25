'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/lib/notifications'
import { consumeRateLimit } from '@/lib/security/rate-limit'

export async function logMeal(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    const file = formData.get('photo') as File
    const mealType = formData.get('mealType') as string
    const clientId = formData.get('clientId') as string

    if (!file) {
        return { error: 'No se recibió ninguna foto' }
    }

    if (!clientId) {
        return { error: 'Cliente inválido' }
    }

    const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('id', clientId)
        .eq('user_id', user.id)
        .maybeSingle()

    if (!client) {
        return { error: 'No autorizado para registrar comida en este cliente' }
    }

    const rate = consumeRateLimit({
        scope: 'meal-log-upload',
        key: user.id,
        maxRequests: 40,
        windowMs: 15 * 60 * 1000,
    })
    if (!rate.allowed) {
        const retryMinutes = Math.max(1, Math.ceil(rate.retryAfterMs / 60000))
        return { error: `Demasiadas cargas en poco tiempo. Reintenta en ${retryMinutes} min.` }
    }

    // 1. Upload to Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${clientId}/${Date.now()}.${fileExt}`

    // Use admin client for storage if public client lacks permissions, 
    // but usually user should upload. Let's try user client first, defaulting to admin if needed?
    // Actually, simple upload:
    const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('meal-logs')
        .upload(fileName, file)

    if (uploadError) {
        console.error('Upload Error:', uploadError)
        return { error: 'Error al subir la imagen' }
    }

    // 2. Insert Log Record
    const adminClient = createAdminClient()
    const { error: dbError } = await adminClient
        .from('meal_logs')
        .insert({
            client_id: clientId,
            image_path: uploadData.path,
            meal_type: mealType || 'uncategorized'
        })

    if (dbError) {
        console.error('DB Error:', dbError)
        return { error: 'Error al guardar el registro' }
    }

    // 3. Notify Trainer
    try {
        const { data: client } = await adminClient
            .from('clients')
            .select('full_name, trainer_id')
            .eq('id', clientId)
            .single()

        if (client?.trainer_id) {
            await createNotification({
                userId: client.trainer_id,
                type: 'meal_photo_reminder',
                title: 'Nueva comida registrada',
                body: `${client.full_name} ha subido una foto de su comida`,
                data: {
                    clientId,
                    url: `/clients/${clientId}?tab=diet`
                }
            })
        }
    } catch (notifError) {
        console.error('Error sending notification:', notifError)
        // Don't fail the action if notification fails
    }

    revalidatePath('/dashboard/diet')
    return { success: true }
}
