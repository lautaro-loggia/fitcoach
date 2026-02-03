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
        <div className="grid grid-cols-7 gap-2 md:gap-4 py-2">
            {WEEKDAYS.map((day) => {
                const isSelected = selectedDay === day.id

                return (
                    <button
                        key={day.id}
                        onClick={() => onSelectDay(day.id)}
                        className={cn(
                            "flex flex-col items-center justify-center py-4 rounded-xl border transition-all duration-200",
                            isSelected
                                ? "border-2 border-primary bg-background"
                                : "border-border bg-card hover:border-primary/50"
                        )}
                    >
                        <span className={cn(
                            "font-bold text-xs md:text-sm",
                            isSelected ? "text-foreground" : "text-muted-foreground"
                        )}>
                            {day.label.substring(0, 3)}
                            <span className="hidden md:inline">{day.label.substring(3)}</span>
                        </span>
                    </button>
                )
            })}
        </div>
    )
}
