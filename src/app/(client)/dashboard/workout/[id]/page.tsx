import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientWorkoutDetail from '@/components/clients/open/client-workout-detail'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/auth/login')

    // Verify ownership indirectly or assume path is safe if we don't care about sophisticated attacks for now
    // But better: Check if the workout belongs to the user via client_id

    // 1. Get client ID
    const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (!client) return <div>No client found</div>

    // 2. Fetch workout using admin client 
    const adminClient = createAdminClient()
    const { data: workout } = await adminClient
        .from('assigned_workouts')
        .select('*')
        .eq('id', id)
        .single()

    if (!workout) return <div>Rutina no encontrada</div>

    // 3. Security Check: Ensure this workout belongs to this client
    if (workout.client_id !== client.id) {
        return <div>No autorizado</div>
    }

    return <ClientWorkoutDetail workout={workout} />
}
