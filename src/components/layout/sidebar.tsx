'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    Users,
    LayoutDashboard,
    Utensils,
    Dumbbell,
    CreditCard,
    Settings,
    LogOut
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navigation = [
    { name: 'Inicio', href: '/', icon: LayoutDashboard },
    { name: 'Mis asesorados', href: '/clients', icon: Users },
    { name: 'Recetas', href: '/recipes', icon: Utensils },
    { name: 'Entrenamientos', href: '/workouts', icon: Dumbbell },
    { name: 'Pagos', href: '/payments', icon: CreditCard },
    { name: 'Ajustes', href: '/settings', icon: Settings },
]

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
            <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
                <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-white font-bold mr-2">F</div>
                <span className="font-bold text-xl tracking-tight text-foreground">FITCOACH</span>
            </div>

            <div className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.name}
                        </Link>
                    )
                })}
            </div>

            <div className="p-4 border-t border-sidebar-border">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive"
                    onClick={handleSignOut}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                </Button>
            </div>
        </div>
    )
}
