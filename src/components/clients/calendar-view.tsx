'use client'

import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, parse } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CheckmarkCircle02Icon, Dumbbell01Icon } from 'hugeicons-react'
import { getClientWorkoutHistory } from '@/app/(dashboard)/clients/[id]/history-actions'

interface CalendarViewProps {
    workouts: any[]
    clientId?: string
    onUpdateWorkout: (workoutId: string, updatedStructure: any[]) => void
}

export function CalendarView({ workouts, clientId, onUpdateWorkout }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [sessions, setSessions] = useState<any[]>([])

    useEffect(() => {
        if (clientId) {
            loadHistory()
        }
    }, [clientId])

    const loadHistory = async () => {
        try {
            const { sessions: data } = await getClientWorkoutHistory(clientId!)
            setSessions(data || [])
        } catch (error) {
            console.error('Error fetching workout history:', error)
            setSessions([])
        }
    }

    // Navigation
    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

    // Grid generation
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

    const dayMapping: Record<string, string> = {
        'Monday': 'Lunes',
        'Tuesday': 'Martes',
        'Wednesday': 'Miércoles',
        'Thursday': 'Jueves',
        'Friday': 'Viernes',
        'Saturday': 'Sábado',
        'Sunday': 'Domingo'
    }

    const getWorkoutsForDay = (date: Date) => {
        const dayNameEnglish = format(date, 'EEEE', { locale: undefined })
        const dayNameSpanish = dayMapping[dayNameEnglish]

        return workouts.filter(w => {
            const validFrom = new Date(w.created_at)
            const validUntil = w.valid_until ? parse(w.valid_until, 'yyyy-MM-dd', new Date()) : new Date('2099-12-31')
            validFrom.setHours(0, 0, 0, 0)
            validUntil.setHours(23, 59, 59, 999)

            if (date < validFrom || date > validUntil) return false
            const scheduledDays = w.scheduled_days || []
            return scheduledDays.includes(dayNameSpanish)
        })
    }

    const getSessionForDay = (date: Date) => {
        return sessions.find(s => isSameDay(new Date(s.started_at), date))
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50 bg-gray-50/10">
                <span className="text-sm font-extrabold text-gray-900 capitalize tracking-tight">
                    {format(currentDate, 'MMMM yyyy', { locale: es })}
                </span>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={prevMonth} className="h-9 w-9 text-gray-400 hover:text-gray-900 hover:bg-white rounded-xl transition-all">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={nextMonth} className="h-9 w-9 text-gray-400 hover:text-gray-900 hover:bg-white rounded-xl transition-all">
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-7 border-b border-gray-50 bg-white">
                {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((day) => (
                    <div key={day} className="py-4 text-center text-[10px] font-bold text-gray-400 tracking-[0.2em]">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 flex-1 bg-white">
                {calendarDays.map((date) => {
                    const isCurrentMonth = isSameMonth(date, currentDate)
                    const dailyWorkouts = getWorkoutsForDay(date)
                    const session = getSessionForDay(date)
                    const isTodayDate = isToday(date)

                    return (
                        <div
                            key={date.toString()}
                            className={cn(
                                "min-h-[140px] p-3 border-r border-b border-gray-50 relative group transition-all duration-300 hover:bg-gray-50/50",
                                !isCurrentMonth && "opacity-25"
                            )}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <span className={cn(
                                    "text-[11px] font-black h-6 w-6 flex items-center justify-center rounded-lg transition-all",
                                    isTodayDate ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-gray-400 group-hover:text-gray-900"
                                )}>
                                    {format(date, 'd')}
                                </span>
                            </div>

                            <div className="space-y-2">
                                {session ? (
                                    <div className="flex items-center gap-1.5 px-2.5 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100/50 shadow-sm shadow-emerald-50/50 transform transition-all hover:scale-[1.03]">
                                        <CheckmarkCircle02Icon className="h-3.5 w-3.5 shrink-0" />
                                        <span className="text-[10px] font-bold leading-none truncate tracking-tight">Completado</span>
                                    </div>
                                ) : dailyWorkouts.length > 0 ? (
                                    <div className="flex items-center gap-1.5 px-2.5 py-2 bg-gray-50 text-gray-400 rounded-xl border border-gray-100/50 group-hover:bg-white group-hover:border-gray-200 group-hover:text-gray-600 shadow-sm transition-all hover:scale-[1.03]">
                                        <Dumbbell01Icon className="h-3.5 w-3.5 shrink-0" />
                                        <span className="text-[10px] font-bold leading-none truncate tracking-tight">Entrenami...</span>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
