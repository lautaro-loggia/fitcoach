"use client"

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit2, Eye, Trash2, Download, Play } from "lucide-react"
import { format } from "date-fns"
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
        ? `Revisar el ${format(new Date(workout.valid_until), "d 'de' MMMM, yyyy", { locale: es })}`
        : "Sin fecha de revisión"

    return (
        <Card
            className="relative hover:shadow transition-all cursor-pointer group flex flex-col h-full"
            onClick={onView}
        >
            <CardHeader className="p-5 space-y-0 flex-1">
                <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-lg font-bold pr-8 leading-tight">
                        {workout.name}
                    </CardTitle>

                    <div className="absolute top-3 right-2" onClick={(e) => e.stopPropagation()}>
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

                <div className="flex flex-col gap-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground bg-secondary/50 px-2 py-0.5 rounded text-xs">
                            {exerciseCount} {exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
                        </span>
                        <span className="mx-2 text-muted-foreground/40">|</span>
                        <span className="truncate text-xs font-medium max-w-[180px]" title={scheduledDays}>
                            {scheduledDays}
                        </span>
                    </div>

                    <div className="text-xs text-muted-foreground pt-3 border-t mt-1">
                        {checkDateString}
                    </div>
                </div>
            </CardHeader>
            {onStart && (
                <CardFooter className="p-4 pt-0 mt-auto">
                    <Button
                        className="w-full bg-[#5254D9] hover:bg-[#4547b8] text-white relative z-10"
                        onClick={(e) => {
                            e.stopPropagation();
                            onStart();
                        }}
                    >
                        <Play className="mr-2 h-4 w-4" /> Comenzar
                    </Button>
                </CardFooter>
            )}
        </Card>
    )
}
