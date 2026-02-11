'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home01Icon, UserGroupIcon, Dumbbell01Icon, Settings01Icon } from 'hugeicons-react'
import { cn } from '@/lib/utils'

export function BottomNav() {
    const pathname = usePathname()

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
            label: 'Rutinas',
            href: '/workouts',
            icon: Dumbbell01Icon,
            activePatterns: ['/workouts']
        },
        {
            label: 'Ajustes',
            href: '/settings',
            icon: Settings01Icon,
            activePatterns: ['/settings']
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
                            "flex flex-col items-center justify-center w-full h-full space-y-1",
                            isActive
                                ? "text-primary font-medium"
                                : "text-muted-foreground hover:text-primary transition-colors"
                        )}
                    >
                        <item.icon
                            className={cn(
                                "h-6 w-6",
                                isActive && "fill-current"
                            )}
                        />
                        <span className="text-[10px]">{item.label}</span>
                    </Link>
                )
            })}
        </div>
    )
}
