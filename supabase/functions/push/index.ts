import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

interface NotificationRecord {
    id: string
    user_id: string
    title: string
    body: string
    type: string
    data: Record<string, any>
}

interface WebhookPayload {
    type: 'INSERT'
    table: string
    record: NotificationRecord
    schema: 'public'
}

Deno.serve(async (req) => {
    const payload: WebhookPayload = await req.json()
    const { record } = payload

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

                // We use web-push library logic manually or import a deno-compatible one.
                // Since Deno standard library for web-push is tricky, calling the endpoint directly is often easier 
                // IF we implement the crypto. BUT doing VAPID crypto manually is hard.
                // It's better to use 'web-push' via npm specifier in Deno if supported (it is in recent versions).

                // Using npm:web-push in Deno
                const webPush = await import('npm:web-push')

                webPush.setVapidDetails(
                    'mailto:soporte@orbit.app', // Update this
                    Deno.env.get('VAPID_PUBLIC_KEY')!,
                    Deno.env.get('VAPID_PRIVATE_KEY')!
                )

                await webPush.sendNotification(pushSubscription, notificationPayload)
                return { success: true, id: sub.id }
            } catch (error) {
                if (error.statusCode === 410 || error.statusCode === 404) {
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
