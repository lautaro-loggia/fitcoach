'use client'

import { createContext, useContext, useMemo } from 'react'
import { MotionConfig, useReducedMotion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { getMotionRouteBudget, type MotionRouteBudget } from '@/lib/motion/route-budget'
import { orbitMotionTransitions, type MotionLevel } from '@/lib/motion/presets'

interface OrbitMotionContextValue {
    level: MotionLevel
    isMotionEnabled: boolean
    prefersReducedMotion: boolean
    routeBudget: MotionRouteBudget
}

const OrbitMotionContext = createContext<OrbitMotionContextValue | null>(null)

function parseMotionLevel(raw: string | undefined): MotionLevel {
    if (raw === 'off' || raw === 'full') return raw
    return 'minimal'
}

const motionLevel = parseMotionLevel(process.env.NEXT_PUBLIC_MOTION_LEVEL)

export function OrbitMotionProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const prefersReducedMotion = useReducedMotion()

    const routeBudget = useMemo(() => getMotionRouteBudget(pathname), [pathname])

    const isMotionEnabled = motionLevel !== 'off' && !prefersReducedMotion

    const defaultTransition = motionLevel === 'full'
        ? orbitMotionTransitions.base
        : orbitMotionTransitions.fast

    const contextValue = useMemo<OrbitMotionContextValue>(() => ({
        level: isMotionEnabled ? motionLevel : 'off',
        isMotionEnabled,
        prefersReducedMotion: Boolean(prefersReducedMotion),
        routeBudget
    }), [isMotionEnabled, prefersReducedMotion, routeBudget])

    return (
        <MotionConfig reducedMotion="user" transition={defaultTransition}>
            <OrbitMotionContext.Provider value={contextValue}>
                {children}
            </OrbitMotionContext.Provider>
        </MotionConfig>
    )
}

export function useOrbitMotion() {
    const context = useContext(OrbitMotionContext)
    if (!context) {
        throw new Error('useOrbitMotion must be used within OrbitMotionProvider')
    }

    return context
}

export function useShouldAnimateIndex(index: number) {
    const { isMotionEnabled, routeBudget } = useOrbitMotion()
    return isMotionEnabled && index < routeBudget.maxAnimatedItems
}
