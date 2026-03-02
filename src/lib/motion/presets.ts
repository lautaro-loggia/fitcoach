import type { TargetAndTransition, Transition, Variants } from 'framer-motion'

export type MotionLevel = 'off' | 'minimal' | 'full'

export type MotionPreset =
    | 'page'
    | 'section'
    | 'item'
    | 'list-item'
    | 'overlay'
    | 'scroll-reveal'

const ORBIT_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export const orbitMotionDurations = {
    fast: 0.12,
    base: 0.18,
    slow: 0.22
} as const

export const orbitMotionTransitions: Record<'fast' | 'base' | 'slow', Transition> = {
    fast: {
        duration: orbitMotionDurations.fast,
        ease: ORBIT_EASE
    },
    base: {
        duration: orbitMotionDurations.base,
        ease: ORBIT_EASE
    },
    slow: {
        duration: orbitMotionDurations.slow,
        ease: ORBIT_EASE
    }
}

const presetOffsets: Record<MotionPreset, { y: number; scale: number }> = {
    page: { y: 12, scale: 1 },
    section: { y: 10, scale: 1 },
    item: { y: 8, scale: 1 },
    'list-item': { y: 6, scale: 1 },
    overlay: { y: 14, scale: 0.985 },
    'scroll-reveal': { y: 16, scale: 1 }
}

export function getMotionPresetVariants(level: MotionLevel, preset: MotionPreset): Variants {
    if (level === 'off') {
        return {
            hidden: { opacity: 1, y: 0, scale: 1 },
            visible: { opacity: 1, y: 0, scale: 1 }
        }
    }

    const offset = presetOffsets[preset]
    const y = level === 'full' ? offset.y : Math.max(4, Math.round(offset.y * 0.65))
    const scale = level === 'full' ? offset.scale : 1
    const transition =
        preset === 'overlay'
            ? orbitMotionTransitions.slow
            : preset === 'list-item'
                ? orbitMotionTransitions.fast
                : orbitMotionTransitions.base

    return {
        hidden: {
            opacity: 0,
            y,
            scale
        },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition
        }
    }
}

export function getHoverGesture(level: MotionLevel): TargetAndTransition | undefined {
    if (level === 'off') return undefined

    return {
        scale: level === 'full' ? 1.02 : 1.01,
        transition: orbitMotionTransitions.fast
    }
}

export function getTapGesture(level: MotionLevel): TargetAndTransition | undefined {
    if (level === 'off') return undefined

    return {
        scale: 0.98,
        transition: orbitMotionTransitions.fast
    }
}
