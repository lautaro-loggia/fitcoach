'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft02Icon } from 'hugeicons-react'
import { Button } from '@/components/ui/button'
import { ClientAvatar } from '@/components/clients/client-avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
// import Link from 'next/link'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useTransition, useState } from 'react'
import { Loader2 } from 'lucide-react'

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
    const [isPending, startTransition] = useTransition()
    const [targetTab, setTargetTab] = useState<string | null>(null)

    // Mapeo de tabs con sus respectivos IDs y labels
    // Usaremos los IDs que ya maneja la app actualmente: profile, checkin, training, diet, settings
    const tabs = [
        { id: 'profile', label: 'Resumen', href: `/clients/${client.id}?tab=profile` },
        { id: 'checkin', label: 'Check-in', href: `/clients/${client.id}?tab=checkin` },
        { id: 'training', label: 'Entrenamiento', href: `/clients/${client.id}?tab=training` },
        { id: 'diet', label: 'Nutrición', href: `/clients/${client.id}?tab=diet` },
        { id: 'settings', label: 'Ajustes', href: `/clients/${client.id}?tab=settings` },
    ]

    const handleTabChange = (tabId: string, href: string) => {
        if (tabId === activeTab) return
        setTargetTab(tabId)
        startTransition(() => {
            router.push(href)
        })
    }

    const handleClientChange = (clientId: string) => {
        startTransition(() => {
            router.push(`/clients/${clientId}?tab=${activeTab}`)
        })
    }

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur-md overflow-hidden">
            <div className="flex flex-col md:flex-row md:h-[72px] md:items-center px-4 md:px-6 gap-y-2 py-2 md:py-0">
                {/* Mobile & Desktop Row 1: Identity & Back */}
                <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                    <div className="flex items-center gap-1 shrink-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 -ml-2 text-muted-foreground hover:bg-muted rounded-full"
                            onClick={() => router.push('/clients')}
                        >
                            <ArrowLeft02Icon className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="flex items-center gap-3 min-w-0">
                        <ClientAvatar
                            name={client.full_name}
                            avatarUrl={client.avatar_url}
                            size="sm"
                        />
                        <div className="flex items-baseline md:items-center gap-1.5 md:gap-3 min-w-0">
                            {allClients.length > 0 ? (
                                <Select
                                    defaultValue={client.id}
                                    onValueChange={handleClientChange}
                                >
                                    <SelectTrigger className="w-auto h-auto p-0 border-0 font-bold tracking-tight bg-transparent shadow-none hover:bg-transparent focus:ring-0 gap-1 px-1 text-sm md:text-base">
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
                                    "text-[8px] md:text-[10px] uppercase font-bold tracking-widest h-4 md:h-5 px-1.5 w-fit rounded-full",
                                    client.status === 'active'
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-gray-50 text-gray-500 border-gray-200"
                                )}
                            >
                                {client.status === 'active' ? 'ACTIVO' : 'INACTIVO'}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Mobile Row 2 / Desktop End: Navigation Tabs */}
                <nav className="flex items-center overflow-x-auto no-scrollbar scroll-smooth gap-1 md:gap-1.5 -mx-4 px-4 md:mx-0 md:px-0 md:ml-auto">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id
                        const isLoading = isPending && targetTab === tab.id

                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id, tab.href)}
                                disabled={isPending}
                                className={cn(
                                    "px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-semibold rounded-full transition-all whitespace-nowrap flex items-center justify-center gap-2",
                                    isActive
                                        ? "bg-gray-900 text-white shadow-sm"
                                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                                    // Dim other tabs while pending, but keep the target tab fully visible (just with spinner)
                                    isPending && tab.id !== targetTab && !isActive && "opacity-50"
                                )}
                            >
                                {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                                {tab.label}
                            </button>
                        )
                    })}
                </nav>
            </div>
        </header>
    )
}
