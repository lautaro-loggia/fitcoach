'use client'

import { useEffect } from 'react'
import { touchClientPresence } from '@/app/(client)/dashboard/actions'

const HEARTBEAT_STORAGE_KEY = 'orbit:client-last-presence-heartbeat'
const HEARTBEAT_INTERVAL_MS = 15 * 60 * 1000

export function useClientPresenceHeartbeat(enabled: boolean) {
    useEffect(() => {
        if (!enabled) return

        const now = Date.now()
        const lastRunRaw = typeof window !== 'undefined' ? window.localStorage.getItem(HEARTBEAT_STORAGE_KEY) : null
        const lastRun = lastRunRaw ? Number(lastRunRaw) : 0

        if (Number.isFinite(lastRun) && now - lastRun < HEARTBEAT_INTERVAL_MS) {
            return
        }

        if (typeof window !== 'undefined') {
            window.localStorage.setItem(HEARTBEAT_STORAGE_KEY, String(now))
        }

        void touchClientPresence()
    }, [enabled])
}
