'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin' // Import Admin Client
import { revalidatePath } from 'next/cache'
import { getTodayString } from '@/lib/utils'
import { normalizeAllergenInput } from '@/lib/allergen-utils'

// --- Helpers ---

async function getAuthenticatedClient() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autorizado')

    // Use Admin Client for DB operations to bypass RLS for updates
    const adminSupabase = createAdminClient()

    const { data: client, error } = await adminSupabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single()

    if (error || !client) throw new Error('Cliente no encontrado')

    return { supabase, adminSupabase, client, user }
}

// --- Step Actions ---

export async function updateBasicProfile(data: {
    birth_date: string // YYYY-MM-DD
    height: number
    weight: number // saved to current_weight
    gender: string
}) {
    const { adminSupabase, client } = await getAuthenticatedClient()

    const { error } = await adminSupabase
        .from('clients')
        .update({
            birth_date: data.birth_date,
            height: data.height,
            current_weight: data.weight,
            initial_weight: client.initial_weight ?? data.weight,
            gender: data.gender,
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
            goal_text: data.goal_specific,
            goals: {
                ...(client.goals || {}), // Preserve existing goals data
                timeframe: data.timeframe
            }
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
            training_frequency: data.training_days,
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
    injuries: unknown[]
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

    const normalizedAllergens = Array.from(
        new Set((data.allergens || []).map(allergen => normalizeAllergenInput(allergen)).filter(Boolean))
    )

    const dietaryPreferenceMap: Record<string, string> = {
        no_preference: 'sin_restricciones',
        high_protein: 'sin_restricciones',
        keto: 'sin_restricciones',
        other: 'sin_restricciones',
        vegetarian: 'vegetariana',
        vegan: 'vegana',
    }

    const normalizedDietaryPreference = dietaryPreferenceMap[data.diet_preference] || 'sin_restricciones'

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
            dietary_info: dietaryInfo,
            allergens: normalizedAllergens,
            dietary_preference: normalizedDietaryPreference
        })
        .eq('id', client.id)

    if (error) return { error: error.message }
    return { success: true }
}

export async function setOnboardingPassword(data: {
    password: string
    confirmPassword: string
}) {
    const { supabase, adminSupabase, client } = await getAuthenticatedClient()

    if (!data.password || !data.confirmPassword) {
        return { error: 'Por favor complete todos los campos' }
    }

    if (data.password.length < 6) {
        return { error: 'La contraseña debe tener al menos 6 caracteres' }
    }

    if (data.password !== data.confirmPassword) {
        return { error: 'Las contraseñas no coinciden' }
    }

    const { error: passwordError } = await supabase.auth.updateUser({
        password: data.password,
        data: { needs_password: false }
    })

    if (passwordError) return { error: passwordError.message }

    if (client.onboarding_status !== 'completed') {
        const { error: clientError } = await adminSupabase
            .from('clients')
            .update({ onboarding_status: 'in_progress' })
            .eq('id', client.id)

        if (clientError) return { error: clientError.message }
    }

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
    const updates: Record<string, unknown> = {
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
    const checkinData: Record<string, unknown> = {
        client_id: client.id,
        trainer_id: client.trainer_id,
        date: getTodayString(),
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
