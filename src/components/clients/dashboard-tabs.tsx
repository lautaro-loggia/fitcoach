'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnimatePresence, motion } from 'framer-motion'
import { ProfileHeader } from '@/components/clients/profile-header'
import { MotionTabTransition } from '@/components/motion/orbit-motion'
import { useOrbitMotion } from '@/components/motion/orbit-motion-provider'
import { orbitMotionTransitions } from '@/lib/motion/presets'

interface DashboardTabsProps {
    client: {
        id: string
        full_name: string
        status: 'active' | 'inactive'
        email: string | null
        avatar_url?: string | null
    }
    allClients: {
        id: string
        full_name: string
        status: string
    }[]
    defaultTab: string
    children: React.ReactNode
    actions?: Record<string, React.ReactNode>
}

const sectionHeaders: Record<string, { title: string, subtitle: string }> = {
    profile: {
        title: 'Resumen del asesorado',
        subtitle: 'Progreso general, métricas clave y estado actual'
    },
    checkin: {
        title: 'Check-in corporal',
        subtitle: 'Medidas, peso y evolución en el tiempo'
    },
    training: {
        title: 'Plan de entrenamiento',
        subtitle: 'Rutinas asignadas y registro de entrenamientos'
    },
    diet: {
        title: 'Plan nutricional',
        subtitle: 'Objetivos diarios y distribución semanal de comidas'
    },
    settings: {
        title: 'Datos del asesorado',
        subtitle: 'Información personal y configuraciones del perfil'
    }
}

const tabItems = [
    { value: 'profile', label: 'Resumen' },
    { value: 'checkin', label: 'Check-In' },
    { value: 'training', label: 'Entrenamiento' },
    { value: 'diet', label: 'Comidas' },
    { value: 'settings', label: 'Ajustes' }
] as const

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
    const { isMotionEnabled } = useOrbitMotion()

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
                        {tabItems.map((tab) => {
                            const isActive = activeTab === tab.value
                            return (
                                <TabsTrigger key={tab.value} value={tab.value} className="relative overflow-hidden">
                                    {isMotionEnabled && isActive && (
                                        <motion.span
                                            layoutId="advised-dashboard-tabs-active"
                                            className="absolute inset-x-2 bottom-[2px] h-[2px] rounded-full bg-primary"
                                            transition={orbitMotionTransitions.fast}
                                        />
                                    )}
                                    <span className="relative z-10">{tab.label}</span>
                                </TabsTrigger>
                            )
                        })}
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
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={`action-${activeTab}`}
                            initial={isMotionEnabled ? { opacity: 0, y: 6 } : false}
                            animate={isMotionEnabled ? { opacity: 1, y: 0 } : undefined}
                            exit={isMotionEnabled ? { opacity: 0, y: -4 } : undefined}
                            transition={orbitMotionTransitions.fast}
                            className="flex items-center gap-2"
                        >
                            {actions[activeTab]}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <MotionTabTransition tabKey={activeTab} className="mt-6">
                {children}
            </MotionTabTransition>
        </Tabs>
    )
}
