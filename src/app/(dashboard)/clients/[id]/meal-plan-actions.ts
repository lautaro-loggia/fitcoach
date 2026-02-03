'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type MealConfig = {
    name: string
    included: boolean
}

// 1. Get or Create Weekly Plan
export async function getWeeklyPlan(clientId: string) {
    const supabase = await createClient()

    // Attempt to fetch existing active plan
    const { data: plan } = await supabase
        .from('weekly_meal_plans')
        .select(`
            *,
            days:weekly_meal_plan_days(
                *,
                meals:weekly_meal_plan_meals(
                    *,
                    items:weekly_meal_plan_items(
                        *,
                        recipe:recipes(*)
                    )
                )
            )
        `)
        .eq('client_id', clientId)
        .eq('status', 'active')
        .single()

    if (plan) {
        // Sort days and meals here or in UI. SQL result order isn't guaranteed without order by.
        // We can sort them here to be safe.
        plan.days.sort((a: any, b: any) => a.day_of_week - b.day_of_week)
        plan.days.forEach((day: any) => {
            day.meals.sort((a: any, b: any) => a.sort_order - b.sort_order)
            day.meals.forEach((meal: any) => {
                // items sort? Maybe by created_at
                meal.items.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            })
        })
        return { plan }
    }

    return { plan: null }
}

export async function createWeeklyPlan(clientId: string, mealConfig: string[]) {
    const supabase = await createClient()

    // mealConfig example: ["Desayuno", "Almuerzo", "Cena"]

    // 1. Create Plan
    const { data: plan, error: planError } = await supabase
        .from('weekly_meal_plans')
        .insert({ client_id: clientId })
        .select()
        .single()

    if (planError) return { error: 'Error creando plan' }

    // 2. Create Days (1-7)
    const daysToInsert = Array.from({ length: 7 }, (_, i) => ({
        plan_id: plan.id,
        day_of_week: i + 1
    }))

    const { data: days, error: daysError } = await supabase
        .from('weekly_meal_plan_days')
        .insert(daysToInsert)
        .select()

    if (daysError) return { error: 'Error creando días' }

    // 3. Create Meals for each day
    // We want to bulk insert all meals for all days to be efficient
    const mealsToInsert: any[] = []

    days.forEach(day => {
        mealConfig.forEach((mealName, index) => {
            mealsToInsert.push({
                day_id: day.id,
                name: mealName,
                sort_order: index
            })
        })
    })

    const { error: mealsError } = await supabase
        .from('weekly_meal_plan_meals')
        .insert(mealsToInsert)

    if (mealsError) return { error: 'Error configurando comidas' }

    revalidatePath(`/clients/${clientId}`)
    return { success: true, planId: plan.id }
}

export async function updateReviewDate(planId: string, clientId: string, date: string | null) {
    const supabase = await createClient()
    await supabase.from('weekly_meal_plans').update({ review_date: date }).eq('id', planId)
    revalidatePath(`/clients/${clientId}`)
}

// 2. Add Dish to Meal
export async function addDishToMeal(mealId: string, clientId: string, data: {
    recipeId?: string,
    customName?: string,
    portions?: number
}) {
    const supabase = await createClient()

    const { error } = await supabase.from('weekly_meal_plan_items').insert({
        meal_id: mealId,
        recipe_id: data.recipeId || null,
        custom_name: data.customName || null,
        portions: data.portions || 1
    })

    if (error) return { error: 'Error agregando plato' }
    revalidatePath(`/clients/${clientId}`)
    return { success: true }
}

// 3. Remove Dish
export async function removeDish(itemId: string, clientId: string) {
    const supabase = await createClient()
    await supabase.from('weekly_meal_plan_items').delete().eq('id', itemId)
    revalidatePath(`/clients/${clientId}`)
}

// 4. Toggle Skip Meal
export async function toggleMealSkip(mealId: string, currentSkip: boolean, clientId: string) {
    const supabase = await createClient()
    await supabase.from('weekly_meal_plan_meals').update({ is_skipped: !currentSkip }).eq('id', mealId)
    revalidatePath(`/clients/${clientId}`)
}

// 5. Copy Day
export async function copyDay(sourceDayId: string, targetDayId: string, clientId: string) {
    const supabase = await createClient()

    // Fetch source day structure
    const { data: sourceDay } = await supabase
        .from('weekly_meal_plan_days')
        .select(`
            meals:weekly_meal_plan_meals(
                *,
                items:weekly_meal_plan_items(*)
            )
        `)
        .eq('id', sourceDayId)
        .single()

    if (!sourceDay) return { error: 'Día origen no encontrado' }

    // Fetch target day meals to match names (or wipe and recreate? Wiping is cleaner but ID changes)
    // Strategy: Wipe target day meals and recreate them exactly as source day

    // 1. Delete existing meals in target day (cascading deletes items)
    await supabase.from('weekly_meal_plan_meals').delete().eq('day_id', targetDayId)

    // 2. Insert new meals and items
    // Since we can't easily deep insert with potentially different IDs in one go without complex logic,
    // we'll loop. It's 4-5 meals, so acceptable.

    for (const sourceMeal of sourceDay.meals) {
        const { data: newMeal } = await supabase.from('weekly_meal_plan_meals').insert({
            day_id: targetDayId,
            name: sourceMeal.name,
            sort_order: sourceMeal.sort_order,
            is_skipped: sourceMeal.is_skipped
        }).select().single()

        if (newMeal && sourceMeal.items.length > 0) {
            const itemsToInsert = sourceMeal.items.map((item: any) => ({
                meal_id: newMeal.id,
                recipe_id: item.recipe_id,
                custom_name: item.custom_name,
                portions: item.portions
            }))
            await supabase.from('weekly_meal_plan_items').insert(itemsToInsert)
        }
    }

    revalidatePath(`/clients/${clientId}`)
    return { success: true }
}

// 6. Register Meal Log (Photo)
export async function registerMealLog(clientId: string, mealType: string, formData: FormData) {
    const supabase = await createClient()
    const file = formData.get('file') as File

    if (!file) return { error: 'No se encontró archivo' }

    // 1. Upload to Storage
    // Path: client_id/date/timestamp_filename
    const dateStr = new Date().toISOString().split('T')[0]
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const filePath = `${clientId}/${dateStr}/${timestamp}.${fileExt}`

    const { error: uploadError } = await supabase.storage
        .from('meal-logs')
        .upload(filePath, file)

    if (uploadError) {
        console.error('Upload error:', uploadError)
        return { error: 'Error al subir imagen' }
    }

    // 2. Insert into DB
    const { error: dbError } = await supabase
        .from('meal_logs')
        .insert({
            client_id: clientId,
            image_path: filePath,
            meal_type: mealType,
            status: 'pending'
        })

    if (dbError) {
        console.error('DB error:', dbError)
        return { error: 'Error al guardar registro' }
    }

    revalidatePath(`/dashboard/diet`) // Client view
    revalidatePath(`/clients/${clientId}`) // Coach view
    return { success: true }
}

// 7. Get Daily Meal Logs
export async function getDailyMealLogs(clientId: string, date: string) {
    const supabase = await createClient()

    // date format YYYY-MM-DD
    // Filter logs created on that date (using created_at)
    // created_at is timestamptz. 
    const startOfDay = `${date} 00:00:00`
    const endOfDay = `${date} 23:59:59`

    const { data: logs } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('client_id', clientId)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false })

    // Generate public URLs for images
    const logsWithUrls = await Promise.all((logs || []).map(async (log) => {
        const { data } = await supabase.storage.from('meal-logs').createSignedUrl(log.image_path, 3600 * 24) // 24h url
        return {
            ...log,
            signedUrl: data?.signedUrl
        }
    }))

    return { logs: logsWithUrls }
}

// 8. Review Meal Log
export async function reviewMealLog(logId: string, status: 'pending' | 'reviewed', comment?: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('meal_logs')
        .update({ status, coach_comment: comment })
        .eq('id', logId)

    if (error) return { error: 'Error actualizando registro' }

    return { success: true }
}

