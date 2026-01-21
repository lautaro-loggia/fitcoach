import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientDietPage from '@/components/clients/open/client-diet-page'

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

    // Use admin client to fetch diets
    const adminClient = createAdminClient()
    const { data: diets } = await adminClient
        .from('assigned_diets')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })

    return <ClientDietPage diets={diets || []} />
}
