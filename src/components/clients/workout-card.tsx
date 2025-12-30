"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit2, Eye, Trash2, Download } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface WorkoutCardProps {
    workout: any
    onEdit: () => void
    onDelete: () => void
    onView?: () => void
    onDownload?: () => void
}

export function WorkoutCard({ workout, onEdit, onDelete, onView, onDownload }: WorkoutCardProps) {
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
        <Card className="relative hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                    <span className="text-xs font-medium text-primary truncate max-w-[80%]">
                        {checkDateString}
                    </span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2">
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
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
                <CardTitle className="text-lg font-bold mt-1 mb-1">{workout.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="flex items-center text-sm text-muted-foreground mt-2">
                    <span className="font-semibold text-foreground mr-1">{exerciseCount} ejercicios</span>
                    <span className="mx-2">|</span>
                    <span className="truncate">{scheduledDays}</span>
                </div>
            </CardContent>
        </Card>
    )
}
