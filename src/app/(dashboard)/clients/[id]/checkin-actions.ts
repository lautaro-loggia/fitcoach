'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createCheckinAction(data: {
    clientId: string
    date: string
    weight: number
    bodyFat?: number
    leanMass?: number
    measurements: any // { chest, waist, hips, etc }
    observations?: string
    photos?: string[]
    nextCheckinDate?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

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
        return { error: 'Error al registrar check-in' }
    }

    // Update client's next checkin date if provided
    if (data.nextCheckinDate) {
        const { error: clientError } = await supabase
            .from('clients')
            .update({ next_checkin_date: data.nextCheckinDate })
            .eq('id', data.clientId)

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

    const { error } = await supabase
        .from('checkins')
        .delete()
        .eq('id', id)

    if (error) {
        return { error: 'Error al eliminar' }
    }

    revalidatePath(`/clients/${clientId}`)
    return { success: true }
}

export async function updateNextCheckinDateAction(clientId: string, date: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('clients')
        .update({ next_checkin_date: date })
        .eq('id', clientId)

    if (error) {
        return { error: 'Error al actualizar la fecha' }
    }

    revalidatePath(`/clients/${clientId}`)
    return { success: true }
}
