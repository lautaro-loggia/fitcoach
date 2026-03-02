'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getTodayString } from '@/lib/utils'
import { createNotification } from '@/lib/notifications'
import { consumeRateLimit } from '@/lib/security/rate-limit'

export type MealConfig = {
    name: string
    included: boolean
}

function normalizeMealLogImagePath(imagePath: unknown): string | null {
    if (typeof imagePath !== 'string') return null

    const rawValue = imagePath.trim()
    if (!rawValue || rawValue === 'no-image') return null

    const valueWithoutQuery = rawValue.split('?')[0]

    // Legacy data may include full URLs (public or signed). Extract path after /meal-logs/.
    if (/^https?:\/\//i.test(valueWithoutQuery)) {
        try {
            const parsed = new URL(valueWithoutQuery)
            const decodedPath = decodeURIComponent(parsed.pathname)
            const marker = '/meal-logs/'
            const markerIndex = decodedPath.indexOf(marker)
            if (markerIndex >= 0) {
                return decodedPath.slice(markerIndex + marker.length).replace(/^\/+/, '')
            }
            return null
        } catch {
            return null
        }
    }

    const normalized = decodeURIComponent(valueWithoutQuery)
    const marker = '/meal-logs/'
    if (normalized.includes(marker)) {
        const [, rest] = normalized.split(marker)
        return rest?.replace(/^\/+/, '') || null
    }

    return normalized.replace(/^\/+/, '').replace(/^meal-logs\//, '')
}

async function createMealLogSignedUrl(
    adminSupabase: ReturnType<typeof createAdminClient>,
    imagePath: string
): Promise<string | null> {
    const bucket = adminSupabase.storage.from('meal-logs')

    // Primary path: transformed image for faster rendering
    const { data: transformedData, error: transformedError } = await bucket.createSignedUrl(imagePath, 3600 * 24, {
        transform: {
            width: 1280,
            quality: 72,
        },
    })

    if (transformedData?.signedUrl) {
        return transformedData.signedUrl
    }

    // Fallback: sign without transforms (works when image transforms are disabled/unsupported)
    const { data: signedData, error: signError } = await bucket.createSignedUrl(imagePath, 3600 * 24)
    if (signedData?.signedUrl) {
        return signedData.signedUrl
    }

    if (transformedError || signError) {
        console.warn('getDailyMealLogs: could not sign image URL', {
            imagePath,
            transformedError: transformedError?.message,
            signError: signError?.message,
        })
    }

    // Final fallback for public buckets.
    const { data: publicData } = bucket.getPublicUrl(imagePath)
    return publicData?.publicUrl ?? null
}

async function authorizeClientAccess(
    clientId: string,
    options?: { allowClientSelf?: boolean }
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { ok: false, error: 'No autorizado' }
    }

    const adminSupabase = createAdminClient()
    const { data: client } = await adminSupabase
        .from('clients')
        .select('id, trainer_id, user_id')
        .eq('id', clientId)
        .maybeSingle()

    if (!client) {
        return { ok: false, error: 'Cliente no encontrado' }
    }

    if (client.trainer_id === user.id) {
        return { ok: true, userId: user.id }
    }

    if (options?.allowClientSelf && client.user_id === user.id) {
        return { ok: true, userId: user.id }
    }

    return { ok: false, error: 'No autorizado' }
}

export async function getWeeklyPlan(clientId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { plan: null }
    }

    // Verify ownership
    let { data: clientCheck, error: clientCheckError } = await supabase
        .from('clients')
        .select('id, trainer_id')
        .eq('id', clientId)
        .single()

    if (clientCheckError || !clientCheck || clientCheck.trainer_id !== user.id) {
        console.error('getWeeklyPlan: Auth check failed via regular RLS, fetching with admin...')

        const { data: adminCheck } = await createAdminClient()
            .from('clients')
            .select('id, trainer_id')
            .eq('id', clientId)
            .single()

        if (!adminCheck || adminCheck.trainer_id !== user.id) {
            return { plan: null }
        }
    }

    const adminSupabase = createAdminClient()

    // Attempt to fetch existing active plan
    const { data: plan, error: planError } = await adminSupabase
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
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

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
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    // Auth check: Ensure the coach owns this client
    let { data: clientCheck, error: clientCheckError } = await supabase
        .from('clients')
        .select('id, trainer_id')
        .eq('id', clientId)
        .single()

    if (clientCheckError || !clientCheck || clientCheck.trainer_id !== user.id) {
        console.error('Auth check failed via regular RLS, fetching with admin...', { clientCheckError, clientCheck })

        const { data: adminCheck } = await createAdminClient()
            .from('clients')
            .select('id, trainer_id')
            .eq('id', clientId)
            .single()

        if (!adminCheck || adminCheck.trainer_id !== user.id) {
            console.error('Auth check failed via admin too. Real Trainer:', adminCheck?.trainer_id, 'Requested:', user.id)
            return { error: 'No autorizado para este cliente' }
        }
    }

    // Bypass RLS for the inserts due to complex hierarchical policies failing
    const adminSupabase = createAdminClient()

    // 0. Archive any existing active plans
    await adminSupabase
        .from('weekly_meal_plans')
        .update({ status: 'archived' })
        .eq('client_id', clientId)
        .eq('status', 'active')

    // 1. Create Plan
    const { data: plan, error: planError } = await adminSupabase
        .from('weekly_meal_plans')
        .insert({ client_id: clientId })
        .select()
        .single()

    if (planError) {
        console.error('Error creando plan:', planError)
        return { error: 'Error creando plan' }
    }

    // 2. Create Days (1-7)
    const daysToInsert = Array.from({ length: 7 }, (_, i) => ({
        plan_id: plan.id,
        day_of_week: i + 1
    }))

    const { data: days, error: daysError } = await adminSupabase
        .from('weekly_meal_plan_days')
        .insert(daysToInsert)
        .select()

    if (daysError) {
        console.error('Error creando días:', daysError)
        return { error: 'Error creando días' }
    }

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

    const { error: mealsError } = await adminSupabase
        .from('weekly_meal_plan_meals')
        .insert(mealsToInsert)

    if (mealsError) {
        console.error('Error configurando comidas:', mealsError)
        return { error: 'Error configurando comidas' }
    }

    revalidatePath(`/clients/${clientId}`)
    return { success: true, planId: plan.id }
}

export async function updateReviewDate(planId: string, clientId: string, date: string | null) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    // Auth check
    let { data: clientCheck, error: clientCheckError } = await supabase
        .from('clients')
        .select('id, trainer_id')
        .eq('id', clientId)
        .single()

    if (clientCheckError || !clientCheck || clientCheck.trainer_id !== user.id) {
        const { data: adminCheck } = await createAdminClient()
            .from('clients')
            .select('id, trainer_id')
            .eq('id', clientId)
            .single()

        if (!adminCheck || adminCheck.trainer_id !== user.id) return
    }

    const adminSupabase = createAdminClient()
    await adminSupabase.from('weekly_meal_plans').update({ review_date: date }).eq('id', planId)
    revalidatePath(`/clients/${clientId}`)
}

// 2. Add Dish to Meal
export async function addDishToMeal(mealId: string, clientId: string, data: {
    recipeId?: string,
    customName?: string,
    portions?: number
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'No autorizado' }

    // Auth check
    let { data: clientCheck, error: clientCheckError } = await supabase
        .from('clients')
        .select('id, trainer_id')
        .eq('id', clientId)
        .single()

    if (clientCheckError || !clientCheck || clientCheck.trainer_id !== user.id) {
        const { data: adminCheck } = await createAdminClient()
            .from('clients')
            .select('id, trainer_id')
            .eq('id', clientId)
            .single()

        if (!adminCheck || adminCheck.trainer_id !== user.id) return { error: 'No autorizado' }
    }

    const adminSupabase = createAdminClient()

    const { error } = await adminSupabase.from('weekly_meal_plan_items').insert({
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
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    // Auth check
    let { data: clientCheck, error: clientCheckError } = await supabase
        .from('clients')
        .select('id, trainer_id')
        .eq('id', clientId)
        .single()

    if (clientCheckError || !clientCheck || clientCheck.trainer_id !== user.id) {
        const { data: adminCheck } = await createAdminClient()
            .from('clients')
            .select('id, trainer_id')
            .eq('id', clientId)
            .single()

        if (!adminCheck || adminCheck.trainer_id !== user.id) return
    }

    const adminSupabase = createAdminClient()

    await adminSupabase.from('weekly_meal_plan_items').delete().eq('id', itemId)
    revalidatePath(`/clients/${clientId}`)
}

// 4. Toggle Skip Meal
export async function toggleMealSkip(mealId: string, currentSkip: boolean, clientId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    // Auth check
    let { data: clientCheck, error: clientCheckError } = await supabase
        .from('clients')
        .select('id, trainer_id')
        .eq('id', clientId)
        .single()

    if (clientCheckError || !clientCheck || clientCheck.trainer_id !== user.id) {
        const { data: adminCheck } = await createAdminClient()
            .from('clients')
            .select('id, trainer_id')
            .eq('id', clientId)
            .single()

        if (!adminCheck || adminCheck.trainer_id !== user.id) return
    }

    const adminSupabase = createAdminClient()

    await adminSupabase.from('weekly_meal_plan_meals').update({ is_skipped: !currentSkip }).eq('id', mealId)
    revalidatePath(`/clients/${clientId}`)
}

// 5. Copy Day
export async function copyDay(sourceDayId: string, targetDayId: string, clientId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'No autorizado' }

    // Auth check
    let { data: clientCheck, error: clientCheckError } = await supabase
        .from('clients')
        .select('id, trainer_id')
        .eq('id', clientId)
        .single()

    if (clientCheckError || !clientCheck || clientCheck.trainer_id !== user.id) {
        const { data: adminCheck } = await createAdminClient()
            .from('clients')
            .select('id, trainer_id')
            .eq('id', clientId)
            .single()

        if (!adminCheck || adminCheck.trainer_id !== user.id) return { error: 'No autorizado' }
    }

    const adminSupabase = createAdminClient()

    // Fetch source day structure
    const { data: sourceDay } = await adminSupabase
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
    await adminSupabase.from('weekly_meal_plan_meals').delete().eq('day_id', targetDayId)

    // 2. Insert new meals and items
    // Since we can't easily deep insert with potentially different IDs in one go without complex logic,
    // we'll loop. It's 4-5 meals, so acceptable.

    for (const sourceMeal of sourceDay.meals) {
        const { data: newMeal } = await adminSupabase.from('weekly_meal_plan_meals').insert({
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
            await adminSupabase.from('weekly_meal_plan_items').insert(itemsToInsert)
        }
    }

    revalidatePath(`/clients/${clientId}`)
    return { success: true }
}

// 5a. Add Meal to Day
export async function addMealToDay(dayId: string, name: string, clientId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'No autorizado' }

    // Auth check
    let { data: clientCheck, error: clientCheckError } = await supabase
        .from('clients')
        .select('id, trainer_id')
        .eq('id', clientId)
        .single()

    if (clientCheckError || !clientCheck || clientCheck.trainer_id !== user.id) {
        const { data: adminCheck } = await createAdminClient()
            .from('clients')
            .select('id, trainer_id')
            .eq('id', clientId)
            .single()

        if (!adminCheck || adminCheck.trainer_id !== user.id) return { error: 'No autorizado' }
    }

    const adminSupabase = createAdminClient()

    // Determine max sort_order
    const { data: existingMeals } = await adminSupabase
        .from('weekly_meal_plan_meals')
        .select('sort_order')
        .eq('day_id', dayId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()

    const newSortOrder = existingMeals ? (existingMeals.sort_order + 1) : 0

    const { error } = await adminSupabase.from('weekly_meal_plan_meals').insert({
        day_id: dayId,
        name: name,
        sort_order: newSortOrder
    })

    if (error) return { error: 'Error agregando comida' }
    revalidatePath(`/clients/${clientId}`)
    return { success: true }
}

// 5b. Delete Meal From Day
export async function deleteMealFromDay(mealId: string, clientId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'No autorizado' }

    // Auth check
    let { data: clientCheck, error: clientCheckError } = await supabase
        .from('clients')
        .select('id, trainer_id')
        .eq('id', clientId)
        .single()

    if (clientCheckError || !clientCheck || clientCheck.trainer_id !== user.id) {
        const { data: adminCheck } = await createAdminClient()
            .from('clients')
            .select('id, trainer_id')
            .eq('id', clientId)
            .single()

        if (!adminCheck || adminCheck.trainer_id !== user.id) return { error: 'No autorizado' }
    }

    const adminSupabase = createAdminClient()

    const { error } = await adminSupabase
        .from('weekly_meal_plan_meals')
        .delete()
        .eq('id', mealId)

    if (error) return { error: 'Error eliminando comida' }
    revalidatePath(`/clients/${clientId}`)
    return { success: true }
}

// 6. Register Meal Log (Photo or Manual)
export async function registerMealLog(clientId: string, mealType: string, formData: FormData) {
    console.log('registerMealLog: Start', { clientId, mealType })

    const access = await authorizeClientAccess(clientId, { allowClientSelf: true })
    if (!access.ok) {
        console.error('registerMealLog: unauthorized', access.error)
        return { error: access.error }
    }

    const rate = consumeRateLimit({
        scope: 'meal-log-upload',
        key: access.userId,
        maxRequests: 40,
        windowMs: 15 * 60 * 1000,
    })
    if (!rate.allowed) {
        const retryMinutes = Math.max(1, Math.ceil(rate.retryAfterMs / 60000))
        return { error: `Demasiadas cargas en poco tiempo. Reintenta en ${retryMinutes} min.` }
    }

    const file = formData.get('file') as File | null
    const metadataStr = formData.get('metadata') as string | null
    let metadata = {}

    if (metadataStr) {
        try {
            metadata = JSON.parse(metadataStr)
        } catch (e) {
            console.error('registerMealLog: Invalid metadata JSON')
        }
    }

    // Use admin client to bypass possible RLS issues for now and ensure it works
    const adminSupabase = createAdminClient()

    let filePath = 'no-image'

    // 1. Upload to Storage if file exists
    if (file && file.size > 0) {
        const dateStr = getTodayString()
        const timestamp = Date.now()
        const fileExt =
            file.type === 'image/webp'
                ? 'webp'
                : file.type === 'image/jpeg'
                    ? 'jpg'
                    : file.type === 'image/png'
                        ? 'png'
                        : (file.name.split('.').pop() || 'webp')
        filePath = `${clientId}/${dateStr}/${timestamp}.${fileExt}`

        console.log('registerMealLog: Uploading to storage...', filePath)

        const { error: uploadError } = await adminSupabase.storage
            .from('meal-logs')
            .upload(filePath, file, {
                contentType: file.type || 'image/webp',
                cacheControl: '31536000',
                upsert: false
            })

        if (uploadError) {
            console.error('registerMealLog: Upload error:', uploadError)
            return { error: `Error al subir imagen: ${uploadError.message}` }
        }
    }

    // 2. Insert into DB
    console.log('registerMealLog: Inserting into DB...', { metadata })
    const { error: dbError } = await adminSupabase
        .from('meal_logs')
        .insert({
            client_id: clientId,
            image_path: filePath,
            meal_type: mealType,
            status: 'pending',
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined
        })

    if (dbError) {
        console.error('registerMealLog: DB error:', dbError)
        // Try to clean up the uploaded file if DB insert fails
        if (filePath !== 'no-image') {
            await adminSupabase.storage.from('meal-logs').remove([filePath])
        }
        return { error: `Error al guardar registro: ${dbError.message}` }
    }

    // 3. Notify coach
    try {
        const { data: clientInfo } = await adminSupabase
            .from('clients')
            .select('full_name, trainer_id')
            .eq('id', clientId)
            .single()

        if (clientInfo?.trainer_id) {
            await createNotification({
                userId: clientInfo.trainer_id,
                type: 'meal_photo_reminder',
                title: 'Nueva comida registrada',
                body: `${clientInfo.full_name} subió una foto de su comida (${mealType}).`,
                data: {
                    clientId,
                    url: `/clients/${clientId}?tab=diet`
                }
            })
        }
    } catch (notificationError) {
        console.error('registerMealLog: Notification error:', notificationError)
        // Notification failure should not block meal log creation
    }

    console.log('registerMealLog: Success')
    revalidatePath(`/dashboard/diet`)
    revalidatePath(`/clients/${clientId}`)
    return { success: true }
}

// 7. Get Daily Meal Logs
export async function getDailyMealLogs(clientId: string, date: string) {
    const access = await authorizeClientAccess(clientId, { allowClientSelf: true })
    if (!access.ok) {
        return { logs: [], error: access.error }
    }

    const adminSupabase = createAdminClient()

    const { data: logs } = await adminSupabase
        .from('meal_logs')
        .select('*')
        .eq('client_id', clientId)
        // Adjusting to local date comparison in Postgres if possible, or using simple string filters
        // Since created_at is timestamptz, we compare with the start and end of that day in ART (-03:00)
        .gte('created_at', `${date}T00:00:00-03:00`)
        .lte('created_at', `${date}T23:59:59-03:00`)
        .order('created_at', { ascending: false })

    // Generate public URLs for images
    // adminSupabase is already defined above
    const logsWithUrls = await Promise.all((logs || []).map(async (log) => {
        const normalizedPath = normalizeMealLogImagePath(log.image_path)
        const existingUrl = typeof log.image_path === 'string' && /^https?:\/\//i.test(log.image_path)
            ? log.image_path
            : null

        if (!normalizedPath) {
            return existingUrl
                ? { ...log, signedUrl: existingUrl }
                : log
        }

        const signedUrl = await createMealLogSignedUrl(adminSupabase, normalizedPath)
        return {
            ...log,
            image_path: normalizedPath,
            signedUrl: signedUrl || existingUrl || undefined,
        }
    }))

    return { logs: logsWithUrls }
}

// 8. Review Meal Log
export async function reviewMealLog(logId: string, status: 'pending' | 'reviewed', comment?: string) {
    const adminSupabase = createAdminClient()
    const { data: mealLog } = await adminSupabase
        .from('meal_logs')
        .select('id, client_id')
        .eq('id', logId)
        .maybeSingle()

    if (!mealLog) {
        return { error: 'Registro no encontrado' }
    }

    const access = await authorizeClientAccess(mealLog.client_id, { allowClientSelf: false })
    if (!access.ok) {
        return { error: access.error }
    }


    const { error } = await adminSupabase
        .from('meal_logs')
        .update({ status, coach_comment: comment })
        .eq('id', logId)

    if (error) return { error: 'Error actualizando registro' }

    return { success: true }
}

// 9. Delete Meal Log
export async function deleteMealLog(logId: string, imagePath: string) {
    const adminSupabase = createAdminClient()
    const { data: mealLog } = await adminSupabase
        .from('meal_logs')
        .select('id, client_id, image_path')
        .eq('id', logId)
        .maybeSingle()

    if (!mealLog) {
        return { error: 'Registro no encontrado' }
    }

    const access = await authorizeClientAccess(mealLog.client_id, { allowClientSelf: true })
    if (!access.ok) {
        return { error: access.error }
    }

    // 1. Delete from DB
    const { error: dbError } = await adminSupabase
        .from('meal_logs')
        .delete()
        .eq('id', logId)

    if (dbError) {
        console.error('deleteMealLog: DB error:', dbError)
        return { error: 'Error al eliminar el registro' }
    }

    // 2. Delete from Storage
    const { error: storageError } = await adminSupabase.storage
        .from('meal-logs')
        .remove([mealLog.image_path || imagePath])

    if (storageError) {
        console.error('deleteMealLog: Storage error:', storageError)
        // We continue anyway since the DB record is gone, but log it
    }

    revalidatePath('/dashboard/diet')
    return { success: true }
}

// 10. Check pending meal logs for a client
export async function getPendingMealLogsCount(clientId: string): Promise<{ count: number | null }> {
    const access = await authorizeClientAccess(clientId, { allowClientSelf: false })
    if (!access.ok) {
        return { count: 0 }
    }

    const adminSupabase = createAdminClient()
    const { count, error } = await adminSupabase
        .from('meal_logs')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('status', 'pending')

    if (error) {
        console.error('Error checking pending logs', error)
        return { count: 0 }
    }
    return { count }
}

export async function markAllPendingMealLogsAsReviewed(clientId: string): Promise<{ success: boolean; error?: string }> {
    const access = await authorizeClientAccess(clientId, { allowClientSelf: false })
    if (!access.ok) {
        return { success: false, error: access.error }
    }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
        .from('meal_logs')
        .update({ status: 'reviewed' })
        .eq('client_id', clientId)
        .eq('status', 'pending')

    if (error) {
        console.error('Error marking meal logs as reviewed', error)
        return { success: false, error: 'Error al marcar comidas como revisadas' }
    }

    revalidatePath(`/clients/${clientId}`)
    return { success: true }
}
