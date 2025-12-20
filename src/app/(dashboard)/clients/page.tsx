
import { createClient } from '@/lib/supabase/server'
import { ClientTable } from '@/components/clients/client-table'
import { AddClientDialog } from '@/components/clients/add-client-dialog'

export default async function ClientsPage() {
    const supabase = await createClient()

    // Fetch clients
    // We also want checkins to calculate next date.
    // We just need the latest checkin date.
    const { data: clients, error } = await supabase
        .from('clients')
        .select(`
      *,
      checkins (
        date
      )
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
    const formattedClients = clients?.map(client => ({
        ...client,
        checkins: client.checkins ? client.checkins.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()) : []
    })) || []

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Mis Asesorados</h2>
                    <p className="text-muted-foreground">
                        Gestioná tus clientes, sus planes y seguimiento.
                    </p>
                </div>
                <AddClientDialog />
            </div>

            <ClientTable clients={formattedClients as any} />
        </div>
    )
}
