import { Card } from "@/components/ui/card"
import { TrendingDown, TrendingUp, Minus, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

interface WeeklyProgressProps {
    currentWeight: number
    previousWeight: number | null
    completedWorkouts: number
    totalScheduledWorkouts: number
    workoutAdherence: number
}

export function WeeklyProgress({
    currentWeight,
    previousWeight,
    completedWorkouts,
    totalScheduledWorkouts,
    workoutAdherence
}: WeeklyProgressProps) {
    // 1. Calculate Weight Variation
    let weightDiff = 0
    let weightTrend: 'loss' | 'gain' | 'neutral' = 'neutral'

    if (previousWeight) {
        weightDiff = currentWeight - previousWeight
        if (weightDiff < -0.05) weightTrend = 'loss'
        else if (weightDiff > 0.05) weightTrend = 'gain'
    }

    // Format difference (e.g., -0.4 kg)
    const formattedDiff = weightDiff > 0
        ? `+${weightDiff.toFixed(1)} kg`
        : `${weightDiff.toFixed(1)} kg`

    // 2. Determine Progress Status Text
    // Logic: High adherence + weight trend matching goal (assuming loss for now or general health)
    // Simplified: High adherence = "Vas bien"
    let statusText = "Vas bien"
    let statusColor = "text-green-600 bg-green-50"

    if (workoutAdherence < 50) {
        statusText = "Necesita ajuste"
        statusColor = "text-orange-600 bg-orange-50"
    } else if (workoutAdherence < 80) {
        statusText = "Progreso lento"
        statusColor = "text-yellow-600 bg-yellow-50"
    }

    return (
        <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                Progreso Semanal
            </h3>
            <Card className="p-4 border-none shadow-sm bg-white ring-1 ring-gray-100/50">
                <div className="flex items-center justify-between">

                    {/* Weight Variation */}
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-400 font-medium">Variación Peso</span>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-gray-900">
                                {formattedDiff}
                            </span>
                            {previousWeight && (
                                <span className={cn(
                                    "text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5",
                                    weightTrend === 'loss' ? "bg-green-100 text-green-700" :
                                        weightTrend === 'gain' ? "bg-amber-100 text-amber-700" :
                                            "bg-gray-100 text-gray-600"
                                )}>
                                    {weightTrend === 'loss' && <TrendingDown className="h-3 w-3" />}
                                    {weightTrend === 'gain' && <TrendingUp className="h-3 w-3" />}
                                    {weightTrend === 'neutral' && <Minus className="h-3 w-3" />}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-8 w-px bg-gray-100"></div>

                    {/* Adherence */}
                    <div className="flex flex-col gap-1 items-end">
                        <span className="text-xs text-gray-400 font-medium">Adherencia</span>
                        <div className="flex items-center gap-2">
                            <div className={cn("px-2 py-0.5 rounded-full text-xs font-bold", statusColor)}>
                                {statusText}
                            </div>
                            <div className="flex items-center gap-1 text-gray-700 font-bold text-sm">
                                <Activity className="h-4 w-4 text-indigo-500" />
                                <span>{Math.round(workoutAdherence)}%</span>
                            </div>
                        </div>
                    </div>

                </div>
            </Card>
        </div>
    )
}
