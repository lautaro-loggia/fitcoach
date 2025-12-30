'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, Download, Plus } from 'lucide-react'
import { AssignWorkoutDialog } from '../assign-workout-dialog'
import { deleteAssignedWorkoutAction, updateAssignedWorkoutAction } from '@/app/(dashboard)/clients/[id]/training-actions'
import { WorkoutCard } from '../workout-card'
import { CalendarView } from '../calendar-view'
import { cn } from '@/lib/utils'
import { WorkoutDetailDialog } from '../workout-detail-dialog'
import { generateWorkoutPDF } from '@/lib/pdf-utils'
import { WorkoutHistory } from '../workout-history'

interface TrainingTabProps {
    client: any
}

export function TrainingTab({ client }: TrainingTabProps) {
    const [workouts, setWorkouts] = useState<any[]>([])
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
    const [editingWorkout, setEditingWorkout] = useState<any>(null)
    const [viewingWorkout, setViewingWorkout] = useState<any>(null) // New state for viewing details

    useEffect(() => {
        fetchAssignedWorkouts()
    }, [client.id])

    const fetchAssignedWorkouts = async () => {
        const supabase = createClient()
        const { data } = await supabase
            .from('assigned_workouts')
            .select('*')
            .eq('client_id', client.id)
            .order('created_at', { ascending: false })

        if (data) setWorkouts(data)
    }

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar esta rutina asignada?')) {
            await deleteAssignedWorkoutAction(id, client.id)
            fetchAssignedWorkouts()
        }
    }

    const handleUpdateStructure = async (workoutId: string, updatedStructure: any[]) => {
        const workout = workouts.find(w => w.id === workoutId)
        if (!workout) return

        await updateAssignedWorkoutAction({
            id: workoutId,
            clientId: client.id,
            name: workout.name,
            exercises: updatedStructure,
            validUntil: workout.valid_until,
            scheduledDays: workout.scheduled_days,
            notes: workout.notes
        })
        fetchAssignedWorkouts()
    }

    const handleDownloadWorkout = (workout: any) => {
        generateWorkoutPDF({ workout, client })
    }

    const handleDownloadAllWorkouts = () => {
        if (workouts.length === 0) {
            alert('No hay rutinas para descargar')
            return
        }

        workouts.forEach(workout => {
            setTimeout(() => {
                generateWorkoutPDF({ workout, client })
            }, 100)
        })
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div />

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                        variant={viewMode === 'calendar' ? 'default' : 'outline'}
                        className={cn(viewMode === 'calendar' ? "bg-orange-600 hover:bg-orange-700" : "")}
                        onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {viewMode === 'list' ? 'Calendario' : 'Lista'}
                    </Button>

                    <AssignWorkoutDialog
                        clientId={client.id}
                        onOpenChange={(open) => {
                            if (!open) fetchAssignedWorkouts()
                        }}
                    />

                    <Button variant="outline" className="hidden sm:flex" onClick={handleDownloadAllWorkouts}>
                        <Download className="mr-2 h-4 w-4" /> Descargar Rutinas
                    </Button>
                </div>
            </div>

            <div className="flex-1">
                {viewMode === 'list' ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {workouts.map(workout => (
                            <WorkoutCard
                                key={workout.id}
                                workout={workout}
                                onEdit={() => setEditingWorkout(workout)}
                                onDelete={() => handleDelete(workout.id)}
                                onView={() => setViewingWorkout(workout)}
                                onDownload={() => handleDownloadWorkout(workout)}
                            />
                        ))}
                        {workouts.length === 0 && (
                            <div className="col-span-full text-center py-12 border-2 border-dashed rounded-xl bg-muted/5">
                                <p className="text-muted-foreground">No hay rutinas asignadas.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <CalendarView
                        workouts={workouts}
                        onUpdateWorkout={handleUpdateStructure}
                    />
                )}
            </div>

            {editingWorkout && (
                <AssignWorkoutDialog
                    clientId={client.id}
                    existingWorkout={editingWorkout}
                    open={true}
                    onOpenChange={(open) => {
                        if (!open) {
                            setEditingWorkout(null)
                            fetchAssignedWorkouts()
                        }
                    }}
                    trigger={<span className="hidden" />}
                />
            )}

            {viewingWorkout && (
                <WorkoutDetailDialog
                    isOpen={true}
                    onClose={() => setViewingWorkout(null)}
                    workout={viewingWorkout}
                    client={client}
                />
            )}

            {/* Workout History Section */}
            <div className="mt-8">
                <WorkoutHistory clientId={client.id} />
            </div>
        </div>
    )

}
