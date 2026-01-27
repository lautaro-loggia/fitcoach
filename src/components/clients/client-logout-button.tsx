'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Logout01Icon } from 'hugeicons-react'

interface ClientLogoutButtonProps {
    variant?: 'menu-item' | 'button'
    className?: string
}

export function ClientLogoutButton({ variant = 'menu-item', className }: ClientLogoutButtonProps) {
    const router = useRouter()

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/auth/login')
    }

    if (variant === 'button') {
        return (
            <Button
                variant="destructive"
                className={`w-full ${className}`}
                onClick={handleSignOut}
            >
                <Logout01Icon className="mr-2 h-4 w-4" />
                Cerrar sesión
            </Button>
        )
    }

    return (
        <DropdownMenuItem onClick={handleSignOut} className={`text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer ${className}`}>
            <Logout01Icon className="mr-2 h-4 w-4" />
            <span>Cerrar sesión</span>
        </DropdownMenuItem>
    )
}
