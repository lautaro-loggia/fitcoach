'use client'

import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Dumbbell, MoreVertical, Edit, Trash2, UserPlus } from "lucide-react"
import { format } from "date-fns"

interface TemplateWorkoutCardProps {
    workout: any
    onClick: () => void
    onEdit: () => void
    onDelete: () => void
    onAssign: () => void
}

export function TemplateWorkoutCard({ workout, onClick, onEdit, onDelete, onAssign }: TemplateWorkoutCardProps) {
    const exercises = Array.isArray(workout.structure) ? workout.structure : []
    const exerciseCount = exercises.length

    return (
        <Card
            className="h-full group hover:border-violet-primary/50 hover:shadow-md transition-all cursor-pointer relative"
            onClick={onClick}
        >
            <div className="absolute top-4 right-4 z-10" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onAssign}>
                            <UserPlus className="mr-2 h-4 w-4" /> Asignar a...
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onEdit}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="p-2 bg-muted/50 rounded-lg text-primary mb-3">
                        <Dumbbell className="h-6 w-6" />
                    </div>
                </div>
                <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors pr-8">
                    {workout.name}
                </CardTitle>
                {workout.description && (
                    <CardDescription className="line-clamp-2 text-xs">
                        {workout.description}
                    </CardDescription>
                )}
            </CardHeader>

            <CardContent className="pb-3">
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Ejercicios ({exerciseCount})
                    </p>
                    <ul className="text-sm text-foreground/80 space-y-1">
                        {exercises.slice(0, 3).map((ex: any, i: number) => (
                            <li key={i} className="truncate flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-violet-primary shrink-0" />
                                {ex.name}
                            </li>
                        ))}
                        {exercises.length > 3 && (
                            <li className="text-xs text-muted-foreground pl-3 italic">
                                + {exercises.length - 3} más...
                            </li>
                        )}
                        {exercises.length === 0 && (
                            <li className="text-xs text-muted-foreground italic pl-3">Sin ejercicios</li>
                        )}
                    </ul>
                </div>
            </CardContent>

            <CardFooter className="pt-0 border-t bg-muted/20 p-4 mt-auto">
                <div className="text-xs text-muted-foreground w-full flex justify-between items-center px-2">
                    <span>Creado el {format(new Date(workout.created_at), 'dd/MM/yyyy')}</span>
                </div>
            </CardFooter>
        </Card>
    )
}
