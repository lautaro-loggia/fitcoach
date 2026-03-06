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

export async function assignWorkoutAction(data: {
    clientId: string
    name: string
    exercises: Record<string, unknown>[]
    originTemplateId?: string
    validUntil?: string
    scheduledDays?: string[]
    notes?: string
    isPresential?: boolean
    startTime?: string
    endTime?: string
}) {
    const access = await assertCoachOwnsClient(data.clientId)
    if (!access.ok) {
        return access.response
    }
    const { supabase, user } = access

    const { error } = await supabase.from('assigned_workouts').insert({
        trainer_id: user.id,
        client_id: data.clientId,
        name: data.name,
        structure: data.exercises,
        origin_template_id: data.originTemplateId || null,
        is_customized: true,
        valid_until: data.validUntil || null,
        scheduled_days: data.scheduledDays || [],
        notes: data.notes || null,
        is_presential: data.isPresential || false,
        start_time: data.startTime || null,
        end_time: data.endTime || null
    })

    if (error) {
        console.error('Error assigning workout:', error)
        return actionError('Error al asignar el entrenamiento', 'VALIDATION')
    }

    // Update client planning status to 'planned'
    await supabase
        .from('clients')
        .update({ planning_status: 'planned' })
        .eq('id', data.clientId)
        .eq('trainer_id', user.id)

    // Notify Client (auth user id, not client row id)
    const clientUserId = await getClientAuthUserId(supabase, data.clientId, user.id)
    if (clientUserId) {
        await createNotification({
            userId: clientUserId,
            type: 'workout_assigned',
            title: 'Nueva rutina asignada',
            body: `Tu coach te ha asignado la rutina "${data.name}".`,
            data: {
                url: '/dashboard/workout'
            }
        })
    }

    revalidatePath(`/clients/${data.clientId}`)
    revalidatePath('/dashboard', 'layout')
    return { success: true }
}

export async function updateAssignedWorkoutAction(data: {
    id: string
    clientId: string
    name: string
    exercises: Record<string, unknown>[]
    validUntil?: string
    scheduledDays?: string[]
    notes?: string
    isPresential?: boolean
    startTime?: string
    endTime?: string
}) {
    const access = await assertCoachOwnsClient(data.clientId)
    if (!access.ok) {
        return access.response
    }
    const { supabase, user } = access

    const { error } = await supabase.from('assigned_workouts')
        .update({
            name: data.name,
            structure: data.exercises,
            valid_until: data.validUntil || null,
            scheduled_days: data.scheduledDays || [],
            notes: data.notes || null,
            is_presential: data.isPresential || false,
            start_time: data.startTime || null,
            end_time: data.endTime || null
        })
        .eq('id', data.id)
        .eq('trainer_id', user.id)

    if (error) {
        console.error('Error updating workout:', error)
        return actionError('Error al actualizar el entrenamiento', 'VALIDATION')
    }

    // Notify Client (auth user id, not client row id)
    const clientUserId = await getClientAuthUserId(supabase, data.clientId, user.id)
    if (clientUserId) {
        await createNotification({
            userId: clientUserId,
            type: 'workout_assigned', // Keep generic type or add specific 'workout_updated'
            title: 'Rutina actualizada',
            body: `Tu coach ha actualizado la rutina "${data.name}".`,
            data: {
                url: '/dashboard/workout'
            }
        })
    }

    revalidatePath(`/clients/${data.clientId}`)
    revalidatePath('/dashboard', 'layout')
    return { success: true }
}

export async function deleteAssignedWorkoutAction(id: string, clientId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    const { error } = await supabase
        .from('assigned_workouts')
        .delete()
        .eq('id', id)
        .eq('trainer_id', user.id)

    if (error) {
        return { error: 'Error al eliminar' }
    }

    revalidatePath(`/clients/${clientId}`)
    revalidatePath('/dashboard', 'layout')
    return { success: true }
}
