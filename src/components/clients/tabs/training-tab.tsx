'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dumbbell, Trash2, Calendar as CalendarIcon, Edit, Pencil } from 'lucide-react'
import { AssignWorkoutDialog } from '../assign-workout-dialog'
import { deleteAssignedWorkoutAction } from '@/app/(dashboard)/clients/[id]/training-actions'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface TrainingTabProps {
    clientId: string
}

export function TrainingTab({ clientId }: TrainingTabProps) {
    const [workouts, setWorkouts] = useState<any[]>([])

    // Realtime subscription or simple fetch on mount
    useEffect(() => {
        fetchAssignedWorkouts()
    }, [clientId])

    const fetchAssignedWorkouts = async () => {
        const supabase = createClient()
        const { data } = await supabase
            .from('assigned_workouts')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false })

        if (data) setWorkouts(data)
    }

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar esta rutina asignada?')) {
            await deleteAssignedWorkoutAction(id, clientId)
            fetchAssignedWorkouts() // Refresh list
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Plan de Entrenamiento</h3>
                    <p className="text-sm text-muted-foreground">Rutinas asignadas actualmente.</p>
                </div>
                <AssignWorkoutDialog clientId={clientId} />
            </div>

            <div className="grid gap-4">
                {workouts.map((workout) => {
                    const exercises = Array.isArray(workout.structure) ? workout.structure : []
                    return (
                        <Card key={workout.id} className="relative group">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <Dumbbell className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{workout.name}</CardTitle>
                                            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground mt-1">
                                                <span>Asignado el {format(new Date(workout.created_at), "d 'de' MMMM, yyyy", { locale: es })}</span>
                                                {workout.valid_until && (
                                                    <span className="text-orange-600 font-medium flex items-center gap-1">
                                                        <CalendarIcon className="h-3 w-3" />
                                                        Válido hasta: {format(new Date(workout.valid_until), "d 'de' MMMM, yyyy", { locale: es })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <AssignWorkoutDialog
                                            clientId={clientId}
                                            existingWorkout={workout}
                                            trigger={
                                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            }
                                        />

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive"
                                            onClick={() => handleDelete(workout.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 tracking-wider">Ejercicios</p>
                                        <div className="grid gap-2">
                                            {exercises.map((ex: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center text-sm p-2 bg-muted/20 rounded-md hover:bg-muted/40 transition-colors">
                                                    <span className="font-medium">{ex.name}</span>
                                                    <div className="flex gap-3 text-muted-foreground text-xs">
                                                        <span>{ex.sets}x{ex.reps}</span>
                                                        {ex.rpe && <span>RPE {ex.rpe}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                            {exercises.length === 0 && <p className="text-sm text-muted-foreground italic">Sin ejercicios configurados</p>}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}

                {workouts.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/5">
                        <Dumbbell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-foreground">No hay rutinas asignadas</h4>
                        <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                            Comenzá asignando una rutina de entrenamiento desde tus plantillas o creá una nueva totalmente personalizada.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
