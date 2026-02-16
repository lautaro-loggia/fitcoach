import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CheckinForm } from './_components/checkin-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function CheckinPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: client } = await supabase
        .from('clients')
        .select('id, current_weight, gender, height, next_checkin_date')
        .eq('user_id', user.id)
        .single()

    if (!client) redirect('/dashboard')

    // Check for existing check-ins
    const { count: checkinCount } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', (client as any).id) // Assuming we need client.id which we missed in the select

    const hasCheckins = (checkinCount || 0) > 0

    if (client && client.next_checkin_date) {
        const nextDate = new Date(client.next_checkin_date + 'T00:00:00')
        const today = new Date()

        // Simulation Override
        const isSimulationUser = user.email === 'lautarologgia@gmail.com'

        if (today < nextDate && !isSimulationUser) {
            redirect('/dashboard')
        }
    } else if (hasCheckins) {
        // If has baseline/checkins but no next date set, block it (coach must define it)
        // Also allow simulation user here if needed, but usually they have a date.
        const isSimulationUser = user.email === 'lautarologgia@gmail.com'
        if (!isSimulationUser) {
            redirect('/dashboard')
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-lg mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-2">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon" className="-ml-2">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold">Nuevo Check-in</h1>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <CheckinForm
                        initialWeight={client?.current_weight || undefined}
                        gender={client?.gender}
                        height={client?.height}
                    />
                </div>
            </div>
        </div>
    )
}
