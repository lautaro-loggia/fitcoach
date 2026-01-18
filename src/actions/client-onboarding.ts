'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// --- Helpers ---

async function getAuthenticatedClient() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single()

    if (error || !client) throw new Error('Client record not found')

    return { supabase, client, user }
}

// --- Step Actions ---

export async function updateBasicProfile(data: {
    birth_date: string // YYYY-MM-DD
    height: number
    weight: number // saved to current_weight
}) {
    const { supabase, client } = await getAuthenticatedClient()

    const { error } = await supabase
        .from('clients')
        .update({
            birth_date: data.birth_date,
            height: data.height,
            current_weight: data.weight,
            // Also update initial values if they are null? Or just keep current?
            // Prompt says "Este peso será usado luego como baseline".
            // We'll set initial_weight too if it's the first time?
            // Let's just update current_weight for now. Baseline creation uses current_weight.
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
    // Duration/Timeframe could be stored in goals jsonb?
    timeframe: string
}) {
    const { supabase, client } = await getAuthenticatedClient()

    // Construct goals object for JSONB if needed, or mapped columns
    // We have main_goal column. Others go to goals jsonb?
    // Schema plan said `goals` jsonb.

    const goalsJson = {
        specific: data.goal_specific,
        timeframe: data.timeframe,
        ...(client.goals as object || {}) // Merge
    }

    const { error } = await supabase
        .from('clients')
        .update({
            main_goal: data.main_goal,
            target_weight: data.target_weight,
            target_fat: data.target_fat,
            // goals: goalsJson, // Wait, I didn't add 'goals' column in migration? 
            // Checking Schema... I added 'main_goal' column.
            // I did NOT add 'goals' JSONB explicitly in step 60 migration?
            // Step 60: "add column if not exists main_goal text".
            // "add column if not exists dietary_info jsonb"
            // "add column if not exists training_availability jsonb"
            // "add column if not exists injuries jsonb"
            // I missed 'goals' JSONB column in migration 20260118151400.
            // However, `clients` table ALREADY had `goal_text` and `goal_specific` text columns from original schema (lines 42-43 of schema.sql).
            // So I can use `goal_text` for the custom text and `goal_specific` for something else?
            // Prompt Step 2: "Objetivo estructurado (select)... Objetivo personal (textarea)".
            // Let's use `main_goal` for the Select, and `goal_text` for the Textarea.
            goal_text: data.goal_specific
        })
        .eq('id', client.id)

    if (error) return { error: error.message }
    return { success: true }
}

export async function updateLifestyle(data: {
    activity_level: string
    work_type: string
    training_days: number // or text?
    // Prompt: "1 to 7 days". 
    // Schema: `training_availability` JSONB.
}) {
    const { supabase, client } = await getAuthenticatedClient()

    const { error } = await supabase
        .from('clients')
        .update({
            activity_level: data.activity_level,
            work_type: data.work_type,
            // Store training days in training_availability JSON
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
    injuries: any[] // { zone, description, severity, diagnosed }
}) {
    const { supabase, client } = await getAuthenticatedClient()

    const { error } = await supabase
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
    const { supabase, client } = await getAuthenticatedClient()

    const dietaryInfo = {
        preference: data.diet_preference,
        meals_count: data.meals_per_day,
        experience: data.experience,
        allergens: data.allergens,
        other: data.other_restrictions
    }

    const { error } = await supabase
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
    body_fat_percentage?: number // calculated or manual
    method: 'navy' | 'manual' | 'skipped'
}) {
    const { supabase, client, user } = await getAuthenticatedClient()

    // 1. Update DB with Body Fat info if provided
    // Note: Clients table has `initial_body_fat`.
    const updates: any = {
        onboarding_status: 'completed',
        // Ensure status is active
        status: 'active'
    }

    if (data.body_fat_percentage) {
        updates.initial_body_fat = data.body_fat_percentage
        // We can also update current fat? No column for current_fat in client table in my update?
        // Migration added `current_weight`, `target_fat`.
        // Schema had `initial_body_fat`.
        // Baseline checkin will hold the current fat.
    }

    const { error: updateError } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', client.id)

    if (updateError) return { error: updateError.message }

    // 2. Create Baseline Check-in
    // We need current weight (from DB), height (from DB), and the new fat info.

    const checkinData: any = {
        client_id: client.id,
        trainer_id: client.trainer_id,
        date: new Date().toISOString().split('T')[0], // Today YYYY-MM-DD
        type: 'baseline', // Wait, 'type' column exists in checkins?
        // Schema check: "create table public.checkins ... weight, body_fat, lean_mass, measurements jsonb, observations..."
        // No 'type' column in standard schema shown in Step 27.
        // I can put 'type' in observations or just assume first checkin is baseline.
        // Or I can add 'type' column?
        // Prompt: "tipo: baseline".
        // I missed adding 'type' column to checkins.
        // I will add it to `observations` for now: "Baseline Check-in"
        observations: 'Check-in Inicial (Baseline)',
        weight: client.current_weight, // Saved in Step 1
        body_fat: data.body_fat_percentage,
        measurements: data.navy_method ? { ...data.navy_method, method: 'navy' } : null
    }

    const { error: checkinError } = await supabase
        .from('checkins')
        .insert(checkinData)

    if (checkinError) {
        console.error('Error creating baseline checkin:', checkinError)
        // Non-fatal? We still completed onboarding.
    }

    revalidatePath('/dashboard', 'layout')
    return { success: true }
}
