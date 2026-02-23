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
    const { data: latestCheckin } = await supabase
        .from('checkins')
        .select('date')
        .eq('client_id', client.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()

    const hasCheckins = !!latestCheckin

    if (client && client.next_checkin_date) {
        const nextDate = new Date(client.next_checkin_date + 'T00:00:00')
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (today < nextDate) {
            redirect('/dashboard')
        }

        if (latestCheckin?.date) {
            const lastCheckinDate = new Date(latestCheckin.date + 'T00:00:00')
            const marginDate = new Date(nextDate)
            marginDate.setDate(marginDate.getDate() - 3)

            if (lastCheckinDate >= marginDate) {
                redirect('/dashboard')
            }
        }
    } else if (hasCheckins) {
        // Si tiene check-ins pero no tiene fecha de próximo (el coach debe definirla)
        redirect('/dashboard')
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
