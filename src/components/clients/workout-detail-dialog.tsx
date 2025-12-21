'use client'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Clock } from "lucide-react"

interface WorkoutDetailDialogProps {
    isOpen: boolean
    onClose: () => void
    workout: any
}

export function WorkoutDetailDialog({ isOpen, onClose, workout }: WorkoutDetailDialogProps) {
    if (!workout) return null

    const exercises = Array.isArray(workout.structure) ? workout.structure : []
    const scheduledDays = workout.scheduled_days && workout.scheduled_days.length > 0
        ? workout.scheduled_days.join(" | ")
        : "Sin dias asignados"

    // Calculate estimated time (rough estimate: 2 mins per set + rest time)
    // Simplified logic for mockup
    const totalDuration = "60 min"

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
                    <DialogTitle className="text-xl font-bold">Detalle de la rutina</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    {/* Header Info */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">{workout.name}</h2>
                        <div className="flex items-center text-sm text-muted-foreground gap-4">
                            <span className="font-medium text-foreground">{scheduledDays}</span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" /> {totalDuration}
                            </span>
                        </div>
                    </div>

                    {/* Exercises Table */}
                    <div className="border rounded-lg overflow-hidden">
                        <div className="grid grid-cols-5 gap-4 bg-muted/40 p-3 text-sm font-medium text-muted-foreground">
                            <div className="col-span-2">Nombre del ejercicio</div>
                            <div className="text-center">Series</div>
                            <div className="text-center">Repes</div>
                            <div className="text-center">Peso</div>
                            {/* <div className="text-center">Descanso</div> Space constraint? Image has 5 cols roughly */}
                        </div>

                        <div className="divide-y">
                            {exercises.map((ex: any, i: number) => (
                                <div key={i} className="grid grid-cols-5 gap-4 p-4 text-sm items-center">
                                    <div className="col-span-2 font-medium truncate" title={ex.name}>
                                        {ex.name}
                                    </div>
                                    <div className="text-center">{ex.sets}</div>
                                    <div className="text-center">{ex.reps}</div>
                                    <div className="text-center font-medium">
                                        {ex.weight || '0'} {ex.weight?.includes('kg') || ex.weight?.includes('lb') ? '' : 'kg'}
                                    </div>
                                    {/* <div className="text-center text-muted-foreground">{ex.rest || '-'}</div> */}
                                </div>
                            ))}
                            {exercises.length === 0 && (
                                <div className="p-8 text-center text-muted-foreground">
                                    No hay ejercicios en esta rutina.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes Section - Hardcoded or from DB if added later */}
                    <div className="space-y-2">
                        <h3 className="font-semibold text-base">Notas:</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {(workout.description && workout.description.trim() !== "")
                                ? workout.description
                                : "Se opero hace poco el hombro, asi que debemos mantener un entrenamiento sin tanta intensidad." // Placeholder from image if empty, or just blank
                            }
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
