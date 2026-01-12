
import { createClient } from '@/lib/supabase/server'
import { ClientTable, Client } from '@/components/clients/client-table'
import { AddClientDialog } from '@/components/clients/add-client-dialog'

import { PresentialCalendarDialog, Workout } from '@/components/clients/presential-calendar-dialog'

export default async function ClientsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Fetch clients
    // We also want checkins to calculate next date.
    // We just need the latest checkin date.
    const { data: clients, error } = await supabase
        .from('clients')
        .select(`
      *,
      checkins (
        date
      ),
      plan:plans(name)
    `)
        .order('created_at', { ascending: false })

    // Sort checkins in the application layer if not sorted by database relation (limit in relation is tricky in supabase-js simple query)
    // Usually .select('*, checkins(date).order(date, {ascending: false}).limit(1)') works in advanced API but basic js client syntax is sometimes restricted.
    // Let's assume we get all dates and sort in JS for MVP since data volume is low.
    // Actually, better to just fetch them.

    if (error) {
        console.error("Error fetching clients", error)
    }

    // Pre-process clients to sort checkins if needed, or pass as is.
    const formattedClients: Client[] = clients?.map(client => ({
        ...client,
        checkins: client.checkins ? client.checkins.sort((a: { date: string }, b: { date: string }) => new Date(b.date).getTime() - new Date(a.date).getTime()) : []
    })) as Client[] || []

    // Fetch presential workouts for the calendar
    const { data: presentialWorkouts } = await supabase
        .from('assigned_workouts')
        .select(`
            id,
            name,
            scheduled_days,
            valid_until,
            created_at,
            client:clients(id, full_name, avatar_url)
        `)
        .eq('trainer_id', user.id)
        .eq('is_presential', true)

    // Map workouts to match expected interface (Supabase returns array for single relation sometimes if not properly typed)
    const typedPresentialWorkouts: Workout[] = presentialWorkouts?.map((w: {
        id: string
        created_at: string
        valid_until: string | null
        scheduled_days: string[]
        client: { id: string; full_name: string; avatar_url: string | null } | { id: string; full_name: string; avatar_url: string | null }[]
    }) => ({
        id: w.id,
        created_at: w.created_at,
        valid_until: w.valid_until,
        scheduled_days: w.scheduled_days || [],
        client: Array.isArray(w.client) ? w.client[0] : w.client
    })) || []


    return (
        <div className="space-y-6 md:space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Mis Asesorados</h2>
                    <p className="text-muted-foreground">
                        Gestioná tus clientes, sus planes y seguimiento.
                    </p>
                </div>
                <div className="flex gap-2">
                    <PresentialCalendarDialog workouts={typedPresentialWorkouts} />
                    <AddClientDialog />
                </div>
            </div>

            <ClientTable clients={formattedClients} />
        </div>
    )
}
