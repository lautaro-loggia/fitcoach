'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin' // Import Admin Client
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// --- Helpers ---

async function getAuthenticatedClient() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Use Admin Client for DB operations to bypass RLS for updates
    const adminSupabase = createAdminClient()

    const { data: client, error } = await adminSupabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single()

    if (error || !client) throw new Error('Client record not found')

    return { supabase, adminSupabase, client, user }
}

// --- Step Actions ---

export async function updateBasicProfile(data: {
    birth_date: string // YYYY-MM-DD
    height: number
    weight: number // saved to current_weight
}) {
    const { adminSupabase, client } = await getAuthenticatedClient()

    const { error } = await adminSupabase
        .from('clients')
        .update({
            birth_date: data.birth_date,
            height: data.height,
            current_weight: data.weight,
            updated_at: new Date().toISOString()
        })
        .eq('id', client.id)

    if (error) return { error: error.message }
    return { success: true }
}

export async function updateGoals(data: {
    main_goal: string
    goal_specific?: string // Textarea
    target_weight?: number
    target_fat?: number
    timeframe: string
}) {
    const { adminSupabase, client } = await getAuthenticatedClient()

    const { error } = await adminSupabase
        .from('clients')
        .update({
            main_goal: data.main_goal,
            target_weight: data.target_weight,
            target_fat: data.target_fat,
            goal_text: data.goal_specific
        })
        .eq('id', client.id)

    if (error) return { error: error.message }
    return { success: true }
}

export async function updateLifestyle(data: {
    activity_level: string
    work_type: string
    training_days: number
}) {
    const { adminSupabase, client } = await getAuthenticatedClient()

    const { error } = await adminSupabase
        .from('clients')
        .update({
            activity_level: data.activity_level,
            work_type: data.work_type,
            training_availability: {
                days_per_week: data.training_days
            }
        })
        .eq('id', client.id)

    if (error) return { error: error.message }
    return { success: true }
}

export async function updateInjuries(data: {
    has_injuries: boolean
    injuries: any[]
}) {
    const { adminSupabase, client } = await getAuthenticatedClient()

    const { error } = await adminSupabase
        .from('clients')
        .update({
            injuries: data.has_injuries ? data.injuries : []
        })
        .eq('id', client.id)

    if (error) return { error: error.message }
    return { success: true }
}

export async function updateNutrition(data: {
    diet_preference: string
    meals_per_day: number
    experience: string
    allergens: string[]
    other_restrictions?: string
}) {
    const { adminSupabase, client } = await getAuthenticatedClient()

    const dietaryInfo = {
        preference: data.diet_preference,
        meals_count: data.meals_per_day,
        experience: data.experience,
        allergens: data.allergens,
        other: data.other_restrictions
    }

    const { error } = await adminSupabase
        .from('clients')
        .update({
            dietary_info: dietaryInfo
        })
        .eq('id', client.id)

    if (error) return { error: error.message }
    return { success: true }
}

export async function completeOnboarding(data: {
    navy_method?: {
        neck: number
        waist: number
        hip?: number
    }
    body_fat_percentage?: number
    method: 'navy' | 'manual' | 'skipped'
}) {
    const { adminSupabase, client } = await getAuthenticatedClient()

    // 1. Update DB with Body Fat info if provided
    const updates: any = {
        onboarding_status: 'completed',
        status: 'active'
    }

    if (data.body_fat_percentage) {
        updates.initial_body_fat = data.body_fat_percentage
    }

    const { error: updateError } = await adminSupabase
        .from('clients')
        .update(updates)
        .eq('id', client.id)

    if (updateError) return { error: updateError.message }

    // 2. Create Baseline Check-in
    const checkinData: any = {
        client_id: client.id,
        trainer_id: client.trainer_id,
        date: new Date().toISOString().split('T')[0],
        observations: 'Check-in Inicial (Baseline)',
        weight: client.current_weight,
        body_fat: data.body_fat_percentage,
        measurements: data.navy_method ? { ...data.navy_method, method: 'navy' } : null
    }

    const { error: checkinError } = await adminSupabase
        .from('checkins')
        .insert(checkinData)

    if (checkinError) {
        console.error('Error creating baseline checkin:', checkinError)
    }

    revalidatePath('/dashboard', 'layout')
    return { success: true }
}
