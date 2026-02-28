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
    | 'coach_urgent_alert'
    | 'coach_retention_alert'
    | 'coach_weekly_milestone'

interface CreateNotificationParams {
    userId: string
    type: NotificationType
    title: string
    body: string
    data?: Record<string, unknown>
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
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                type,
                title,
                body,
                data: data || {},
                read: false
            })

        if (error) {
            console.error('[createNotification] Error:', error)
            return { error }
        }

        // 3. The push delivery is handled automatically by a Database Webhook 
        // triggering the 'push' Edge Function when a new row is inserted into 'notifications'.
        return { success: true }

    } catch (err) {
        console.error('[createNotification] Unexpected error:', err)
        return { error: err }
    }
}
