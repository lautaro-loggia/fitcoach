'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createDietAction(data: {
    trainerId: string // Though we usually get from session, passing it or ensuring auth is key
    name: string
    description?: string
    ingredients: any[]
}) {
    const supabase = await createClient()

    const { error } = await supabase.from('recipes').insert({
        trainer_id: data.trainerId,
        name: data.name,
        description: data.description,
        ingredients: data.ingredients,
        // Calculate totals? For now simple insert
    })

    if (error) return { error: 'Error creating recipe' }
    revalidatePath('/recipes')
    return { success: true }
}

export async function assignDietAction(data: {
    clientId: string
    recipeId?: string // If coming from template
    name: string
    ingredients: any[]
    isCustomized: boolean
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    // Simple macro calculation helper
    const calculateMacros = (ingredients: any[]) => {
        let cals = 0, p = 0, c = 0, f = 0
        ingredients.forEach(i => {
            // Normalize grams: check grams or quantity_grams
            const g = i.grams || i.quantity_grams || 100
            const ratio = g / 100
            cals += (i.kcal_100g || 0) * ratio
            p += (i.protein_100g || 0) * ratio
            c += (i.carbs_100g || 0) * ratio
            f += (i.fat_100g || 0) * ratio
        })
        return {
            total_calories: Math.round(cals),
            total_proteins: Math.round(p),
            total_carbs: Math.round(c),
            total_fats: Math.round(f)
        }
    }

    // We store the calculated macros inside data or just compute on fly? 
    // The 'data' column in assigned_diets is jsonb. We'll store ingredients + calculated macros there for ease.
    const macros = calculateMacros(data.ingredients)
    const dietData = {
        ingredients: data.ingredients,
        macros
    }

    const { error } = await supabase.from('assigned_diets').insert({
        trainer_id: user.id,
        client_id: data.clientId,
        name: data.name,
        origin_template_id: data.recipeId || null,
        is_customized: data.isCustomized,
        data: dietData
    })

    if (error) {
        console.error(error)
        return { error: 'Error asignando dieta' }
    }

    // Update client planning status to 'planned'
    await supabase.from('clients').update({ planning_status: 'planned' }).eq('id', data.clientId)

    revalidatePath(`/clients/${data.clientId}`)
    revalidatePath('/dashboard', 'layout')
    return { success: true }
}

export async function updateAssignedDietAction(data: {
    id: string
    clientId: string
    name: string
    ingredients: any[]
}) {
    const supabase = await createClient()

    // Recalculate macros
    const calculateMacros = (ingredients: any[]) => {
        let cals = 0, p = 0, c = 0, f = 0
        ingredients.forEach(i => {
            // Normalize grams: check grams or quantity_grams
            const g = i.grams || i.quantity_grams || 100
            const ratio = g / 100
            cals += (i.kcal_100g || 0) * ratio
            p += (i.protein_100g || 0) * ratio
            c += (i.carbs_100g || 0) * ratio
            f += (i.fat_100g || 0) * ratio
        })
        return {
            total_calories: Math.round(cals),
            total_proteins: Math.round(p),
            total_carbs: Math.round(c),
            total_fats: Math.round(f)
        }
    }
    const macros = calculateMacros(data.ingredients)

    const { error } = await supabase
        .from('assigned_diets')
        .update({
            name: data.name,
            data: { ingredients: data.ingredients, macros },
            is_customized: true // By default, any update implies customization if likely separate from template sync
        })
        .eq('id', data.id)

    if (error) return { error: 'Error actualizando dieta' }
    revalidatePath(`/clients/${data.clientId}`)
    revalidatePath('/dashboard', 'layout')
    return { success: true }
}

export async function deleteAssignedDietAction(id: string, clientId: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('assigned_diets').delete().eq('id', id)
    if (error) return { error: 'Error eliminando' }
    revalidatePath(`/clients/${clientId}`)
    revalidatePath('/dashboard', 'layout')
    return { success: true }
}
