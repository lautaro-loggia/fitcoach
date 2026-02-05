"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home01Icon, Dumbbell01Icon, KitchenUtensilsIcon, ChartIncreaseIcon } from "hugeicons-react"
import { cn } from "@/lib/utils"

export function MobileNav() {
    const pathname = usePathname()

    // No mostrar el navbar durante el onboarding
    if (pathname?.startsWith("/onboarding")) return null

    const navItems = [
        {
            href: "/dashboard",
            label: "Inicio",
            icon: Home01Icon,
            isActive: (path: string) => path === "/dashboard" || path === "/dashboard/"
        },
        {
            href: "/dashboard/workout",
            label: "Entrenar",
            icon: Dumbbell01Icon,
            isActive: (path: string) => path.startsWith("/dashboard/workout")
        },
        {
            href: "/dashboard/diet",
            label: "Nutrición",
            icon: KitchenUtensilsIcon,
            isActive: (path: string) => path.startsWith("/dashboard/diet")
        },
        {
            href: "/dashboard/progress",
            label: "Progreso",
            icon: ChartIncreaseIcon,
            isActive: (path: string) => path.startsWith("/dashboard/progress")
        }
    ]

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md pointer-events-none">
            <nav className="bg-white/75 backdrop-blur-lg border border-black/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.08)] rounded-[40px] px-6 py-3 flex items-center justify-between pointer-events-auto">
                {navItems.map((item) => {
                    const active = item.isActive(pathname)
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center space-y-1 transition-all duration-200 active:scale-95",
                                "min-w-[44px]" // Área de toque cómoda
                            )}
                        >
                            <item.icon
                                className={cn(
                                    "h-6 w-6 transition-all duration-300",
                                    active ? "text-[#5254D9]" : "text-gray-400"
                                )}
                                strokeWidth={active ? 1.8 : 1.5}
                            />
                            <span className={cn(
                                "text-[10px] font-semibold leading-none transition-colors duration-200",
                                active ? "text-[#5254D9]" : "text-gray-400"
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}

