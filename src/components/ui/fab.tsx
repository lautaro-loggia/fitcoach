'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from 'next/navigation'

export function FloatingActionButton() {
    const router = useRouter()

    return (
        <div className="fixed bottom-20 right-4 z-50 md:hidden">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        size="icon"
                        className="h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        <Plus className="h-6 w-6" />
                        <span className="sr-only">Crear nuevo</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="w-56 mb-2">
                    <DropdownMenuItem onClick={() => router.push('/clients?new=true')} className="py-3 cursor-pointer">
                        Nuevo Asesorado
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/workouts?new=true')} className="py-3 cursor-pointer">
                        Nueva Rutina
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
