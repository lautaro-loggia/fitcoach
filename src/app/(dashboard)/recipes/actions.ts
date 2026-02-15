'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface RecipeIngredient {
    ingredient_code: string
    ingredient_name: string
    grams: number
    unit?: string
    quantity?: number
    // Macro data (from ingredients table, used for calculation)
    kcal_100g?: number
    protein_100g?: number
    carbs_100g?: number
    fat_100g?: number
    fiber_100g?: number
}

export interface RecipeData {
    name: string
    meal_type: string
    servings: number
    prep_time_min: number
    instructions: string
    ingredients: RecipeIngredient[]
    image_url?: string | null
    manual_macros?: {
        kcal: number
        protein: number
        carbs: number
        fat: number
    }
}

export async function createRecipeAction(data: RecipeData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    if (!data.name?.trim()) {
        return { error: 'El nombre es requerido' }
    }

    // Skip ingredients validation for drinks with manual macros
    const isDrink = data.meal_type === 'bebida'
    if (!isDrink && (!data.ingredients || data.ingredients.length === 0)) {
        return { error: 'Debe agregar al menos un ingrediente' }
    }

    let macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

    if (data.ingredients && data.ingredients.length > 0) {
        // Calculate total macros from ingredients
        macros = data.ingredients.reduce((acc, ing) => {
            const factor = (ing.grams || 0) / 100
            return {
                kcal: acc.kcal + (ing.kcal_100g || 0) * factor,
                protein: acc.protein + (ing.protein_100g || 0) * factor,
                carbs: acc.carbs + (ing.carbs_100g || 0) * factor,
                fat: acc.fat + (ing.fat_100g || 0) * factor,
            }
        }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })
    } else if (isDrink && data.manual_macros) {
        // Use manual macros for drinks without ingredients
        // Scale by servings to store TOTAL macros for the recipe
        // (Assuming manual_macros passed are per serving or total? 
        // Usually manual entry is "per serving" in UI, but database stores TOTAL for the whole recipe.
        // Let's assume UI sends TOTAL macros if servings > 1, OR we calculate here.
        // Actually, for drinks, usually servings=1. Let's assume passed manual_macros are TOTAL.)
        macros = data.manual_macros
    }

    // Generate a unique recipe_code
    const recipe_code = `R${Date.now().toString(36).toUpperCase()}`

    const { data: recipe, error } = await supabase.from('recipes').insert({
        trainer_id: user.id,
        recipe_code,
        name: data.name.trim(),
        meal_type: data.meal_type,
        servings: data.servings || 1,
        prep_time_min: data.prep_time_min,
        instructions: data.instructions,
        ingredients: data.ingredients || [],
        image_url: data.image_url || null,
        macros_calories: macros.kcal,
        macros_protein_g: macros.protein,
        macros_carbs_g: macros.carbs,
        macros_fat_g: macros.fat,
    }).select().single()

    if (error) {
        console.error('Error creating recipe:', error)
        return { error: `Error al crear la receta: ${error.message}` }
    }

    revalidatePath('/recipes')
    return { success: true, recipe }
}

export async function updateRecipeAction(recipeId: string, data: Partial<RecipeData>) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    const updateData: Record<string, any> = {}
    console.log('Update Recipe Payload:', JSON.stringify(data, null, 2))

    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.meal_type !== undefined) updateData.meal_type = data.meal_type
    if (data.servings !== undefined) updateData.servings = data.servings
    if (data.prep_time_min !== undefined) updateData.prep_time_min = data.prep_time_min
    if (data.instructions !== undefined) updateData.instructions = data.instructions
    if (data.ingredients !== undefined) updateData.ingredients = data.ingredients
    if (data.image_url !== undefined) {
        console.log('Updating recipe image_url to:', data.image_url)
        updateData.image_url = data.image_url
    }

    let query = supabase.from('recipes').update(updateData).eq('id', recipeId)

    // Admin bypass: lauloggia@gmail.com can edit any recipe
    if (user.email !== 'lauloggia@gmail.com') {
        query = query.eq('trainer_id', user.id)
    }

    const { data: updatedData, error } = await query.select()

    if (error) {
        console.error('Error updating recipe:', error)
        return { error: `Error al actualizar la receta: ${error.message}` }
    }

    if (!updatedData || updatedData.length === 0) {
        return { error: 'No se pudo actualizar la receta. Verifique que sea el propietario.' }
    }

    revalidatePath('/recipes')
    revalidatePath(`/recipes/${recipeId}`)
    return { success: true }
}

export async function duplicateRecipeAction(recipeId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    // Fetch original recipe
    const { data: original, error: fetchError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId)
        .single()

    if (fetchError || !original) {
        return { error: 'Receta no encontrada' }
    }

    // Generate new recipe_code
    const recipe_code = `R${Date.now().toString(36).toUpperCase()}`

    // Create duplicate
    const { data: duplicate, error: insertError } = await supabase.from('recipes').insert({
        trainer_id: user.id,
        recipe_code,
        name: `${original.name} (copia)`,
        meal_type: original.meal_type,
        servings: original.servings,
        prep_time_min: original.prep_time_min,
        instructions: original.instructions,
        ingredients: original.ingredients || original.ingredients_data,
        image_url: original.image_url,
        is_base_template: false, // Duplicates are never base templates
    }).select().single()

    if (insertError) {
        console.error('Error duplicating recipe:', insertError)
        return { error: `Error al duplicar la receta: ${insertError.message}` }
    }

    revalidatePath('/recipes')
    return { success: true, recipe: duplicate }
}

export async function deleteRecipeAction(recipeId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    // TODO: Check if recipe is assigned to any client before deleting

    const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId)
        .eq('trainer_id', user.id) // Security: Only delete own recipes

    if (error) {
        console.error('Error deleting recipe:', error)
        return { error: `Error al eliminar la receta: ${error.message}` }
    }

    revalidatePath('/recipes')
    return { success: true }
}

// Fetch all ingredients for the ingredient selector
export async function getIngredientsAction() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado', ingredients: [] }
    }

    const { data: ingredients, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('name')

    if (error) {
        console.error('Error fetching ingredients:', error)
        return { error: 'Error al cargar ingredientes', ingredients: [] }
    }

    return { ingredients: ingredients || [] }
}

const MEAL_ORDER: Record<string, number> = {
    'Desayuno': 0,
    'Almuerzo': 1,
    'Merienda': 2,
    'Cena': 3,
    'Snack': 4,
    'Postre': 5
}

export async function bulkAssignRecipeAction(data: {
    recipeId: string
    assignments: {
        clientId: string
        dayOfWeek: number
        mealTime: string
    }[]
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    if (!data.assignments.length) {
        return { error: 'No hay asignaciones para procesar' }
    }

    // 1. Fetch the recipe details
    const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .select('id, name')
        .eq('id', data.recipeId)
        .single()

    if (recipeError || !recipe) {
        return { error: 'Receta no encontrada' }
    }

    // 2. Iterate over assignments
    const errors: string[] = []

    for (const assignment of data.assignments) {
        const { clientId, dayOfWeek, mealTime } = assignment

        if (!dayOfWeek || !mealTime) {
            errors.push(clientId)
            continue
        }

        const sortOrder = MEAL_ORDER[mealTime] ?? 99

        try {
            // A. Get or create active Weekly Meal Plan
            let { data: plan } = await supabase
                .from('weekly_meal_plans')
                .select('id')
                .eq('client_id', clientId)
                .eq('status', 'active')
                .single()

            if (!plan) {
                const { data: newPlan, error: createPlanError } = await supabase
                    .from('weekly_meal_plans')
                    .insert({
                        client_id: clientId,
                        status: 'active'
                    })
                    .select('id')
                    .single()

                if (createPlanError) throw createPlanError
                plan = newPlan
            }

            // B. Get or create Day
            let { data: day } = await supabase
                .from('weekly_meal_plan_days')
                .select('id')
                .eq('plan_id', plan.id)
                .eq('day_of_week', dayOfWeek)
                .single()

            if (!day) {
                const { data: newDay, error: createDayError } = await supabase
                    .from('weekly_meal_plan_days')
                    .insert({
                        plan_id: plan.id,
                        day_of_week: dayOfWeek
                    })
                    .select('id')
                    .single()

                if (createDayError) throw createDayError
                day = newDay
            }

            // C. Get or create Meal (Slot)
            let { data: meal } = await supabase
                .from('weekly_meal_plan_meals')
                .select('id')
                .eq('day_id', day.id)
                .eq('name', mealTime)
                .single()

            if (!meal) {
                const { data: newMeal, error: createMealError } = await supabase
                    .from('weekly_meal_plan_meals')
                    .insert({
                        day_id: day.id,
                        name: mealTime,
                        sort_order: sortOrder
                    })
                    .select('id')
                    .single()

                if (createMealError) throw createMealError
                meal = newMeal
            }

            // D. Insert Recipe Item
            const { error: insertItemError } = await supabase
                .from('weekly_meal_plan_items')
                .insert({
                    meal_id: meal.id,
                    recipe_id: recipe.id,
                    // custom_name removed as requested
                    portions: 1
                })

            if (insertItemError) throw insertItemError

        } catch (err: any) {
            console.error(`Error assigning to client ${clientId}:`, err)
            errors.push(clientId)
        }
    }

    if (errors.length > 0) {
        return { error: `Error al asignar a ${errors.length} asesorados.` }
    }

    revalidatePath('/dashboard/clients')
    return { success: true }
}
