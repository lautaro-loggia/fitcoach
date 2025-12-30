'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    Users,
    Home,
    Utensils,
    Dumbbell,
    CreditCard,
    Settings,
    LogOut,
    PanelLeftClose,
    PanelLeftOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useSidebar } from './sidebar-context'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

const navigation = [
    { name: 'Inicio', href: '/', icon: Home },
    { name: 'Mis asesorados', href: '/clients', icon: Users },
    { name: 'Recetas', href: '/recipes', icon: Utensils },
    { name: 'Planes de entrenamiento', href: '/workouts', icon: Dumbbell },
    { name: 'Pagos y Planes', href: '/pagos', icon: CreditCard },
    { name: 'Ajustes', href: '/settings', icon: Settings },
]

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
    const pathname = usePathname()
    const router = useRouter()

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    const handleLinkClick = () => {
        if (onNavigate) onNavigate()
    }

    return (
        <>
            <div className={cn(
                "flex h-16 items-center px-4",
                collapsed ? "justify-center" : "justify-start"
            )}>
                {!collapsed && (
                    <div className="flex items-center justify-start px-2 w-full">
                        <Image src="/orbit_logo_v2.png" alt="Orbit" width={120} height={40} className="h-8 w-auto object-contain" priority />
                    </div>
                )}
                {collapsed && (
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">O</div>
                )}
            </div>

            {/* Separator */}
            <div className="px-4 mb-2">
                <div className="border-b border-sidebar-border" />
            </div>

            <div className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            prefetch={true}
                            onClick={handleLinkClick}
                            className={cn(
                                "flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors w-full text-left",
                                collapsed ? "justify-center px-2" : "px-3 gap-3",
                                isActive
                                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                            title={collapsed ? item.name : undefined}
                        >
                            <item.icon className={cn("h-5 w-5", !collapsed && "mr-1")} />
                            {!collapsed && <span>{item.name}</span>}
                        </Link>
                    )
                })}
            </div>

            <div className="p-2 border-t border-sidebar-border">
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive",
                        collapsed ? "justify-center px-0" : "justify-start"
                    )}
                    onClick={handleSignOut}
                    title={collapsed ? "Cerrar sesión" : undefined}
                >
                    <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
                    {!collapsed && "Cerrar sesión"}
                </Button>
            </div>
        </>
    )
}

export function Sidebar() {
    const { collapsed, toggleSidebar, mobileOpen, setMobileOpen } = useSidebar()

    return (
        <>
            {/* Desktop Sidebar */}
            <div
                className={cn(
                    "hidden md:flex h-full flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
                    collapsed ? "w-[70px]" : "w-64"
                )}
            >
                {/* Toggle Button Container - Desktop only */}
                <div className="flex justify-end px-2 py-2 mt-16">
                    <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-6 w-6 text-muted-foreground hover:text-primary">
                        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                    </Button>
                </div>
                <SidebarContent collapsed={collapsed} />
            </div>

            {/* Mobile Sidebar - Sheet */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetContent side="left" className="w-64 p-0 bg-sidebar">
                    <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
                    <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
                </SheetContent>
            </Sheet>
        </>
    )
}

