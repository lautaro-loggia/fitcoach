import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientDietDetail from '@/components/clients/open/client-diet-detail'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/auth/login')

    // 1. Get client ID
    const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (!client) return <div>No client found</div>

    // 2. Fetch diet using admin client
    const adminClient = createAdminClient()
    const { data: diet } = await adminClient
        .from('assigned_diets')
        .select('*')
        .eq('id', id)
        .single()

    if (!diet) return <div>Plan no encontrado</div>

    // 3. Security Check
    if (diet.client_id !== client.id) {
        return <div>No autorizado</div>
    }

    // Parse logic if needed? The database returns jsonb as object usually with Supabase JS
    // We can pass it directly.

    return <ClientDietDetail diet={diet} />
}
