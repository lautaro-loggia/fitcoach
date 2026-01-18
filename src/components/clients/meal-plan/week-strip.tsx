'use client'

import { cn } from "@/lib/utils"

interface WeekStripProps {
    days: any[]
    selectedDay: number
    onSelectDay: (day: number) => void
}

const WEEKDAYS = [
    { id: 1, label: 'Lunes' },
    { id: 2, label: 'Martes' },
    { id: 3, label: 'Miércoles' },
    { id: 4, label: 'Jueves' },
    { id: 5, label: 'Viernes' },
    { id: 6, label: 'Sábado' },
    { id: 7, label: 'Domingo' },
]

export function WeekStrip({ days, selectedDay, onSelectDay }: WeekStripProps) {

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide py-2">
            {WEEKDAYS.map((day) => {
                const isSelected = selectedDay === day.id

                return (
                    <button
                        key={day.id}
                        onClick={() => onSelectDay(day.id)}
                        className={cn(
                            "flex items-start justify-center pt-4 min-w-[8rem] h-28 rounded-xl border transition-all duration-200",
                            isSelected
                                ? "border-2 border-primary bg-background shadow-sm"
                                : "border-border bg-card hover:border-primary/50"
                        )}
                    >
                        <span className="font-bold text-sm text-foreground">
                            {day.label}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}
