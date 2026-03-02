'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    UserGroupIcon,
    Home01Icon,
    KitchenUtensilsIcon,
    Dumbbell01Icon,
    CreditCardIcon,
    Settings01Icon,
    PanelLeftCloseIcon,
    PanelLeftOpenIcon
} from 'hugeicons-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useSidebar } from './sidebar-context'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useOrbitMotion } from '@/components/motion/orbit-motion-provider'
import { getHoverGesture, getTapGesture, orbitMotionTransitions } from '@/lib/motion/presets'

const mainNavigation = [
    { name: 'Inicio', href: '/', icon: Home01Icon },
    { name: 'Asesorados', href: '/clients', icon: UserGroupIcon },
    { name: 'Recetas', href: '/recipes', icon: KitchenUtensilsIcon },
    { name: 'Entrenamientos', href: '/workouts', icon: Dumbbell01Icon },
    { name: 'Finanzas', href: '/pagos', icon: CreditCardIcon }
]

const bottomNavigation = [
    { name: 'Ajustes', href: '/settings', icon: Settings01Icon }
]

interface CoachProfile {
    fullName: string
    avatarUrl: string | null
}

function getInitials(name: string) {
    const words = name.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return 'CO'
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
    return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

function getFirstName(name: string) {
    const [firstName] = name.trim().split(/\s+/).filter(Boolean)
    return firstName || 'Coach'
}

function SidebarContent({
    collapsed,
    coachProfile,
    onNavigate,
    toggleSidebar
}: {
    collapsed: boolean
    coachProfile: CoachProfile
    onNavigate?: () => void
    toggleSidebar?: () => void
}) {
    const pathname = usePathname()
    const { level } = useOrbitMotion()
    const hoverGesture = getHoverGesture(level)
    const tapGesture = getTapGesture(level)

    return (
        <div className="h-full flex flex-col bg-white">
            <div className={cn(
                'h-16 border-b border-border flex items-center',
                collapsed ? 'justify-center px-2' : 'justify-between px-4'
            )}>
                {collapsed ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        <PanelLeftOpenIcon className="h-4 w-4" />
                    </Button>
                ) : (
                    <>
                        <Image
                            src="/orbit_logo_black.png"
                            alt="Orbit"
                            width={104}
                            height={32}
                            className="h-8 w-auto"
                            priority
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                            <PanelLeftCloseIcon className="h-4 w-4" />
                        </Button>
                    </>
                )}
            </div>

            <nav className={cn(
                'flex-1 pt-3',
                collapsed ? 'px-2' : 'px-3'
            )}>
                <div className="flex flex-col gap-1">
                    {mainNavigation.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                prefetch
                                onClick={onNavigate}
                                title={collapsed ? item.name : undefined}
                                className={cn(
                                    'relative h-10 rounded-lg flex items-center text-sm transition-colors overflow-hidden',
                                    collapsed ? 'justify-center' : 'px-3 gap-3',
                                    isActive
                                        ? 'text-white'
                                        : 'text-[#8c929c] hover:bg-[#f4f4f5] hover:text-[#101019]'
                                )}
                            >
                                {isActive && (
                                    <motion.span
                                        layoutId={collapsed ? 'coach-sidebar-active-collapsed' : 'coach-sidebar-active'}
                                        className="absolute inset-0 rounded-lg bg-[#0e0e0e]"
                                        transition={orbitMotionTransitions.fast}
                                    />
                                )}
                                <motion.span
                                    className={cn('relative z-10 flex items-center', collapsed ? '' : 'gap-3')}
                                    whileHover={hoverGesture}
                                    whileTap={tapGesture}
                                    transition={orbitMotionTransitions.fast}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {!collapsed && <span className="font-medium">{item.name}</span>}
                                </motion.span>
                            </Link>
                        )
                    })}
                </div>
            </nav>

            <div className="border-t border-border p-2 space-y-2">
                {bottomNavigation.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href)
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            prefetch
                            onClick={onNavigate}
                            title={collapsed ? item.name : undefined}
                            className={cn(
                                'relative h-10 rounded-lg flex items-center text-sm transition-colors overflow-hidden',
                                collapsed ? 'justify-center' : 'px-3 gap-3',
                                isActive
                                    ? 'text-white'
                                    : 'text-[#8c929c] hover:bg-[#f4f4f5] hover:text-[#101019]'
                            )}
                        >
                            {isActive && (
                                <motion.span
                                    layoutId={collapsed ? 'coach-sidebar-bottom-active-collapsed' : 'coach-sidebar-bottom-active'}
                                    className="absolute inset-0 rounded-lg bg-[#0e0e0e]"
                                    transition={orbitMotionTransitions.fast}
                                />
                            )}
                            <motion.span
                                className={cn('relative z-10 flex items-center', collapsed ? '' : 'gap-3')}
                                whileHover={hoverGesture}
                                whileTap={tapGesture}
                                transition={orbitMotionTransitions.fast}
                            >
                                <item.icon className="h-5 w-5" />
                                {!collapsed && <span className="font-medium">{item.name}</span>}
                            </motion.span>
                        </Link>
                    )
                })}

                <div
                    className={cn(
                        'rounded-lg border border-[#ececef] bg-[#fafafa] flex items-center',
                        collapsed ? 'justify-center p-2' : 'px-3 py-2 gap-3'
                    )}
                >
                    <Avatar className="h-8 w-8 border border-black/5">
                        <AvatarImage src={coachProfile.avatarUrl || undefined} alt={coachProfile.fullName} />
                        <AvatarFallback className="bg-[#e9ecef] text-[#101019] text-xs font-semibold">
                            {getInitials(coachProfile.fullName)}
                        </AvatarFallback>
                    </Avatar>
                    {!collapsed && (
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-[#101019] truncate">{getFirstName(coachProfile.fullName)}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export function Sidebar({ coachProfile }: { coachProfile: CoachProfile }) {
    const { collapsed, toggleSidebar, mobileOpen, setMobileOpen } = useSidebar()

    return (
        <>
            <motion.div
                layout
                className={cn(
                    'hidden md:flex h-full border-r border-border bg-white transition-all duration-300 ease-in-out',
                    collapsed ? 'w-20' : 'w-[207px]'
                )}
                transition={orbitMotionTransitions.fast}
            >
                <SidebarContent
                    collapsed={collapsed}
                    coachProfile={coachProfile}
                    toggleSidebar={toggleSidebar}
                />
            </motion.div>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetContent side="left" className="w-[270px] p-0 bg-white">
                    <SheetTitle className="sr-only">Menú principal</SheetTitle>
                    <SidebarContent
                        collapsed={false}
                        coachProfile={coachProfile}
                        onNavigate={() => setMobileOpen(false)}
                        toggleSidebar={() => setMobileOpen(false)}
                    />
                </SheetContent>
            </Sheet>
        </>
    )
}
