'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Loader2 } from 'lucide-react'
import { Logout01Icon, Settings01Icon } from 'hugeicons-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface CoachHomeUserMenuProps {
    fullName: string
    avatarUrl?: string | null
    className?: string
}

function getInitials(name: string) {
    const words = name.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return 'CO'
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
    return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

export function CoachHomeUserMenu({ fullName, avatarUrl, className }: CoachHomeUserMenuProps) {
    const router = useRouter()
    const [isSigningOut, setIsSigningOut] = useState(false)

    const handleSettings = () => {
        router.push('/settings')
    }

    const handleSignOut = async () => {
        try {
            setIsSigningOut(true)
            const supabase = createClient()
            await supabase.auth.signOut()
            router.push('/login')
            router.refresh()
        } finally {
            setIsSigningOut(false)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className={cn(
                        'h-auto rounded-2xl px-1.5 py-1 data-[state=open]:bg-[#f5f6f7] hover:bg-[#f5f6f7]',
                        className
                    )}
                >
                    <Avatar className="h-10 w-10 border border-[#e4e6ea] shadow-[0_1px_2px_rgba(14,14,14,0.08)]">
                        <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                        <AvatarFallback className="bg-[#e9ecef] text-[#101019] text-xs font-semibold">
                            {getInitials(fullName)}
                        </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-4 w-4 text-[#8c929c]" />
                    <span className="sr-only">Abrir menú de cuenta</span>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-xl border-[#e6e8eb] p-2">
                <DropdownMenuLabel className="px-2 py-1.5">
                    <p className="text-[11px] text-[#8c929c]">Sesión activa</p>
                    <p className="text-sm font-semibold text-[#101019] truncate">{fullName}</p>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleSettings} className="cursor-pointer rounded-lg gap-2.5">
                    <Settings01Icon className="h-4 w-4" />
                    <span>Configuración</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="cursor-pointer rounded-lg gap-2.5 text-red-600 focus:text-red-700 focus:bg-red-50"
                >
                    {isSigningOut ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Logout01Icon className="h-4 w-4" />
                    )}
                    <span>{isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
