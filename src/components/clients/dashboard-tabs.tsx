'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileHeader } from '@/components/clients/profile-header'
import type { Client } from '@/components/clients/client-table'

interface DashboardTabsProps {
    client: any // Type aggregation is loose here to match existing usage
    allClients: any[]
    defaultTab: string
    children: React.ReactNode
    actions?: Record<string, React.ReactNode>
}

export function DashboardTabs({
    client,
    allClients,
    defaultTab,
    children,
    actions = {}
}: DashboardTabsProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()

    // Local state for immediate UI feedback
    const [activeTab, setActiveTab] = useState(defaultTab)

    const handleTabChange = useCallback((value: string) => {
        setActiveTab(value)

        // Sync with URL without scroll
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', value)
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }, [pathname, router, searchParams])

    return (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                <ProfileHeader client={client} allClients={allClients} />

                <div className="flex items-center gap-2 overflow-x-auto max-w-full">
                    {/* Dynamic Action Button Area */}
                    <div id="header-actions" className="flex items-center gap-2 min-h-[36px]">
                        {actions[activeTab]}
                    </div>

                    <TabsList className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
                        <TabsTrigger value="profile">Perfil</TabsTrigger>
                        <TabsTrigger value="checkin">Check-In</TabsTrigger>
                        <TabsTrigger value="training">Entrenamiento</TabsTrigger>
                        <TabsTrigger value="diet">Comidas</TabsTrigger>
                        <TabsTrigger value="settings">Ajustes</TabsTrigger>
                    </TabsList>
                </div>
            </div>

            {children}
        </Tabs>
    )
}
