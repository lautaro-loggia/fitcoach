'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// This key should be in env vars
const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export type PushSubscriptionState = 'unsupported' | 'denied' | 'prompt' | 'granted'

export function usePushNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>('default')
    const [subscription, setSubscription] = useState<PushSubscription | null>(null)
    const [isSupported, setIsSupported] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    const supabase = createClient()

    useEffect(() => {
        // Check support
        if (
            typeof window !== 'undefined' &&
            'serviceWorker' in navigator &&
            'PushManager' in window
        ) {
            setIsSupported(true)
            setPermission(Notification.permission)
            registerServiceWorker()
        } else {
            setIsSupported(false)
            setIsLoading(false)
        }
    }, [])

    const registerServiceWorker = async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
                updateViaCache: 'none',
            })

            // Check if already subscribed
            const sub = await registration.pushManager.getSubscription()
            setSubscription(sub)

            if (sub && Notification.permission === 'granted') {
                // Background sync subscription to DB to ensure it exists
                await syncSubscriptionToDb(sub)
            }
        } catch (error) {
            console.error('Error registering SW:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/')

        const rawData = window.atob(base64)
        const outputArray = new Uint8Array(rawData.length)

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i)
        }
        return outputArray
    }

    const syncSubscriptionToDb = async (sub: PushSubscription) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const serializedSub = JSON.parse(JSON.stringify(sub))

        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: user.id,
                endpoint: serializedSub.endpoint,
                p256dh: serializedSub.keys.p256dh,
                auth: serializedSub.keys.auth,
                user_agent: navigator.userAgent
            }, {
                onConflict: 'endpoint'
            })

        if (error) {
            console.error('Error syncing subscription to DB:', error)
        }
    }

    const subscribe = async () => {
        if (!isSupported) return
        if (!PUBLIC_VAPID_KEY) {
            console.error('Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY')
            return
        }

        try {
            setIsLoading(true)

            // Request permission
            const permissionResult = await Notification.requestPermission()
            setPermission(permissionResult)

            if (permissionResult !== 'granted') {
                throw new Error('Permission denied')
            }

            const registration = await navigator.serviceWorker.ready

            // Check if already subscribed
            let sub = await registration.pushManager.getSubscription()

            if (!sub) {
                // Subscribe fresh
                const applicationServerKey = urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
                sub = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey
                })
            } else {
                // If subscribed, verify key matches (optional, but good practice). 
                // For now we just sync existing one.
                console.log('Using existing subscription')
            }

            setSubscription(sub)
            await syncSubscriptionToDb(sub)

            return sub
        } catch (error) {
            console.error('Error subscribing:', error)

            // Retry logic: Unsubscribe and try again (fixes some AbortError cases)
            try {
                console.log('Retrying subscription with cleanup...')
                const registration = await navigator.serviceWorker.ready

                // 1. Unsubscribe existing if any
                const existingSub = await registration.pushManager.getSubscription()
                if (existingSub) {
                    await existingSub.unsubscribe()
                }

                // 2. Unregister SW to clear any bad state
                await registration.unregister()

                // 3. Re-register SW
                const newRegistration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/',
                    updateViaCache: 'none',
                })
                await navigator.serviceWorker.ready

                // 4. Try subscribing again
                const applicationServerKey = urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
                const newSub = await newRegistration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey
                })

                setSubscription(newSub)
                await syncSubscriptionToDb(newSub)
                return newSub

            } catch (retryError) {
                console.error('Retry failed:', retryError)
                throw error
            }

            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const unsubscribe = async () => {
        if (!subscription) return

        try {
            setIsLoading(true)
            await subscription.unsubscribe()

            // Remove from DB
            const serializedSub = JSON.parse(JSON.stringify(subscription))
            await supabase
                .from('push_subscriptions')
                .delete()
                .eq('endpoint', serializedSub.endpoint)

            setSubscription(null)
            setPermission('default') // Logic reset, though browser permission remains
        } catch (error) {
            console.error('Error unsubscribing:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return {
        isSupported,
        permission,
        subscription,
        isLoading,
        subscribe,
        unsubscribe
    }
}
