'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function completeWorkout(formData: {
    workoutId: string
    clientId: string
    exercisesLog: any // JSON of checked exercises
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    const adminSupabase = createAdminClient()

    // 1. Verify Client Ownership (Optional but good)
    const { data: client } = await adminSupabase
        .from('clients')
        .select('id, user_id')
        .eq('id', formData.clientId)
        .single()

    if (!client || client.user_id !== user.id) {
        return { error: 'No tienes permiso para registrar este entrenamiento.' }
    }

    // 2. Insert Log
    const { error } = await adminSupabase
        .from('workout_logs')
        .insert({
            client_id: formData.clientId,
            workout_id: formData.workoutId,
            date: new Date().toISOString().split('T')[0],
            completed_at: new Date().toISOString(),
            exercises_log: formData.exercisesLog // Storing what was checked
        })

    if (error) {
        console.error('Error logging workout:', error)
        return { error: 'Error al registrar el entrenamiento.' }
    }

    revalidatePath('/dashboard', 'layout')
    return { success: true }
}
