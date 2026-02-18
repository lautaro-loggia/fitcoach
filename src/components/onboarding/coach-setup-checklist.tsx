'use client'

import Link from 'next/link'
import { Check, UserPlus, Dumbbell, ChefHat, Wallet } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { CoachOnboardingState } from '@/hooks/use-coach-onboarding'

interface CoachSetupChecklistProps {
    tasks: CoachOnboardingState['tasks']
    onCompleteTask: (task: keyof CoachOnboardingState['tasks']) => void
}

const CHECKLIST_ITEMS: {
    key: keyof CoachOnboardingState['tasks']
    label: string
    href: string
    icon: React.ElementType
}[] = [
        {
            key: 'clientInvited',
            label: 'Invitar primer asesorado',
            href: '/clients?new=true',
            icon: UserPlus,
        },
        {
            key: 'workoutCreated',
            label: 'Crear primer entrenamiento',
            href: '/workouts',
            icon: Dumbbell,
        },
        {
            key: 'recipeCreated',
            label: 'Crear primera receta',
            href: '/recipes',
            icon: ChefHat,
        },
        {
            key: 'paymentsReviewed',
            label: 'Revisar panel de pagos',
            href: '/pagos',
            icon: Wallet,
        },
    ]

export function CoachSetupChecklist({ tasks, onCompleteTask }: CoachSetupChecklistProps) {
    const completedCount = Object.values(tasks).filter(Boolean).length
    const totalCount = CHECKLIST_ITEMS.length
    const progressPercent = (completedCount / totalCount) * 100

    return (
        <Card className="border bg-white overflow-hidden">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                        🚀 Configuración inicial
                    </CardTitle>
                    <span className="text-xs text-muted-foreground font-medium">
                        {completedCount}/{totalCount}
                    </span>
                </div>
                {/* Barra de progreso */}
                <div className="w-full h-1.5 bg-border/50 rounded-full mt-2 overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                            width: `${progressPercent}%`,
                            backgroundColor: '#4139CF',
                        }}
                    />
                </div>
            </CardHeader>

            <CardContent className="pt-0 pb-4">
                <div className="space-y-1">
                    {CHECKLIST_ITEMS.map((item) => {
                        const isCompleted = tasks[item.key]
                        const Icon = item.icon

                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                onClick={() => {
                                    if (!isCompleted) {
                                        onCompleteTask(item.key)
                                    }
                                }}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group',
                                    isCompleted
                                        ? 'opacity-60'
                                        : 'hover:bg-muted/60'
                                )}
                            >
                                {/* Check circle */}
                                <div
                                    className={cn(
                                        'h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                                        isCompleted
                                            ? 'bg-green-100 text-green-600'
                                            : 'border-2 border-border group-hover:border-[#4139CF]/40'
                                    )}
                                >
                                    {isCompleted && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                                </div>

                                {/* Icono */}
                                <Icon
                                    className={cn(
                                        'h-4 w-4 flex-shrink-0',
                                        isCompleted
                                            ? 'text-muted-foreground'
                                            : 'text-foreground/70'
                                    )}
                                />

                                {/* Label */}
                                <span
                                    className={cn(
                                        'text-sm font-medium transition-colors',
                                        isCompleted
                                            ? 'line-through text-muted-foreground'
                                            : 'text-foreground group-hover:text-foreground'
                                    )}
                                >
                                    {item.label}
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
