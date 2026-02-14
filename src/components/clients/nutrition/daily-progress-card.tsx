'use client'

import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

export interface DailyProgressCardProps {
    currentCalories: number
    targetCalories: number
    macros: {
        protein: { current: number, target: number }
        carbs: { current: number, target: number }
        fats: { current: number, target: number }
    }
}

export function DailyProgressCard({ currentCalories, targetCalories, macros }: DailyProgressCardProps) {
    const caloriesRemaining = targetCalories - currentCalories
    const isOver = caloriesRemaining < 0
    const progress = Math.min(100, Math.max(0, (currentCalories / targetCalories) * 100))

    return (
        <Card className="p-5 bg-white border shadow-sm space-y-5 rounded-2xl">
            {/* Header / Calories */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Progreso</h2>
                    <p className="text-sm text-gray-500 font-medium">
                        {isOver
                            ? `${Math.abs(caloriesRemaining)} kcal extra`
                            : `${caloriesRemaining} kcal faltantes`
                        }
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-bold text-gray-900">{currentCalories}</span>
                    <span className="text-sm text-gray-400 font-medium ml-1">/ {targetCalories} kcal</span>
                </div>
            </div>

            {/* Main Progress Bar */}
            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ease-out ${isOver ? 'bg-red-500' : 'bg-zinc-900'}`}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Macros Grid */}
            <div className="grid grid-cols-3 gap-4 pt-1">
                <MacroProgress
                    label="Proteína"
                    current={macros.protein.current}
                    target={macros.protein.target}
                    color="bg-blue-500"
                    trackColor="bg-blue-50"
                />
                <MacroProgress
                    label="Carbos"
                    current={macros.carbs.current}
                    target={macros.carbs.target}
                    color="bg-amber-500"
                    trackColor="bg-amber-50"
                />
                <MacroProgress
                    label="Grasas"
                    current={macros.fats.current}
                    target={macros.fats.target}
                    color="bg-rose-500"
                    trackColor="bg-rose-50"
                />
            </div>
        </Card>
    )
}

function MacroProgress({ label, current, target, color, trackColor }: {
    label: string,
    current: number,
    target: number,
    color: string,
    trackColor: string
}) {
    const progress = Math.min(100, Math.max(0, (current / target) * 100))
    const isComplete = progress >= 100

    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-baseline text-xs">
                <span className="font-medium text-gray-500">{label}</span>
                <span className={`font-bold ${isComplete ? 'text-gray-900' : 'text-gray-700'}`}>
                    {Math.round(current)}<span className="text-gray-400 font-normal">/{target}g</span>
                </span>
            </div>
            <div className={`h-1.5 w-full ${trackColor} rounded-full overflow-hidden`}>
                <div
                    className={`h-full transition-all duration-500 ease-out ${color} ${isComplete ? 'opacity-100' : 'opacity-80'}`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    )
}
