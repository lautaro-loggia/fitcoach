import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientPlanPage from '@/components/clients/open/client-plan-page'

export default async function Page() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/auth/login')

    // Get client id
    const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (!client) return <div>No client found</div>

    // Use admin client to fetch workouts to avoid RLS issues
    const adminClient = createAdminClient()
    const { data: workouts } = await adminClient
        .from('assigned_workouts')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })

    return <ClientPlanPage workouts={workouts || []} />
}
