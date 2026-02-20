'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// This key should be in env vars. If missing in client bundle, we fetch a runtime fallback from API.
const BUILD_TIME_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

export type PushSubscriptionState = 'unsupported' | 'denied' | 'prompt' | 'granted'

export function usePushNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>('default')
    const [subscription, setSubscription] = useState<PushSubscription | null>(null)
    const [isSupported, setIsSupported] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [publicVapidKey, setPublicVapidKey] = useState(BUILD_TIME_VAPID_KEY)

    const supabase = useMemo(() => createClient(), [])

    const syncSubscriptionToDb = useCallback(async (sub: PushSubscription) => {
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
            throw new Error('No se pudo guardar la suscripción push en la base de datos.')
        }
    }, [supabase])

    useEffect(() => {
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

        // Check support (requires secure context + Notification API + SW + PushManager)
        const canUsePushApi =
            typeof window !== 'undefined' &&
            window.isSecureContext &&
            'Notification' in window &&
            'serviceWorker' in navigator &&
            'PushManager' in window

        if (canUsePushApi) {
            setIsSupported(true)
            setPermission(Notification.permission)
            registerServiceWorker()
        } else {
            setIsSupported(false)
            setIsLoading(false)
        }
    }, [syncSubscriptionToDb])

    useEffect(() => {
        if (publicVapidKey) return

        let cancelled = false

        const fetchRuntimeVapidKey = async () => {
            try {
                const response = await fetch('/api/push/vapid-public-key', { cache: 'no-store' })
                if (!response.ok) return

                const payload = (await response.json()) as { key?: string }
                const key = typeof payload.key === 'string' ? payload.key.trim() : ''

                if (!cancelled && key) {
                    setPublicVapidKey(key)
                }
            } catch (error) {
                console.error('Error loading runtime VAPID key:', error)
            }
        }

        void fetchRuntimeVapidKey()

        return () => {
            cancelled = true
        }
    }, [publicVapidKey])

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

    const subscribe = async () => {
        if (!isSupported) {
            throw new Error('Este navegador o contexto no soporta notificaciones push.')
        }
        if (!publicVapidKey) {
            throw new Error('Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY en la configuración.')
        }

        try {
            setIsLoading(true)

            let permissionResult = Notification.permission

            if (permissionResult === 'denied') {
                setPermission('denied')
                throw new Error('Las notificaciones están bloqueadas en el navegador.')
            }

            // Request permission only when browser has not been prompted yet
            if (permissionResult === 'default') {
                permissionResult = await Notification.requestPermission()
            }

            setPermission(permissionResult)

            if (permissionResult !== 'granted') {
                throw new Error('No se otorgó permiso para notificaciones.')
            }

            const registration = await navigator.serviceWorker.ready

            // Check if already subscribed
            let sub = await registration.pushManager.getSubscription()

            if (!sub) {
                // Subscribe fresh
                const applicationServerKey = urlBase64ToUint8Array(publicVapidKey.trim())
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

            const isRetryableError =
                error instanceof DOMException &&
                (error.name === 'AbortError' || error.name === 'InvalidStateError')

            if (!isRetryableError) {
                throw error
            }

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
                const applicationServerKey = urlBase64ToUint8Array(publicVapidKey.trim())
                const newSub = await newRegistration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey
                })

                setSubscription(newSub)
                await syncSubscriptionToDb(newSub)
                return newSub

            } catch (retryError) {
                console.error('Retry failed:', retryError)
                throw retryError
            }
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
            // Keep UI aligned with the real browser permission state.
            setPermission(Notification.permission)
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
