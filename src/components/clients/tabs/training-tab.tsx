'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, Download, Plus, LayoutGrid } from 'lucide-react'
import { AssignWorkoutDialog } from '../assign-workout-dialog'
import { deleteAssignedWorkoutAction, updateAssignedWorkoutAction } from '@/app/(dashboard)/clients/[id]/training-actions'
import { getOrCreateSession } from '@/app/(dashboard)/session/actions'
import { WorkoutCard } from '../workout-card'
import { CalendarView } from '../calendar-view'
import { cn } from '@/lib/utils'
import { WorkoutDetailDialog } from '../workout-detail-dialog'
import { generateWorkoutPDF } from '@/lib/pdf-utils'
import { WorkoutHistory } from '../workout-history'
import { InjuriesCard } from '../cards/injuries-card'




interface TrainingTabProps {
    client: any
}

export function TrainingTab({ client }: TrainingTabProps) {
    const router = useRouter()
    const [workouts, setWorkouts] = useState<any[]>([])
    const [viewMode, setViewMode] = useState<'cards' | 'calendar'>('cards')
    const [editingWorkout, setEditingWorkout] = useState<any>(null)
    const [viewingWorkout, setViewingWorkout] = useState<any>(null) // New state for viewing details

    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
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

    const handleStartSession = async (workoutId: string) => {
        try {
            const result = await getOrCreateSession(client.id, workoutId)
            if (result.session) {
                router.push(`/session/${result.session.id}`)
            } else if (result.error) {
                console.error("Error starting session:", result.error)
                alert("Error al iniciar sesión de entrenamiento")
            }
        } catch (err) {
            console.error(err)
            alert("Error inesperado")
        }
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Portal Action Buttons to Page Header */}
            {mounted && document.getElementById('header-actions') && createPortal(
                <>
                    <AssignWorkoutDialog
                        clientId={client.id}
                        clientName={client.full_name}
                        onOpenChange={(open) => {
                            if (!open) fetchAssignedWorkouts()
                        }}
                        trigger={
                            <Button size="sm" className="bg-[#18181B] hover:bg-[#18181B]/90 text-white h-9 shadow-sm gap-2">
                                <Plus className="h-4 w-4" /> Asignar Rutina
                            </Button>
                        }
                    />

                    {workouts.length > 0 && (
                        <Button variant="outline" size="sm" className="h-9 gap-2 bg-white" onClick={handleDownloadAllWorkouts}>
                            <Download className="h-4 w-4" /> Descargar
                        </Button>
                    )}
                </>,
                document.getElementById('header-actions')!
            )}

            {/* Injuries Summary */}
            <InjuriesCard client={client} />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* View Toggles */}
                <div className="flex items-center bg-muted/20 p-1 rounded-lg border">
                    <Button
                        variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => setViewMode('cards')}
                    >
                        <LayoutGrid className="mr-2 h-3.5 w-3.5" /> Tarjetas
                    </Button>
                    <Button
                        variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => setViewMode('calendar')}
                    >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" /> Calendario
                    </Button>
                </div>
            </div>

            <div className="flex-1">
                {viewMode === 'cards' && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {workouts.map(workout => (
                            <WorkoutCard
                                key={workout.id}
                                workout={workout}
                                onEdit={() => setEditingWorkout(workout)}
                                onDelete={() => handleDelete(workout.id)}
                                onView={() => setViewingWorkout(workout)}
                                onDownload={() => handleDownloadWorkout(workout)}
                                onStart={() => handleStartSession(workout.id)}
                            />
                        ))}
                        {workouts.length === 0 && (
                            <div className="col-span-full text-center py-12 border-2 border-dashed rounded-xl bg-muted/5">
                                <p className="text-muted-foreground">No hay rutinas asignadas.</p>
                            </div>
                        )}
                    </div>
                )}

                {viewMode === 'calendar' && (
                    <CalendarView
                        workouts={workouts}
                        onUpdateWorkout={handleUpdateStructure}
                    />
                )}
            </div>

            {editingWorkout && (
                <AssignWorkoutDialog
                    clientId={client.id}
                    clientName={client.full_name}
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
                    onEdit={() => {
                        setViewingWorkout(null)
                        setEditingWorkout(viewingWorkout)
                    }}
                />
            )}

            {/* Workout History Section */}
            <div className="mt-8">
                <WorkoutHistory clientId={client.id} />
            </div>
        </div>
    )

}
