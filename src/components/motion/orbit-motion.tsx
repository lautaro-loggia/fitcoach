'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
    getMotionPresetVariants,
    orbitMotionTransitions,
    type MotionPreset
} from '@/lib/motion/presets'
import { useOrbitMotion, useShouldAnimateIndex } from '@/components/motion/orbit-motion-provider'

interface MotionBlockProps {
    children: React.ReactNode
    className?: string
    preset?: MotionPreset
    index?: number
}

export function MotionEnter({
    children,
    className,
    preset = 'section',
    index = 0
}: MotionBlockProps) {
    const shouldAnimate = useShouldAnimateIndex(index)
    const { level } = useOrbitMotion()

    if (!shouldAnimate) {
        return <div className={className}>{children}</div>
    }

    return (
        <motion.div
            className={className}
            variants={getMotionPresetVariants(level, preset)}
            initial="hidden"
            animate="visible"
            transition={{
                ...orbitMotionTransitions.base,
                delay: Math.min(index * 0.03, 0.16)
            }}
        >
            {children}
        </motion.div>
    )
}

export function MotionScrollReveal({
    children,
    className,
    preset = 'scroll-reveal',
    index = 0
}: MotionBlockProps) {
    const shouldAnimate = useShouldAnimateIndex(index)
    const { level, routeBudget } = useOrbitMotion()

    if (!shouldAnimate || !routeBudget.enableScrollReveal) {
        return <div className={className}>{children}</div>
    }

    return (
        <motion.div
            className={className}
            variants={getMotionPresetVariants(level, preset)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{
                ...orbitMotionTransitions.base,
                delay: Math.min(index * 0.02, 0.12)
            }}
        >
            {children}
        </motion.div>
    )
}

interface MotionStaggerProps {
    children: React.ReactNode
    className?: string
    index?: number
}

export function MotionStagger({ children, className, index = 0 }: MotionStaggerProps) {
    const shouldAnimate = useShouldAnimateIndex(index)
    const { routeBudget } = useOrbitMotion()

    if (!shouldAnimate) {
        return <div className={className}>{children}</div>
    }

    return (
        <motion.div
            className={className}
            variants={{
                hidden: {},
                visible: {
                    transition: {
                        staggerChildren: routeBudget.staggerChildren,
                        delayChildren: Math.min(index * 0.02, 0.08)
                    }
                }
            }}
            initial="hidden"
            animate="visible"
        >
            {children}
        </motion.div>
    )
}

export function MotionStaggerItem({
    children,
    className,
    preset = 'list-item',
    index = 0
}: MotionBlockProps) {
    const shouldAnimate = useShouldAnimateIndex(index)
    const { level } = useOrbitMotion()

    if (!shouldAnimate) {
        return <div className={className}>{children}</div>
    }

    return (
        <motion.div
            layout
            className={className}
            variants={getMotionPresetVariants(level, preset)}
        >
            {children}
        </motion.div>
    )
}

interface MotionTabTransitionProps {
    tabKey: string
    children: React.ReactNode
    className?: string
}

export function MotionTabTransition({ tabKey, children, className }: MotionTabTransitionProps) {
    const { level, isMotionEnabled } = useOrbitMotion()

    if (!isMotionEnabled) {
        return <div className={className}>{children}</div>
    }

    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={tabKey}
                className={cn(className)}
                variants={getMotionPresetVariants(level, 'section')}
                initial="hidden"
                animate="visible"
                exit={{
                    opacity: 0,
                    y: 6,
                    transition: orbitMotionTransitions.fast
                }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    )
}
