'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, parse } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export interface Workout {
    id: string
    created_at: string
    valid_until: string | null
    scheduled_days: string[]
    client: {
        id: string
        full_name: string
        avatar_url: string | null
    }
}

interface PresentialCalendarDialogProps {
    workouts: Workout[]
}

export function PresentialCalendarDialog({ workouts }: PresentialCalendarDialogProps) {
    const [open, setOpen] = useState(false)
    const [currentDate, setCurrentDate] = useState(new Date())

    // Navigation
    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

    // Grid generation
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

    // Mapping workouts to days using getDay() index (0 = Sunday, 1 = Monday, ...)
    const dayMapping: Record<number, string> = {
        1: 'Lunes',
        2: 'Martes',
        3: 'Miércoles',
        4: 'Jueves',
        5: 'Viernes',
        6: 'Sábado',
        0: 'Domingo'
    }

    const getWorkoutsForDay = (date: Date) => {
        const dayIndex = date.getDay()
        const dayNameSpanish = dayMapping[dayIndex]

        return workouts.filter(w => {
            // Date validity check
            const validFrom = new Date(w.created_at)
            const validUntil = w.valid_until ? parse(w.valid_until, 'yyyy-MM-dd', new Date()) : new Date('2099-12-31')

            validFrom.setHours(0, 0, 0, 0)
            validUntil.setHours(23, 59, 59, 999)

            if (date < validFrom) return false
            // We removed the expiration check (date > validUntil) so the calendar shows the routine 
            // even if the "Next Check-in" date has passed, treating it as indefinitely active until replaced.

            const scheduledDays = w.scheduled_days || []
            return scheduledDays.includes(dayNameSpanish)
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="hidden md:inline">Calendario Presencial</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[1100px] w-full max-h-[90vh] flex flex-col sm:max-w-[1100px]">
                <DialogHeader>
                    <DialogTitle>Calendario de Entrenamientos Presenciales</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col h-full bg-background overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <Button variant="ghost" size="icon" onClick={prevMonth}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="font-medium text-lg capitalize">
                            {format(currentDate, 'MMMM yyyy', { locale: es })}
                        </span>
                        <Button variant="ghost" size="icon" onClick={nextMonth}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-7 gap-px bg-muted border rounded-lg overflow-hidden flex-1 overflow-y-auto min-h-[400px]">
                        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                            <div key={day} className="bg-background p-2 text-center text-sm font-medium border-b sticky top-0 z-10">
                                {day}
                            </div>
                        ))}

                        {calendarDays.map((date) => {
                            const isCurrentMonth = isSameMonth(date, currentDate)
                            const dailyWorkouts = getWorkoutsForDay(date)
                            const isTodayDate = isToday(date)

                            return (
                                <div
                                    key={date.toString()}
                                    className={cn(
                                        "min-h-[100px] bg-background p-1.5 border-r border-b relative group transition-colors hover:bg-muted/5",
                                        !isCurrentMonth && "bg-muted/10 text-muted-foreground"
                                    )}
                                >
                                    <div className={cn(
                                        "text-xs font-medium mb-1.5 w-5 h-5 flex items-center justify-center rounded-full ml-auto",
                                        isTodayDate ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                                    )}>
                                        {format(date, 'd')}
                                    </div>

                                    <div className="space-y-1">
                                        {dailyWorkouts.map((workout: Workout) => (
                                            <div key={workout.id} className="flex items-center gap-1.5 p-1 rounded bg-blue-50 border border-blue-100">
                                                <Avatar className="h-5 w-5 border border-blue-200">
                                                    <AvatarImage src={workout.client?.avatar_url || ''} />
                                                    <AvatarFallback className="text-[9px] bg-blue-100 text-blue-700">
                                                        {workout.client?.full_name?.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="truncate text-[10px] font-medium text-blue-900 leading-tight">
                                                    {workout.client?.full_name?.split(' ')[0]}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
