"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Dumbbell, Utensils, LineChart } from "lucide-react"
import { cn } from "@/lib/utils"

export function MobileNav() {
    const pathname = usePathname()

    const navItems = [
        {
            href: "/dashboard",
            label: "Inicio",
            icon: Home,
            isActive: (path: string) => path === "/dashboard" || path === "/dashboard/"
        },
        {
            href: "/dashboard/workout",
            label: "Entrenar",
            icon: Dumbbell,
            isActive: (path: string) => path.startsWith("/dashboard/workout")
        },
        {
            href: "/dashboard/diet",
            label: "Nutrición",
            icon: Utensils,
            isActive: (path: string) => path.startsWith("/dashboard/diet")
        },
        {
            href: "/dashboard/progress",
            label: "Progreso",
            icon: LineChart,
            isActive: (path: string) => path.startsWith("/dashboard/progress")
        }
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-white h-16 px-4 pb-safe z-50">
            <div className="mx-auto max-w-md h-full flex items-center justify-around">
                {navItems.map((item) => {
                    const active = item.isActive(pathname)
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200",
                                active ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
                            )}
                        >
                            <item.icon
                                className={cn("h-6 w-6 transition-transform duration-200", active && "scale-110")}
                                strokeWidth={active ? 2.5 : 2}
                            />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
