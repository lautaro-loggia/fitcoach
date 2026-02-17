'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { addDays, format } from 'date-fns'
import { getTodayString, getARTDate } from '@/lib/utils'

export async function createCheckin(data: {
    weight: number
    body_fat?: number
    lean_mass?: number
    neck_measure?: number
    chest_measure?: number
    waist_measure?: number
    hip_measure?: number
    arm_measure?: number
    thigh_measure?: number
    calf_measure?: number
    date_formatted?: string // dd/mm/yyyy
    observations?: string
    photos?: any[] // JSONB: { url: string, type: string, path?: string }[]
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
    const measurements = {
        neck: data.neck_measure || null,
        chest: data.chest_measure || null,
        waist: data.waist_measure || null,
        hip: data.hip_measure || null,
        arm: data.arm_measure || null,
        thigh: data.thigh_measure || null,
        calf: data.calf_measure || null
    }

    const { error: insertError } = await adminSupabase
        .from('checkins')
        .insert({
            client_id: client.id,
            trainer_id: client.trainer_id,
            date: getTodayString(),
            weight: data.weight,
            body_fat: data.body_fat || null,
            lean_mass: data.lean_mass || null,
            measurements: measurements,
            observations: data.observations || null,
            photos: data.photos || []
        })

    if (insertError) {
        console.error('Checkin Error:', insertError)
        return { error: 'Error al guardar el check-in' }
    }

    // 3. Update Client Current Weight
    const updateData: any = {
        current_weight: data.weight,
        updated_at: getARTDate().toISOString()
    }

    // 4. Calculate Next Check-in Date
    // If client has a frequency set, we calculate next date from TODAY.
    if (client.checkin_frequency_days) {
        const nextDate = addDays(getARTDate(), client.checkin_frequency_days)
        updateData.next_checkin_date = format(nextDate, 'yyyy-MM-dd')
    }

    await adminSupabase
        .from('clients')
        .update(updateData)
        .eq('id', client.id)

    revalidatePath('/dashboard', 'layout')
    return { success: true }
}

export async function uploadCheckinPhoto(formData: FormData) {
    const file = formData.get('file') as File
    if (!file) return { error: 'No file provided' }

    try {
        const supabase = await createClient()
        // Use authenticated user to upload
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'No autorizado' }

        const timestamp = Date.now()
        // Sanitize filename
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filename = `${user.id}/${timestamp}-${safeName}`
        const bucket = 'checkin-images'

        // Convert file to ArrayBuffer
        const buffer = await file.arrayBuffer()

        // Create Admin Client to bypass RLS for storage upload
        const adminSupabase = createAdminClient()

        // Upload using Admin Client
        const { error } = await adminSupabase.storage
            .from(bucket)
            .upload(filename, buffer, {
                contentType: file.type,
                upsert: false
            })

        if (error) {
            console.error('Upload error:', error)
            return { error: error.message }
        }

        // Create Signed URL for immediate preview (valid for 1 hour)
        const { data: signedData, error: signError } = await adminSupabase.storage
            .from(bucket)
            .createSignedUrl(filename, 3600)

        if (signError || !signedData?.signedUrl) {
            console.error('Error signing URL:', signError)
            return { error: 'Could not generate preview URL' }
        }

        return {
            url: signedData.signedUrl, // For immediate preview
            path: filename // To save in DB for long-term reference
        }
    } catch (err) {
        console.error('Upload exception:', err)
        return { error: 'Upload failed' }
    }
}

export async function markNoteAsSeenAction(checkinId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'No autorizado' }

    const adminClient = createAdminClient()

    const { error } = await adminClient
        .from('checkins')
        .update({
            coach_note_seen_at: new Date().toISOString()
        })
        .eq('id', checkinId)
        .is('coach_note_seen_at', null) // Only update if not already seen

    if (error) {
        console.error('Error marking note as seen:', error)
        return { error: 'Error al marcar como visto' }
    }

    revalidatePath('/dashboard', 'layout')
    return { success: true }
}
