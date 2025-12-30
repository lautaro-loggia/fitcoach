'use client'

import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { ExerciseEditDialog } from './exercise-edit-dialog'

interface CalendarViewProps {
    workouts: any[]
    onUpdateWorkout: (workoutId: string, updatedStructure: any[]) => void
}

export function CalendarView({ workouts, onUpdateWorkout }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedExercise, setSelectedExercise] = useState<{ workoutId: string, exerciseIndex: number, exercise: any } | null>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

    // Navigation
    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

    // Grid generation
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

    // Mapping workouts to days
    // We assume workout.scheduled_days contains capitalized day names in Spanish: 'Lunes', 'Martes', etc.
    // We need to map English date-fns days to these strings.
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
        const dayNameEnglish = format(date, 'EEEE', { locale: undefined }) // Default en-US for mapping key
        const dayNameSpanish = dayMapping[dayNameEnglish]

        return workouts.filter(w => {
            // Date validity check
            const validFrom = new Date(w.created_at)
            const validUntil = w.valid_until ? new Date(w.valid_until) : new Date('2099-12-31')

            // Strip time
            validFrom.setHours(0, 0, 0, 0)
            validUntil.setHours(23, 59, 59, 999)

            if (date < validFrom || date > validUntil) return false

            // Day of week check
            // Assuming 'scheduled_days' array exists on workout
            const scheduledDays = w.scheduled_days || []
            return scheduledDays.includes(dayNameSpanish)
        })
    }

    const handleExerciseClick = (workout: any, exercise: any, index: number) => {
        setSelectedExercise({
            workoutId: workout.id,
            exerciseIndex: index,
            exercise: exercise
        })
        setIsEditDialogOpen(true)
    }

    const handleSaveExercise = async (newSets: any[]) => {
        if (!selectedExercise) return

        const workout = workouts.find(w => w.id === selectedExercise.workoutId)
        if (!workout) return

        // Update the specific exercise in the structure
        const newStructure = [...(Array.isArray(workout.structure) ? workout.structure : [])]

        // We are updating the "Master Template" for the client here because we don't have per-day logging yet.
        // This is a trade-off mentioned in the plan.
        newStructure[selectedExercise.exerciseIndex] = {
            ...newStructure[selectedExercise.exerciseIndex],
            // sets property in structure might be just a number string "3", but the dialog returns an array of Set objects.
            // We need to decide how to store this. 
            // Current schema: sets (string), reps (string).
            // New schema implied by dialog: detailed sets array.
            // To maintain compatibility, I will convert the detailed sets back to a summary string if possible, 
            // OR store the 'sets_detail' in the json structure.
            sets: newSets.length.toString(),
            reps: newSets[0]?.reps || "10", // Approximation
            sets_detail: newSets // Storing the full detail
        }

        onUpdateWorkout(selectedExercise.workoutId, newStructure)
        setIsEditDialogOpen(false)
    }

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex items-center justify-end gap-2 mb-4">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[140px] text-center font-medium text-lg capitalize">
                    {format(currentDate, 'MMMM yyyy', { locale: es })}
                </span>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-7 gap-px bg-muted border rounded-lg overflow-hidden flex-1">
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day) => (
                    <div key={day} className="bg-background p-2 text-center text-sm font-medium border-b">
                        {day}
                    </div>
                ))}

                {calendarDays.map((date, idx) => {
                    const isCurrentMonth = isSameMonth(date, currentDate)
                    const dailyWorkouts = getWorkoutsForDay(date)
                    const isTodayDate = isToday(date)

                    return (
                        <div
                            key={date.toString()}
                            className={cn(
                                "min-h-[150px] bg-background p-2 border-r border-b relative group transition-colors hover:bg-muted/5",
                                !isCurrentMonth && "bg-muted/10 text-muted-foreground"
                            )}
                        >
                            <div className={cn(
                                "text-xs font-medium mb-2 w-6 h-6 flex items-center justify-center rounded-full ml-auto",
                                isTodayDate ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                            )}>
                                {format(date, 'd')}
                            </div>

                            <div className="space-y-2">
                                {dailyWorkouts.map(workout => (
                                    <Card key={workout.id} className="p-2 shadow-sm border-l-4 border-l-violet-primary overflow-hidden">
                                        <p className="text-xs font-bold text-primary truncate mb-1">{workout.name}</p>
                                        <div className="space-y-1">
                                            {Array.isArray(workout.structure) && workout.structure.slice(0, 3).map((ex: any, i: number) => (
                                                <div
                                                    key={i}
                                                    className="text-[10px] bg-muted/50 p-1 rounded cursor-pointer hover:bg-muted transition-colors truncate"
                                                    onClick={() => handleExerciseClick(workout, ex, i)}
                                                >
                                                    <span className="font-semibold">x{ex.sets}</span> {ex.name}
                                                </div>
                                            ))}
                                            {Array.isArray(workout.structure) && workout.structure.length > 3 && (
                                                <div className="text-[10px] text-muted-foreground pl-1">
                                                    + {workout.structure.length - 3} más
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {selectedExercise && (
                <ExerciseEditDialog
                    isOpen={isEditDialogOpen}
                    onClose={() => setIsEditDialogOpen(false)}
                    exerciseName={selectedExercise.exercise.name}
                    initialSets={selectedExercise.exercise.sets_detail || []} // Use stored details if available
                    onSave={handleSaveExercise}
                />
            )}
        </div>
    )
}
