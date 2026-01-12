'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { parseISO } from 'date-fns'

export async function createClientAction(formData: FormData) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    const full_name = formData.get('full_name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const birth_date = formData.get('birth_date') as string
    const gender = formData.get('gender') as string
    const initial_weight = formData.get('initial_weight') ? parseFloat(formData.get('initial_weight')!.toString()) : null
    const initial_body_fat = formData.get('initial_body_fat') ? parseFloat(formData.get('initial_body_fat')!.toString()) : null
    const height = formData.get('height') ? parseFloat(formData.get('height')!.toString()) : null
    const goal_text = formData.get('goal_text') as string
    const goal_specific = formData.get('goal_specific') as string
    const activity_level = formData.get('activity_level') as string
    const work_type = formData.get('work_type') as string
    const training_frequency = formData.get('training_frequency') ? parseInt(formData.get('training_frequency')!.toString()) : 3
    const dietary_preference = formData.get('dietary_preference') as string

    // allergens comes as JSON string
    let allergens: string[] = []
    try {
        const allergensStr = formData.get('allergens') as string
        if (allergensStr) {
            allergens = JSON.parse(allergensStr)
        }
    } catch (e) {
        console.error("Error parsing allergens", e)
    }

    const target_weight = formData.get('target_weight') ? parseFloat(formData.get('target_weight')!.toString()) : null
    const target_fat = formData.get('target_fat') ? parseFloat(formData.get('target_fat')!.toString()) : null

    // Wizard Fields
    const waist_circumference = formData.get('waist_circumference') ? parseFloat(formData.get('waist_circumference')!.toString()) : null
    const training_duration_minutes = formData.get('training_duration_minutes') ? parseInt(formData.get('training_duration_minutes')!.toString()) : null
    const goal_deadline = formData.get('goal_deadline') as string
    const meals_per_day = formData.get('meals_per_day') ? parseInt(formData.get('meals_per_day')!.toString()) : 4
    const diet_experience = formData.get('diet_experience') as string || 'beginner'

    // Macro Calculation Logic
    let calculatedMacros = {
        calories: 2000,
        protein: 150,
        carbs: 200,
        fats: 65
    }

    if (initial_weight && height && birth_date && gender && activity_level) {
        // Calculate Age
        const birthDate = parseISO(birth_date)
        const ageDifMs = Date.now() - birthDate.getTime()
        const ageDate = new Date(ageDifMs)
        const age = Math.abs(ageDate.getUTCFullYear() - 1970)

        // Mifflin-St Jeor
        // Men: 10W + 6.25H - 5A + 5
        // Women: 10W + 6.25H - 5A - 161
        let bmr = (10 * initial_weight) + (6.25 * height) - (5 * age)
        if (gender === 'male') {
            bmr += 5
        } else {
            bmr -= 161
        }

        // Activity Multiplier
        let activityMultiplier = 1.2
        switch (activity_level) {
            case 'sedentary': activityMultiplier = 1.2; break;
            case 'light': activityMultiplier = 1.375; break;
            case 'moderate': activityMultiplier = 1.55; break;
            case 'active': activityMultiplier = 1.725; break;
            case 'very_active': activityMultiplier = 1.9; break;
            default: activityMultiplier = 1.2
        }

        let tdee = bmr * activityMultiplier

        // Goal Adjustment
        let targetCalories = tdee
        if (goal_specific === 'lose_fat') {
            targetCalories -= 500
        } else if (goal_specific === 'gain_muscle') {
            targetCalories += 300
        }
        // recomp stays same

        // Macros Breakdown
        // Protein: 2g/kg
        const protein = Math.round(initial_weight * 2)
        // Fats: 0.9g/kg
        const fats = Math.round(initial_weight * 0.9)

        // Carbs: Remainder
        // 1g Protein = 4 kcal, 1g Fat = 9 kcal, 1g Carb = 4 kcal
        const proteinCals = protein * 4
        const fatCals = fats * 9
        const remainingCals = targetCalories - proteinCals - fatCals
        const carbs = Math.max(0, Math.round(remainingCals / 4))

        calculatedMacros = {
            calories: Math.round(targetCalories),
            protein,
            carbs,
            fats
        }
    }

    const insertData = {
        trainer_id: user.id,
        full_name,
        email: email || null,
        phone: phone || null,
        birth_date: birth_date || null,
        gender: gender || null,
        initial_weight: initial_weight || null,
        initial_body_fat: initial_body_fat || null,
        height: height || null,
        goal_text: goal_text || null,
        goal_specific: goal_specific || null,
        activity_level: activity_level || null,
        work_type: work_type || null,
        training_frequency,
        dietary_preference: dietary_preference || 'sin_restricciones',
        allergens: allergens,
        target_calories: calculatedMacros.calories,
        target_protein: calculatedMacros.protein,
        target_carbs: calculatedMacros.carbs,
        target_fats: calculatedMacros.fats,
        target_weight: target_weight || null,

        target_fat: target_fat || null,

        // New Wizard Fields
        waist_circumference,
        training_duration_minutes,
        goal_deadline,
        meals_per_day,
        diet_experience,

        status: 'active',
        macros_is_manual: false
    }

    console.log('Creating client with data:', JSON.stringify(insertData, null, 2))

    const { error } = await supabase.from('clients').insert(insertData)

    if (error) {
        console.error('Supabase error creating client:', error)
        return { error: `Error al crear el cliente: ${error.message}` }
    }

    revalidatePath('/clients')
    return { success: true }
}

export async function updateClientAction(clientId: string, data: any) {
    const supabase = await createClient()

    // Security check: Handled by RLS (assuming "Trainers can manage own clients")
    // data should be sanitized/validated ideally.

    const { error } = await supabase.from('clients').update(data).eq('id', clientId)

    if (error) {
        console.error("Error updating client:", error)
        return { error: "Error al actualizar la información" }
    }

    revalidatePath(`/clients/${clientId}`)
    revalidatePath('/clients')
    return { success: true }
}

export async function deleteClientAction(clientId: string) {
    const supabase = await createClient()

    const { error } = await supabase.from('clients').delete().eq('id', clientId)

    if (error) {
        console.error("Error deleting client:", error)
        return { error: "Error al eliminar el cliente" }
    }

    revalidatePath('/clients')
    return { success: true }
}
