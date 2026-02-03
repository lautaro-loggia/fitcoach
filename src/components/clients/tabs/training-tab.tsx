'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Calendar03Icon, GridViewIcon, PlusSignIcon, LayoutTopIcon, ZapIcon } from 'hugeicons-react'
import { AssignWorkoutDialog } from '../assign-workout-dialog'
import { deleteAssignedWorkoutAction, updateAssignedWorkoutAction } from '@/app/(dashboard)/clients/[id]/training-actions'

import { WorkoutCard } from '../workout-card'
import { CalendarView } from '../calendar-view'
import { cn } from '@/lib/utils'
import { WorkoutDetailDialog } from '../workout-detail-dialog'
import { generateWorkoutPDF } from '@/lib/pdf-utils'
import { TrainingSummarySidebar } from '../training-summary-sidebar'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface TrainingTabProps {
    client: any
}

export function TrainingTab({ client }: TrainingTabProps) {
    const router = useRouter()
    const [workouts, setWorkouts] = useState<any[]>([])
    const [viewMode, setViewMode] = useState<'cards' | 'calendar'>('cards')
    const [editingWorkout, setEditingWorkout] = useState<any>(null)
    const [viewingWorkout, setViewingWorkout] = useState<any>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        fetchAssignedWorkouts()

        const handleRefresh = () => fetchAssignedWorkouts()
        window.addEventListener('refresh-workouts', handleRefresh)
        return () => window.removeEventListener('refresh-workouts', handleRefresh)
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

    // Logic for today's workout
    const getTodayWorkout = () => {
        if (!workouts.length) return null
        const dayOfWeek = format(new Date(), 'EEEE', { locale: es }).toLowerCase()
        // Simple matching logic assuming scheduled_days is an array of strings
        // Adjust if it's different in the database
        return workouts.find(w =>
            Array.isArray(w.scheduled_days) &&
            w.scheduled_days.some((d: string) => d.toLowerCase() === dayOfWeek)
        ) || workouts[0] // Fallback to first if none scheduled for today for demo
    }

    const todayWorkout = getTodayWorkout()

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Left Column: Workouts */}
                <div className="lg:col-span-2 space-y-10">

                    {/* Today's Workout Section */}
                    {todayWorkout && (
                        <section className="space-y-4">
                            <Card className="relative overflow-hidden p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white border-border py-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.15em]">HOY</span>
                                        <Badge variant="secondary" className="bg-orange-50 text-orange-600 border-none px-2.5 py-0.5 h-6 text-[10px] font-bold rounded-full">
                                            Pendiente
                                        </Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-3xl font-extrabold text-gray-900 tracking-tight capitalize">
                                            {format(new Date(), 'EEEE', { locale: es })} – {todayWorkout.name}
                                        </h4>
                                        <div className="flex items-center gap-2 text-indigo-500">
                                            <GridViewIcon className="h-3.5 w-3.5" />
                                            <span className="text-xs font-bold uppercase tracking-wider">
                                                {todayWorkout.structure?.length || 0} Ejercicios
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        className="h-12 px-8 rounded-xl bg-[#5254D9] hover:bg-[#4345B8] text-white font-bold text-sm gap-2 transition-all hover:scale-[1.02]"
                                        onClick={() => setViewingWorkout(todayWorkout)}
                                    >
                                        <ZapIcon className="h-4 w-4 fill-current" /> Ver rutina
                                    </Button>
                                </div>
                            </Card>
                        </section>
                    )}

                    {/* Scheduled Workouts Section */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-extrabold text-gray-900">Rutinas programadas</h3>

                            {/* View Toggle */}
                            <div className="flex items-center bg-gray-100/50 p-1 rounded-xl border border-gray-100">
                                <Button
                                    variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className={cn("text-[10px] font-bold h-8 px-3 rounded-lg shadow-none", viewMode === 'cards' && "bg-white border")}
                                    onClick={() => setViewMode('cards')}
                                >
                                    <GridViewIcon className="mr-2 h-3.5 w-3.5" /> Tarjetas
                                </Button>
                                <Button
                                    variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className={cn("text-[10px] font-bold h-8 px-3 rounded-lg shadow-none", viewMode === 'calendar' && "bg-white border")}
                                    onClick={() => setViewMode('calendar')}
                                >
                                    <Calendar03Icon className="mr-2 h-3.5 w-3.5" /> Calendario
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1">
                            {viewMode === 'cards' && (
                                <div className="grid gap-6 md:grid-cols-2">
                                    {workouts.map(workout => (
                                        <WorkoutCard
                                            key={workout.id}
                                            workout={workout}
                                            onEdit={() => setEditingWorkout(workout)}
                                            onDelete={() => handleDelete(workout.id)}
                                            onView={() => setViewingWorkout(workout)}
                                            onDownload={() => generateWorkoutPDF({ workout, client })}
                                        />
                                    ))}
                                    {workouts.length === 0 && (
                                        <div className="col-span-full text-center py-16 border-2 border-dashed rounded-3xl bg-gray-50/50 border-gray-200">
                                            <p className="text-gray-400 font-medium text-sm">No hay rutinas asignadas aún.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {viewMode === 'calendar' && (
                                <CalendarView
                                    workouts={workouts}
                                    clientId={client.id}
                                    onUpdateWorkout={handleUpdateStructure}
                                />
                            )}
                        </div>
                    </section>
                </div>

                {/* Right Column: Sidebar */}
                <div className="lg:col-span-1">
                    <TrainingSummarySidebar client={client} />
                </div>
            </div>

            {/* Dialogs */}
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
        </div>
    )
}
