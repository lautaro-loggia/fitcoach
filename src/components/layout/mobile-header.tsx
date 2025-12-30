'use client'

import Image from 'next/image'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSidebar } from './sidebar-context'

export function MobileHeader() {
    const { setMobileOpen } = useSidebar()

    return (
        <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-background border-b border-border flex items-center px-4">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(true)}
                className="mr-3"
            >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
            </Button>
            <Image
                src="/orbit_logo_black.png"
                alt="Orbit"
                width={100}
                height={32}
                className="h-7 w-auto object-contain"
                priority
            />
        </header>
    )
}
