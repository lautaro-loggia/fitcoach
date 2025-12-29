import { createClient } from '@/lib/supabase/server'
import { WorkoutDialog } from '@/components/workouts/add-workout-dialog'
import { WorkoutGrid } from '@/components/workouts/workout-grid'

export default async function WorkoutsPage() {
    const supabase = await createClient()

    const { data: workouts } = await supabase
        .from('workouts')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Entrenamientos</h2>
                    <p className="text-muted-foreground">
                        Diseñá tus rutinas para asignarlas a los clientes.
                    </p>
                </div>
                <WorkoutDialog />
            </div>

            <WorkoutGrid workouts={workouts || []} />
        </div>
    )
}
