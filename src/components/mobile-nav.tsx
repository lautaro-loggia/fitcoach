"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home01Icon, Dumbbell01Icon, KitchenUtensilsIcon, ChartIncreaseIcon } from "hugeicons-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useOrbitMotion } from "@/components/motion/orbit-motion-provider"
import { getTapGesture, orbitMotionTransitions } from "@/lib/motion/presets"

export function MobileNav() {
    const pathname = usePathname()
    const { level } = useOrbitMotion()
    const tapGesture = getTapGesture(level)

    // No mostrar el navbar durante el onboarding o entrenamientos activos
    if (pathname?.startsWith("/onboarding")) return null
    if (pathname?.startsWith("/dashboard/workout/")) return null

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
        <div className="z-50 w-full bg-white border-t border-zinc-100 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] pb-safe sticky bottom-0">
            <nav className="flex items-center justify-between px-6 py-2 max-w-md mx-auto h-[68px]">
                {navItems.map((item) => {
                    const active = item.isActive(pathname)
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "relative flex flex-col items-center justify-center space-y-1 transition-all duration-200 active:scale-95",
                                "flex-1 min-w-[44px]"
                            )}
                        >
                            {active && (
                                <motion.span
                                    layoutId="client-mobile-nav-active"
                                    className="absolute -top-1 h-1 w-6 rounded-full bg-primary/80"
                                    transition={orbitMotionTransitions.fast}
                                />
                            )}
                            <motion.span
                                className="flex flex-col items-center justify-center space-y-1"
                                whileTap={tapGesture}
                                transition={orbitMotionTransitions.fast}
                            >
                                <item.icon
                                    className={cn(
                                        "h-5 w-5 transition-all duration-300",
                                        active ? "text-primary" : "text-muted-foreground"
                                    )}
                                    strokeWidth={active ? 2.5 : 2}
                                />
                                <span className={cn(
                                    "text-[10px] font-bold leading-none transition-colors duration-200",
                                    active ? "text-primary" : "text-muted-foreground"
                                )}>
                                    {item.label}
                                </span>
                            </motion.span>
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
