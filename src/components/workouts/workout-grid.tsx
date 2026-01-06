'use client'

import { useState } from "react"
import { TemplateWorkoutCard } from "./template-workout-card"
import { WorkoutDetailDialog } from "@/components/clients/workout-detail-dialog"
import { AssignWorkoutToClientsDialog } from "./assign-workout-to-clients-dialog"
import { deleteWorkoutAction } from "@/app/(dashboard)/workouts/actions"
import { useRouter } from "next/navigation"
import { Dumbbell } from "lucide-react"
import { WorkoutDialog } from "./add-workout-dialog"

interface WorkoutGridProps {
    workouts: any[]
}

export function WorkoutGrid({ workouts }: WorkoutGridProps) {
    const router = useRouter()

    // State for dialogs
    const [detailWorkout, setDetailWorkout] = useState<any | null>(null)
    const [assignWorkout, setAssignWorkout] = useState<any | null>(null)
    const [editingWorkout, setEditingWorkout] = useState<any | null>(null)

    const handleDelete = async (id: string) => {
        if (confirm("¿Estás seguro de eliminar esta rutina? Se perderá la plantilla (no afectará a las ya asignadas).")) {
            await deleteWorkoutAction(id)
            router.refresh()
        }
    }

    /* 
       Previously navigated to detail page. 
       Now opens the edit dialog.
    */
    const handleEdit = (workout: any) => {
        setEditingWorkout(workout)
    }

    if (!workouts || workouts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-lg bg-muted/5">
                <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No hay rutinas creadas</h3>
                <p className="text-muted-foreground mb-4">Empezá creando tu primera rutina de entrenamiento.</p>
            </div>
        )
    }

    return (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {workouts.map(workout => (
                    <TemplateWorkoutCard
                        key={workout.id}
                        workout={workout}
                        onClick={() => setDetailWorkout(workout)}
                        onEdit={() => handleEdit(workout)} // Pass object instead of ID
                        onDelete={() => handleDelete(workout.id)}
                        onAssign={() => setAssignWorkout(workout)}
                    />
                ))}
            </div>

            {/* Dialogs */}
            <WorkoutDetailDialog
                isOpen={!!detailWorkout}
                onClose={() => setDetailWorkout(null)}
                workout={detailWorkout}
                onEdit={() => {
                    setDetailWorkout(null)
                    handleEdit(detailWorkout)
                }}
            // client={undefined} // No client passed here as it's a template view
            />

            <AssignWorkoutToClientsDialog
                open={!!assignWorkout}
                onOpenChange={(open) => !open && setAssignWorkout(null)}
                workout={assignWorkout}
            />

            {editingWorkout && (
                <WorkoutDialog
                    existingWorkout={editingWorkout}
                    open={true}
                    onOpenChange={(open) => !open && setEditingWorkout(null)}
                    trigger={<span className="hidden" />} // Hidden trigger as it's controlled
                />
            )}
        </>
    )
}
