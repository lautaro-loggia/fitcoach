import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CheckinForm } from './_components/checkin-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function CheckinPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/auth/login')

    const { data: client } = await supabase
        .from('clients')
        .select('current_weight, gender, height, next_checkin_date')
        .eq('user_id', user.id)
        .single()

    if (client && client.next_checkin_date) {
        // Parse YYYY-MM-DD in local time
        const nextDate = new Date(client.next_checkin_date + 'T00:00:00')
        const today = new Date()
        // Reset time part of today for fair comparison or just compare timestamps?
        // Actually, if today is 12th and next is 12th, it should be allowed.
        // So strict inequality: if now < nextDate (at 00:00), it implies today is strictly before.
        // Example: Now = 11th 23:00. Next = 12th 00:00. Now < Next. Blocked. Correct.
        // Example: Now = 12th 08:00. Next = 12th 00:00. Now >= Next. Allowed. Correct.
        if (today < nextDate) {
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
