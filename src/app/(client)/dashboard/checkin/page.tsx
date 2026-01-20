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
        .select('current_weight')
        .eq('user_id', user.id)
        .single()

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
                    <CheckinForm initialWeight={client?.current_weight || undefined} />
                </div>
            </div>
        </div>
    )
}
