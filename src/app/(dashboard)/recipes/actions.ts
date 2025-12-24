'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface RecipeIngredient {
    ingredient_code: string
    ingredient_name: string
    grams: number
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
    image_url?: string
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

    if (!data.ingredients || data.ingredients.length === 0) {
        return { error: 'Debe agregar al menos un ingrediente' }
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
        ingredients: data.ingredients,
        image_url: data.image_url || null,
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

    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.meal_type !== undefined) updateData.meal_type = data.meal_type
    if (data.servings !== undefined) updateData.servings = data.servings
    if (data.prep_time_min !== undefined) updateData.prep_time_min = data.prep_time_min
    if (data.instructions !== undefined) updateData.instructions = data.instructions
    if (data.ingredients !== undefined) updateData.ingredients = data.ingredients
    if (data.image_url !== undefined) updateData.image_url = data.image_url

    const { error } = await supabase
        .from('recipes')
        .update(updateData)
        .eq('id', recipeId)
        .eq('trainer_id', user.id) // Security: Only update own recipes

    if (error) {
        console.error('Error updating recipe:', error)
        return { error: `Error al actualizar la receta: ${error.message}` }
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
