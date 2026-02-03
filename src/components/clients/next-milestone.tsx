import { Card } from "@/components/ui/card"
import { CalendarDays, Target, ArrowRight } from "lucide-react"
import { differenceInDays, format } from "date-fns"
import { es } from "date-fns/locale"

interface NextMilestoneProps {
    nextCheckinDate: string | null
    weeklyGoalText: string // e.g., "Meta: -0.5 kg"
}

export function NextMilestone({ nextCheckinDate, weeklyGoalText }: NextMilestoneProps) {
    if (!nextCheckinDate) return null

    // 1. Calculate Days Remaining
    const today = new Date()
    // Parse strictly YYYY-MM-DD to avoid timezone issues if possible, or use standard date object
    // Assuming nextCheckinDate is 'YYYY-MM-DD'
    const checkinDate = new Date(`${nextCheckinDate}T00:00:00`)
    const daysRemaining = differenceInDays(checkinDate, today)

    let timeText = ""
    if (daysRemaining < 0) timeText = "Vencido"
    else if (daysRemaining === 0) timeText = "Hoy"
    else if (daysRemaining === 1) timeText = "Mañana"
    else timeText = `En ${daysRemaining} días`

    return (
        <Card className="p-3 bg-indigo-50/50 border border-indigo-100 shadow-sm">
            <div className="flex items-center justify-between gap-4">

                {/* Countdown */}
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-600 shadow-sm">
                        <CalendarDays className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wide text-indigo-400 font-bold mb-0.5">
                            Próximo Hito
                        </p>
                        <p className="text-sm font-bold text-indigo-900 leading-none">
                            {timeText}
                        </p>
                    </div>
                </div>

                {/* Goal Divider */}
                <div className="h-6 w-px bg-indigo-200/50"></div>

                {/* Weekly Goal */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <Target className="h-3 w-3 text-indigo-500" />
                        <span className="text-xs font-semibold text-indigo-700 truncate">
                            Objetivo Semanal
                        </span>
                    </div>
                    <p className="text-xs text-indigo-600/80 truncate font-medium">
                        {weeklyGoalText}
                    </p>
                </div>

            </div>
        </Card>
    )
}
