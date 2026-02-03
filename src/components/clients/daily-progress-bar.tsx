'use client'

import { Progress } from '@/components/ui/progress'
import { CheckCircle2 } from 'lucide-react'

interface DailyProgressBarProps {
    current: number
    total: number
}

export function DailyProgressBar({ current, total }: DailyProgressBarProps) {
    const safeTotal = total > 0 ? total : 1
    const percentage = Math.min(100, Math.max(0, (current / safeTotal) * 100))

    return (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-4">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <CheckCircle2 className={`h-4 w-4 ${percentage === 100 ? 'text-green-500' : 'text-gray-400'}`} />
                    Comidas registradas
                </span>
                <span className="text-sm font-bold text-gray-900">{current} / {total}</span>
            </div>
            <Progress value={percentage} className="h-2.5" indicatorClassName={percentage === 100 ? "bg-green-500" : "bg-blue-600"} />
        </div>
    )
}
