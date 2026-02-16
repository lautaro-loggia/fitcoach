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
    // const progress = Math.min(100, Math.max(0, (currentCalories / targetCalories) * 100))

    return (
        <Card className="rounded-[24px] border border-gray-200 shadow-none bg-white p-6">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-[17px] font-bold text-black">Progreso</h3>
                    <p className="text-gray-400 text-sm font-medium mt-0.5">
                        {isOver
                            ? `${Math.abs(caloriesRemaining)} kcal extra`
                            : `${caloriesRemaining} kcal faltantes`
                        }
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-bold text-black tracking-tight">{currentCalories}</span>
                    <span className="text-gray-300 text-lg"> / {targetCalories} kcal</span>
                </div>
            </div>

            {/* Main Progress Bar */}
            <div className="relative w-full h-4 bg-gray-100 rounded-full mb-6 overflow-hidden">
                <div
                    className={`absolute top-0 left-0 h-full rounded-full ${isOver ? 'bg-red-500' : 'bg-black'}`}
                    style={{ width: `${Math.min(100, (currentCalories / targetCalories) * 100)}%` }}
                />
            </div>

            {/* Macros */}
            <div className="grid grid-cols-3 gap-6">
                <MacroItem label="Proteina" current={macros.protein.current} total={macros.protein.target} color="bg-blue-500" />
                <MacroItem label="Carbs" current={macros.carbs.current} total={macros.carbs.target} color="bg-orange-500" />
                <MacroItem label="Fats" current={macros.fats.current} total={macros.fats.target} color="bg-red-500" />
            </div>
        </Card>
    )
}

function MacroItem({ label, current, total, color }: { label: string; current: number; total: number; color: string }) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-end justify-between text-[11px] leading-none">
                <span className="text-gray-400 font-medium">{label}</span>
                <span className="font-bold text-black ml-1">
                    {Math.round(current)}<span className="text-gray-300">/{total}g</span>
                </span>
            </div>
            <div className="relative w-full h-[5px] bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`absolute top-0 left-0 h-full rounded-full ${color}`}
                    style={{ width: `${Math.min(100, (current / total) * 100)}%` }}
                />
            </div>
        </div>
    )
}
