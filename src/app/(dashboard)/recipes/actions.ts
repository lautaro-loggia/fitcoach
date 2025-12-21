'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createRecipeAction(data: {
    name: string
    description: string
    meal_type: string
    ingredients: any[]
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    const { error } = await supabase.from('recipes').insert({
        trainer_id: user.id,
        name: data.name,
        description: data.description || null,
        meal_type: data.meal_type || null,
        ingredients_data: data.ingredients,
    })

    if (error) {
        console.error(error)
        return { error: 'Error al crear la receta' }
    }

    revalidatePath('/recipes')
    return { success: true }
}
