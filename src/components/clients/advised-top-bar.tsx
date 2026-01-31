'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft02Icon } from 'hugeicons-react'
import { Button } from '@/components/ui/button'
import { ClientAvatar } from '@/components/clients/client-avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface AdvisedTopBarProps {
    client: {
        id: string
        full_name: string
        status: 'active' | 'inactive'
        avatar_url?: string | null
    }
    allClients?: {
        id: string
        full_name: string
    }[]
    activeTab: string
}

export function AdvisedTopBar({ client, allClients = [], activeTab }: AdvisedTopBarProps) {
    const router = useRouter()

    // Mapeo de tabs con sus respectivos IDs y labels
    // Usaremos los IDs que ya maneja la app actualmente: profile, checkin, training, diet, settings
    const tabs = [
        { id: 'profile', label: 'Resumen', href: `/clients/${client.id}?tab=profile` },
        { id: 'checkin', label: 'Check-in', href: `/clients/${client.id}?tab=checkin` },
        { id: 'training', label: 'Entrenamiento', href: `/clients/${client.id}?tab=training` },
        { id: 'diet', label: 'Nutrición', href: `/clients/${client.id}?tab=diet` },
        { id: 'settings', label: 'Ajustes', href: `/clients/${client.id}?tab=settings` },
    ]

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-white h-16 md:h-[72px]">
            <div className="flex h-full items-center px-4 md:px-6 gap-2 md:gap-4">
                {/* 1. Back Button & Breadcrumb */}
                <div className="flex items-center gap-1 md:gap-2 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:bg-muted"
                        onClick={() => router.push('/clients')}
                    >
                        <ArrowLeft02Icon className="h-5 w-5" />
                    </Button>
                    <div className="hidden lg:flex items-center text-sm font-medium">
                        <Link href="/clients" className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                            Mis asesorados
                        </Link>
                        <span className="mx-2 text-muted-foreground/50">/</span>
                        <span className="text-foreground">Perfil</span>
                    </div>
                </div>

                {/* Separador vertical */}
                <div className="h-8 w-px bg-border hidden md:block mx-1" />

                {/* 2. Identity Section */}
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 md:flex-initial">
                    <ClientAvatar
                        name={client.full_name}
                        avatarUrl={client.avatar_url}
                        size="sm"
                    />
                    <div className="flex flex-col md:flex-row md:items-center gap-0 md:gap-2 min-w-0">
                        {allClients.length > 0 ? (
                            <Select
                                defaultValue={client.id}
                                onValueChange={(value) => router.push(`/clients/${value}?tab=${activeTab}`)}
                            >
                                <SelectTrigger className="w-auto h-auto p-0 border-0 font-bold tracking-tight bg-transparent shadow-none hover:bg-transparent focus:ring-0 gap-1 px-1">
                                    <SelectValue placeholder={client.full_name} />
                                </SelectTrigger>
                                <SelectContent>
                                    {allClients.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.full_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <span className="font-bold text-sm md:text-base text-gray-900 truncate">
                                {client.full_name}
                            </span>
                        )}
                        <Badge
                            variant={client.status === 'active' ? 'outline' : 'secondary'}
                            className={cn(
                                "text-[9px] md:text-[10px] uppercase tracking-wider h-4 md:h-5 px-1 md:px-1.5 w-fit",
                                client.status === 'active'
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-gray-100 text-gray-500 border-gray-200"
                            )}
                        >
                            {client.status === 'active' ? 'ACTIVO' : 'INACTIVO'}
                        </Badge>
                    </div>
                </div>

                {/* 3. Navigation Tabs (Aligned to the right on desktop, scrollable on mobile) */}
                <nav className="flex items-center ml-auto gap-0.5 md:gap-1 overflow-x-auto no-scrollbar scroll-smooth py-1">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id
                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className={cn(
                                    "px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold rounded-full transition-all whitespace-nowrap",
                                    isActive
                                        ? "bg-gray-900 text-white"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                {tab.label}
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </header>
    )
}
