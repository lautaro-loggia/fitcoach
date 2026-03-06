'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/lib/notifications'
import { actionError, assertCoachOwnsClient } from '@/lib/security/client-access'

async function getClientAuthUserId(supabase: Awaited<ReturnType<typeof createClient>>, clientId: string, trainerId: string) {
    const { data: client, error } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', clientId)
        .eq('trainer_id', trainerId)
        .single()

    if (error) {
        console.error('Error fetching client auth user for notification:', error)
        return null
    }

    return client?.user_id || null
}

export async function createCheckinAction(data: {
    clientId: string
    date: string
    weight: number
    bodyFat?: number
    leanMass?: number
    measurements: Record<string, unknown> // { chest, waist, hips, etc }
    observations?: string
    photos?: string[]
    nextCheckinDate?: string
}) {
    const access = await assertCoachOwnsClient(data.clientId)
    if (!access.ok) {
        return access.response
    }
    const { supabase, user } = access

    // Insert checkin record
    const { error: checkinError } = await supabase.from('checkins').insert({
        trainer_id: user.id,
        client_id: data.clientId,
        date: data.date,
        weight: data.weight,
        body_fat: data.bodyFat,
        lean_mass: data.leanMass,
        measurements: data.measurements,
        observations: data.observations,
        photos: data.photos || []
    })

    if (checkinError) {
        console.error('Error creating checkin:', checkinError)
        return actionError('Error al registrar check-in', 'VALIDATION')
    }

    // Update client's next checkin date if provided
    if (data.nextCheckinDate) {
        const { error: clientError } = await supabase
            .from('clients')
            .update({ next_checkin_date: data.nextCheckinDate })
            .eq('id', data.clientId)
            .eq('trainer_id', user.id)

        if (clientError) {
            console.error('Error updating next checkin date:', clientError)
            // We don't return error here because the checkin was already created successfully
        }
    }

    revalidatePath(`/clients/${data.clientId}`)
    revalidatePath('/clients') // To update the table in the dashboard
    return { success: true }
}

export async function deleteCheckinAction(id: string, clientId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return actionError('No autorizado', 'UNAUTHORIZED')
    }

    const { error } = await supabase
        .from('checkins')
        .delete()
        .eq('id', id)
        .eq('trainer_id', user.id)

    if (error) {
        return actionError('Error al eliminar', 'VALIDATION')
    }

    revalidatePath(`/clients/${clientId}`)
    return { success: true }
}

export async function updateNextCheckinDateAction(clientId: string, date: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return actionError('No autorizado', 'UNAUTHORIZED')
    }

    const { error } = await supabase
        .from('clients')
        .update({ next_checkin_date: date })
        .eq('id', clientId)
        .eq('trainer_id', user.id)

    if (error) {
        return actionError('Error al actualizar la fecha', 'VALIDATION')
    }

    revalidatePath(`/clients/${clientId}`)
    return { success: true }
}

export async function updateCheckinNoteAction(checkinId: string, clientId: string, note: string) {
    const access = await assertCoachOwnsClient(clientId)
    if (!access.ok) {
        return access.response
    }
    const { supabase, user } = access

    const { error } = await supabase
        .from('checkins')
        .update({
            coach_note: note,
            // The trigger in the DB will handle status and coach_note_updated_at
            // But we can also set it explicitly if needed, though the trigger is safer.
        })
        .eq('id', checkinId)
        .eq('trainer_id', user.id)
        .eq('client_id', clientId)

    if (error) {
        console.error('Error updating checkin note:', error)
        return actionError(error.message || 'Error al actualizar la nota', 'VALIDATION')
    }

    // Notify Client (auth user id, not client row id)
    const clientUserId = await getClientAuthUserId(supabase, clientId, user.id)
    if (clientUserId) {
        await createNotification({
            userId: clientUserId,
            type: 'coach_feedback',
            title: 'Feedback recibido',
            body: 'Tu coach ha respondido a tu check-in.',
            data: {
                checkinId,
                url: '/dashboard/progress'
            }
        })
    }

    revalidatePath(`/clients/${clientId}`)
    return { success: true }
}
