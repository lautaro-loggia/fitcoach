"use client"

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit2, Eye, Trash2, Download, Play, Calendar as CalendarIcon } from "lucide-react"
import { format, parse } from "date-fns"
import { es } from "date-fns/locale"

interface WorkoutCardProps {
    workout: any
    onEdit: () => void
    onDelete: () => void
    onView?: () => void
    onDownload?: () => void
    onStart?: () => void
}

export function WorkoutCard({ workout, onEdit, onDelete, onView, onDownload, onStart }: WorkoutCardProps) {
    const exercises = Array.isArray(workout.structure) ? workout.structure : []
    const exerciseCount = exercises.length

    // Format Scheduled Days
    const scheduledDays = workout.scheduled_days && workout.scheduled_days.length > 0
        ? workout.scheduled_days.join(" | ")
        : "Sin dias asignados"

    // Check date string
    const checkDateString = workout.valid_until
        ? `Revisar el ${format(parse(workout.valid_until, 'yyyy-MM-dd', new Date()), "d 'de' MMMM, yyyy", { locale: es })}`
        : "Sin fecha de revisión"

    return (
        <Card
            className="relative hover:shadow-md transition-all cursor-pointer group flex flex-col h-full bg-white border-gray-100"
            onClick={onView}
        >
            <CardHeader className="p-4 space-y-0 flex-1">
                <div className="flex justify-between items-start mb-1">
                    <CardTitle className="text-base font-bold pr-8 leading-tight truncate w-full" title={workout.name}>
                        {workout.name.replace(/^Rutina de\s+/i, '')}
                    </CardTitle>

                    <div className="absolute top-2 right-2 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {onStart && (
                            <Button
                                size="icon"
                                className="h-8 w-8 bg-[#5254D9] hover:bg-[#4547b8] text-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Comenzar entrenamiento"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStart();
                                }}
                            >
                                <Play className="h-3.5 w-3.5" fill="currentColor" />
                            </Button>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={onView}>
                                    <Eye className="mr-2 h-4 w-4" /> Ver detalle
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onDownload}>
                                    <Download className="mr-2 h-4 w-4" /> Descargar PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onEdit}>
                                    <Edit2 className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                        <span className="font-medium bg-gray-50 text-gray-600 px-2 py-0.5 rounded border border-gray-100">
                            {exerciseCount} {exerciseCount === 1 ? 'ejer' : 'ejers'}
                        </span>
                        <span className="text-muted-foreground/30">•</span>
                        <span className="truncate max-w-[150px]" title={String(workout.scheduled_days?.join(', ') || '')}>
                            {scheduledDays}
                        </span>
                    </div>

                    {workout.valid_until && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3 opacity-50" />
                            {format(parse(workout.valid_until, 'yyyy-MM-dd', new Date()), "d MMM", { locale: es })}
                        </div>
                    )}
                </div>
            </CardHeader>
        </Card>
    )
}
