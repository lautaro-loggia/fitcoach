"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
// import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip" // TooltipProvider is usually needed higher up or local
import { MoreHorizontal, Edit2, Play, Trash2, Download, Calendar } from "lucide-react"
import { format, parseISO, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Workout {
    id: string
    name: string
    structure: any[]
    scheduled_days?: string[]
    valid_until?: string
    // ... other fields
}

interface WorkoutCompactViewProps {
    workouts: Workout[]
    onEdit: (workout: Workout) => void
    onDelete: (id: string) => void
    onView: (workout: Workout) => void
    onDownload: (workout: Workout) => void
    onStart: (id: string) => void
}

const DAYS_ORDER = ['lunes', 'martes', 'miércoles', 'miercoles', 'jueves', 'viernes', 'sábado', 'sabado', 'domingo']

export function WorkoutCompactView({ workouts, onEdit, onDelete, onView, onDownload, onStart }: WorkoutCompactViewProps) {
    const today = new Date()
    const todayName = format(today, 'EEEE', { locale: es }).toLowerCase()

    // Group workouts by day
    const groupedWorkouts: Record<string, Workout[]> = {}

    workouts.forEach(workout => {
        if (!workout.scheduled_days || workout.scheduled_days.length === 0) {
            if (!groupedWorkouts['sin_dia']) groupedWorkouts['sin_dia'] = []
            groupedWorkouts['sin_dia'].push(workout)
        } else {
            workout.scheduled_days.forEach(day => {
                const normalizedDay = day.toLowerCase().trim()
                if (!groupedWorkouts[normalizedDay]) groupedWorkouts[normalizedDay] = []
                groupedWorkouts[normalizedDay].push(workout)
            })
        }
    })

    // Sort days
    const sortedDays = Object.keys(groupedWorkouts).sort((a, b) => {
        if (a === 'sin_dia') return 1
        if (b === 'sin_dia') return -1
        const indexA = DAYS_ORDER.indexOf(a)
        const indexB = DAYS_ORDER.indexOf(b)
        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB)
    })

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-300">
            {sortedDays.map(day => {
                const dayWorkouts = groupedWorkouts[day]
                if (!dayWorkouts || dayWorkouts.length === 0) return null

                const isToday = day === todayName
                const displayDay = day === 'sin_dia' ? 'Sin día asignado' : day.charAt(0).toUpperCase() + day.slice(1)

                return (
                    <div key={day} className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-500 px-1">{displayDay}</h3>
                        <div className="space-y-1">
                            {dayWorkouts.map((workout, idx) => (
                                <CompactWorkoutRow
                                    key={`${workout.id}-${day}-${idx}`}
                                    workout={workout}
                                    isToday={isToday}
                                    onEdit={() => onEdit(workout)}
                                    onDelete={() => onDelete(workout.id)}
                                    onView={() => onView(workout)}
                                    onDownload={() => onDownload(workout)}
                                    onStart={() => onStart(workout.id)}
                                />
                            ))}
                        </div>
                    </div>
                )
            })}
            {workouts.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/5">
                    <p className="text-muted-foreground">No hay rutinas asignadas.</p>
                </div>
            )}
        </div>
    )
}

function CompactWorkoutRow({
    workout,
    isToday,
    onEdit,
    onDelete,
    onView,
    onDownload,
    onStart
}: {
    workout: Workout
    isToday: boolean
    onEdit: () => void
    onDelete: () => void
    onView: () => void
    onDownload: () => void
    onStart: () => void
}) {
    const exercises = Array.isArray(workout.structure) ? workout.structure : []
    const exerciseCount = exercises.length
    const isEmpty = exerciseCount === 0

    return (
        <div
            className={cn(
                "group flex items-center justify-between w-full p-3 rounded-lg border bg-white transition-all h-[60px]", // Fixed height
                "hover:shadow-md hover:border-primary/20",
                isEmpty ? "opacity-70 bg-gray-50" : "",
                isToday ? "bg-primary/5 border-primary/20" : "border-transparent border-b-gray-100"
            )}
            onClick={onView}
        >
            {/* Left Info: Name & Metadata */}
            <div className="flex items-center gap-4 flex-1 overflow-hidden">
                <div className="flex flex-col justify-center min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={cn("font-semibold text-sm truncate", isEmpty ? "text-gray-500" : "text-gray-900")}>
                            {workout.name.replace(/^Rutina de\s+/i, '')}
                        </span>
                        {isEmpty && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded">Vacía</span>}
                    </div>

                    <div className="flex items-center text-xs text-gray-500 gap-3 mt-0.5">
                        <span className="flex items-center gap-1">
                            {exerciseCount} ejercicios
                        </span>

                        {workout.valid_until && (
                            (() => {
                                const reviewDate = parseISO(workout.valid_until)
                                const diffDays = Math.ceil((reviewDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24))
                                const isUpcoming = diffDays <= 7 && diffDays >= 0

                                return (
                                    <>
                                        {isUpcoming ? (
                                            <div className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100 font-medium">
                                                <Calendar className="h-3 w-3" />
                                                Revisar el {format(reviewDate, 'd MMM', { locale: es })}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-gray-400">
                                                <span className="text-gray-300">•</span>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="flex items-center gap-1 hover:text-gray-600 transition-colors cursor-help">
                                                                <Calendar className="h-3 w-3" />
                                                                <span>{format(reviewDate, 'd MMM', { locale: es })}</span>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Revisión programada: {format(reviewDate, 'd MMMM yyyy', { locale: es })}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        )}
                                    </>
                                )
                            })()
                        )}
                    </div>
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 pl-4">
                {/* Start Button: Visible on Hover or Today */}
                <div className={cn(
                    "transition-opacity duration-200",
                    isToday ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                    {!isEmpty && (
                        <Button
                            size="sm"
                            className="h-8 px-3 bg-[#5254D9] hover:bg-[#4547b8] text-white shadow-sm text-xs font-medium"
                            onClick={(e) => {
                                e.stopPropagation()
                                onStart()
                            }}
                        >
                            <Play className="h-3 w-3 mr-1.5" fill="currentColor" /> Comenzar
                        </Button>
                    )}
                </div>

                {/* More Options: Visible on Hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit() }}>
                                <Edit2 className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload() }}>
                                <Download className="mr-2 h-4 w-4" /> Descargar PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete() }}>
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    )
}
