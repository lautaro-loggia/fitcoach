"use client"

import { usePathname } from "next/navigation"
import { useClientPresenceHeartbeat } from '@/hooks/use-client-presence-heartbeat'

export function ClientMainShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isOnboarding = pathname?.startsWith('/onboarding')
    const isDashboardArea = pathname?.startsWith('/dashboard')

    useClientPresenceHeartbeat(Boolean(isDashboardArea && !isOnboarding))

    return (
        <main className="flex-1 w-full max-w-md mx-auto relative flex flex-col">
            {children}
        </main>
    )
}
