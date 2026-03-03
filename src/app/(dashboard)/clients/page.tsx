import { createClient } from '@/lib/supabase/server'
import { ClientTable, Client } from '@/components/clients/client-table'
import { Workout } from '@/components/clients/presential-calendar-dialog'
import { compareDateStrings } from '@/lib/utils'

interface ClientsPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

type PresentialWorkoutRow = {
    id: string
    created_at: string
    valid_until: string | null
    scheduled_days: string[] | null
    client: { id: string; full_name: string; avatar_url: string | null } | Array<{ id: string; full_name: string; avatar_url: string | null }> | null
}

export default async function ClientsPage({ searchParams: searchParamsPromise }: ClientsPageProps) {
    const searchParams = await searchParamsPromise
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Fetch clients
    const { data: clients, error } = await supabase
        .from('clients')
        .select(`
      *,
      checkins (
        date
      ),
      plan:plans(name)
    `)
        .eq('trainer_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching clients", error)
    }

    const formattedClients: Client[] = clients?.map(client => ({
        ...client,
        checkins: client.checkins
            ? client.checkins.sort((a: { date: string }, b: { date: string }) => compareDateStrings(b.date, a.date))
            : []
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

    const typedPresentialWorkouts: Workout[] = ((presentialWorkouts || []) as PresentialWorkoutRow[])
        .map((w) => {
            const client = Array.isArray(w.client) ? w.client[0] : w.client
            if (!client) return null
            return {
                id: w.id,
                created_at: w.created_at,
                valid_until: w.valid_until,
                scheduled_days: w.scheduled_days || [],
                client
            }
        })
        .filter((item): item is Workout => !!item)


    return (
        <ClientTable
            clients={formattedClients}
            presentialWorkouts={typedPresentialWorkouts}
            defaultOpenNew={searchParams?.new === 'true'}
        />
    )
}
