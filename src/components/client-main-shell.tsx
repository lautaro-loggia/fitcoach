"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function ClientMainShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isOnboarding = pathname?.startsWith("/onboarding")

    return (
        <main className={cn(
            "w-full max-w-md mx-auto min-h-screen bg-white shadow-sm",
            !isOnboarding && "pb-32"
        )}>
            {children}
        </main>
    )
}
