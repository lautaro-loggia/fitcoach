'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home01Icon, UserGroupIcon, Dumbbell01Icon, KitchenUtensilsIcon, CreditCardIcon } from 'hugeicons-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useOrbitMotion } from '@/components/motion/orbit-motion-provider'
import { getTapGesture, orbitMotionTransitions } from '@/lib/motion/presets'

export function BottomNav() {
    const pathname = usePathname()
    const { level } = useOrbitMotion()
    const tapGesture = getTapGesture(level)

    const navItems = [
        {
            label: 'Inicio',
            href: '/',
            icon: Home01Icon,
            activePatterns: ['/']
        },
        {
            label: 'Asesorados',
            href: '/clients',
            icon: UserGroupIcon,
            activePatterns: ['/clients']
        },
        {
            label: 'Recetas',
            href: '/recipes',
            icon: KitchenUtensilsIcon,
            activePatterns: ['/recipes']
        },
        {
            label: 'Rutinas',
            href: '/workouts',
            icon: Dumbbell01Icon,
            activePatterns: ['/workouts']
        },
        {
            label: 'Pagos',
            href: '/pagos',
            icon: CreditCardIcon,
            activePatterns: ['/pagos', '/payments']
        }
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex justify-around items-center h-16 pb-safe md:hidden shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
            {navItems.map((item) => {
                const isActive = item.activePatterns.some(p =>
                    p === '/' ? pathname === '/' : pathname.startsWith(p)
                )

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200",
                            isActive
                                ? "text-primary"
                                : "text-muted-foreground hover:text-primary hover:bg-muted/30"
                        )}
                    >
                        {isActive && (
                            <motion.span
                                layoutId="coach-bottom-nav-active"
                                className="absolute top-0 inset-x-0 h-[2px] w-8 mx-auto bg-primary rounded-b-full"
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
                                    "h-6 w-6 transition-all duration-200",
                                    isActive ? "stroke-[2.5]" : "stroke-[1.5]"
                                )}
                            />
                            <span className={cn(
                                "text-[10px] transition-all duration-200",
                                isActive ? "font-semibold" : "font-medium"
                            )}>{item.label}</span>
                        </motion.span>
                    </Link>
                )
            })}
        </div>
    )
}
