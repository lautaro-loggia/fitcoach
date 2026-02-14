"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function ClientMainShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isOnboarding = pathname?.startsWith("/onboarding")

    return (
        <main className="flex-1 w-full max-w-md mx-auto relative flex flex-col">
            {children}
        </main>
    )
}
