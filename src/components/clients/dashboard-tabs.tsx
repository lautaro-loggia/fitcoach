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

const sectionHeaders: Record<string, { title: string, subtitle: string }> = {
    profile: {
        title: "Resumen del asesorado",
        subtitle: "Progreso general, métricas clave y estado actual"
    },
    checkin: {
        title: "Check-in corporal",
        subtitle: "Medidas, peso y evolución en el tiempo"
    },
    training: {
        title: "Plan de entrenamiento",
        subtitle: "Rutinas asignadas y registro de entrenamientos"
    },
    diet: {
        title: "Plan nutricional",
        subtitle: "Objetivos diarios y distribución semanal de comidas"
    },
    settings: {
        title: "Datos del asesorado",
        subtitle: "Información personal y configuraciones del perfil"
    }
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

    const currentHeader = sectionHeaders[activeTab] || sectionHeaders.profile

    return (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
            {/* 1. Context Block (Persistent & Compact) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border">
                <ProfileHeader client={client} allClients={allClients} isCompact />

                <div className="flex items-center gap-2 overflow-x-auto max-w-full">
                    <TabsList className="inline-flex h-10 items-center justify-center rounded-lg bg-white/50 p-1 text-muted-foreground">
                        <TabsTrigger value="profile">Resumen</TabsTrigger>
                        <TabsTrigger value="checkin">Check-In</TabsTrigger>
                        <TabsTrigger value="training">Entrenamiento</TabsTrigger>
                        <TabsTrigger value="diet">Comidas</TabsTrigger>
                        <TabsTrigger value="settings">Ajustes</TabsTrigger>
                    </TabsList>
                </div>
            </div>

            {/* 2. Main Section Header (Changes with Tabs) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">{currentHeader.title}</h1>
                    <p className="text-gray-500 font-medium leading-none">{currentHeader.subtitle}</p>
                </div>

                {/* Dynamic Action Button Area */}
                <div id="header-actions" className="flex items-center gap-2 min-h-[44px]">
                    {actions[activeTab]}
                </div>
            </div>

            <div className="mt-6">
                {children}
            </div>
        </Tabs>
    )
}
