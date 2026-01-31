import { createClient } from '@/lib/supabase/server'
import { WorkoutDialog } from '@/components/workouts/add-workout-dialog'
import { WorkoutGrid } from '@/components/workouts/workout-grid'
import { DashboardTopBar } from '@/components/layout/dashboard-top-bar'

export default async function WorkoutsPage() {
    const supabase = await createClient()

    const { data: workouts } = await supabase
        .from('workouts')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className="flex flex-col min-h-screen">
            <DashboardTopBar
                title="Entrenamientos"
                subtitle="Diseñá tus rutinas para asignarlas a los clientes"
            >
                <WorkoutDialog />
            </DashboardTopBar>

            <main className="flex-1 p-4 md:p-8 pt-6 space-y-6">
                <WorkoutGrid workouts={workouts || []} />
            </main>
        </div>
    )
}
