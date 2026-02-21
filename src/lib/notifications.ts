import { createAdminClient } from '@/lib/supabase/admin'

// Types of notifications for type safety
export type NotificationType =
    | 'checkin_completed'
    | 'workout_completed'
    | 'payment_registered'
    | 'new_client'
    | 'checkin_reminder'
    | 'workout_assigned'
    | 'coach_feedback'
    | 'meal_photo_reminder'

interface CreateNotificationParams {
    userId: string
    type: NotificationType
    title: string
    body: string
    data?: Record<string, any>
}

/**
 * Insert a notification for a user.
 * Uses admin client because the sender and the recipient are different users,
 * and RLS on notification_preferences only allows reading your own row.
 */
export async function createNotification({ userId, type, title, body, data }: CreateNotificationParams) {
    const supabase = createAdminClient()

    try {
        // 1. Check recipient preferences — skip if they opted out
        const { data: preferences } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (preferences) {
            const isEnabled = (preferences as Record<string, unknown>)[type]
            if (isEnabled === false) {
                return { skipped: true }
            }
        }

        // 2. Insert into notifications queue (history)
        const { data: inserted, error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                type,
                title,
                body,
                data: data || {},
                read: false
            })
            .select('id, user_id, type, title, body, data')
            .single()

        if (error) {
            console.error('[createNotification] Error:', error)
            return { error }
        }

        // 3. Trigger push delivery directly via Edge Function.
        // This avoids relying exclusively on a DB webhook setup.
        if (inserted) {
            const { error: pushError } = await supabase.functions.invoke('push', {
                body: {
                    type: 'INSERT',
                    table: 'notifications',
                    schema: 'public',
                    record: inserted
                }
            })

            if (pushError) {
                console.error('[createNotification] Push invoke error:', pushError)
                return { success: true, pushError }
            }
        }

        return { success: true }

    } catch (err) {
        console.error('[createNotification] Unexpected error:', err)
        return { error: err }
    }
}
