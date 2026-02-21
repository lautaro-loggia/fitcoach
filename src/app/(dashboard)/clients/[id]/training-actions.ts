'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/lib/notifications'

export async function assignWorkoutAction(data: {
    clientId: string
    name: string
    exercises: any[]
    originTemplateId?: string
    validUntil?: string
    scheduledDays?: string[]
    notes?: string
    isPresential?: boolean
    startTime?: string
    endTime?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

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
        return { error: 'Error al asignar el entrenamiento' }
    }

    // Update client planning status to 'planned'
    await supabase.from('clients').update({ planning_status: 'planned' }).eq('id', data.clientId)

    // Notify Client
    await createNotification({
        userId: data.clientId,
        type: 'workout_assigned',
        title: 'Nueva rutina asignada',
        body: `Tu coach te ha asignado la rutina "${data.name}".`,
        data: {
            url: '/dashboard/workout'
        }
    })

    revalidatePath(`/clients/${data.clientId}`)
    revalidatePath('/dashboard', 'layout')
    return { success: true }
}

export async function updateAssignedWorkoutAction(data: {
    id: string
    clientId: string
    name: string
    exercises: any[]
    validUntil?: string
    scheduledDays?: string[]
    notes?: string
    isPresential?: boolean
    startTime?: string
    endTime?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

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
        return { error: 'Error al actualizar el entrenamiento' }
    }

    // Notify Client
    await createNotification({
        userId: data.clientId,
        type: 'workout_assigned', // Keep generic type or add specific 'workout_updated'
        title: 'Rutina actualizada',
        body: `Tu coach ha actualizado la rutina "${data.name}".`,
        data: {
            url: '/dashboard/workout'
        }
    })

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
