import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
    Deno.env.get('PRIVATE_SERVICE_ROLE_KEY') ||
    ''
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || ''

interface NotificationRecord {
    id: string
    user_id: string
    title: string
    body: string
    type: string
    data: Record<string, unknown>
}

interface WebhookPayload {
    type: 'INSERT'
    table: string
    record: NotificationRecord
    schema: 'public'
}

Deno.serve(async (req) => {
    if (!supabaseUrl || !serviceRoleKey) {
        return new Response(
            JSON.stringify({
                error: 'Missing Supabase credentials in Edge Function secrets',
                missing: {
                    SUPABASE_URL: !supabaseUrl,
                    SUPABASE_SERVICE_ROLE_KEY_or_PRIVATE_SERVICE_ROLE_KEY: !serviceRoleKey,
                },
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
        return new Response(
            JSON.stringify({
                error: 'Missing VAPID keys in Edge Function secrets',
                missing: {
                    VAPID_PUBLIC_KEY: !vapidPublicKey,
                    VAPID_PRIVATE_KEY: !vapidPrivateKey,
                },
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const payload: WebhookPayload = await req.json()
    const { record } = payload

    if (!record?.user_id) {
        return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        })
    }

    // 1. Get subscriptions for this user
    const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', record.user_id)

    if (!subscriptions || subscriptions.length === 0) {
        return new Response(JSON.stringify({ message: 'No subscriptions found' }), {
            headers: { 'Content-Type': 'application/json' },
        })
    }

    // 2. Prepare notification payload
    const notificationPayload = JSON.stringify({
        title: record.title,
        body: record.body,
        icon: '/icon-192.png',
        data: {
            url: record.data?.url || '/',
            ...record.data
        }
    })

    // 3. Send to all endpoints
    const webPush = await import('npm:web-push')
    webPush.setVapidDetails('mailto:soporte@orbit.app', vapidPublicKey, vapidPrivateKey)

    const results = await Promise.all(
        subscriptions.map(async (sub) => {
            try {
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                }

                await webPush.sendNotification(pushSubscription, notificationPayload)
                return { success: true, id: sub.id }
            } catch (error) {
                const statusCode =
                    typeof error === 'object' && error !== null && 'statusCode' in error
                        ? Number((error as { statusCode: number }).statusCode)
                        : null

                if (statusCode === 410 || statusCode === 404) {
                    // Subscription gone, remove it
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id)
                    return { success: false, id: sub.id, error: 'Gone' }
                }
                console.error('Error sending push:', error)
                return { success: false, id: sub.id, error }
            }
        })
    )

    return new Response(JSON.stringify(results), {
        headers: { 'Content-Type': 'application/json' },
    })
})
