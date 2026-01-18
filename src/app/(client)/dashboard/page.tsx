import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, Calendar, Dumbbell, Utensils } from 'lucide-react'
import Link from 'next/link'

export default async function ClientDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/auth/login')

    const { data: client, error } = await supabase
        .from('clients')
        .select('*, trainer:profiles(full_name)')
        .eq('user_id', user.id)
        .single()

    if (error || !client) {
        return <div>Error loading dashboard</div>
    }

    // Redirect to onboarding if not completed/invited
    if (client.onboarding_status !== 'completed') {
        // Optional: Check if they are mid-onboarding or just invited?
        // If they are allowed to 'finish later', we show a warning instead of strict redirect?
        // Plan said: "Dashboard will show 'Complete Profile' warning if exiting early".
        // But `OnboardingPage` handles the completion logic.
        // If status is 'invited' or 'in_progress', we might want to nudge them.
    }

    return (
        <div className="p-4 space-y-6 pb-24">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Hola, {client.full_name.split(' ')[0]}</h1>
                    <p className="text-sm text-gray-500">Vamos por esos objetivos 💪</p>
                </div>
                {/* Avatar or Settings Icon could go here */}
            </div>

            {/* Pending Banner */}
            {client.planning_status === 'pending' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <div className="space-y-1">
                        <p className="font-medium text-sm">Esperando planificación</p>
                        <p className="text-xs">Tu coach está armando tu rutina. Te avisaremos cuando esté lista.</p>
                        <Button size="sm" variant="outline" className="h-7 text-xs bg-white border-amber-200 text-amber-900 mt-2">
                            Ya hablé con mi coach
                        </Button>
                    </div>
                </div>
            )}

            {/* Incomplete Onboarding Banner */}
            {client.onboarding_status !== 'completed' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex justify-between items-center text-blue-800">
                    <div>
                        <p className="font-medium text-sm">Perfil incompleto</p>
                        <p className="text-xs">Terminá tu configuración inicial.</p>
                    </div>
                    <Link href="/onboarding">
                        <Button size="sm" className="h-8 text-xs">Continuar</Button>
                    </Link>
                </div>
            )}

            {/* Main Actions Grid */}
            <div className="grid grid-cols-2 gap-4">
                <Link href="/dashboard/plan" className="block">
                    <Card className="p-4 flex flex-col items-center justify-center gap-2 h-32 hover:bg-gray-50 cursor-pointer transition-colors">
                        <div className="p-3 bg-neutral-100 rounded-full">
                            <Dumbbell className="h-6 w-6 text-neutral-700" />
                        </div>
                        <span className="font-medium text-sm">Tu Plan</span>
                    </Card>
                </Link>

                <Link href="/dashboard/diet" className="block">
                    <Card className="p-4 flex flex-col items-center justify-center gap-2 h-32 hover:bg-gray-50 cursor-pointer transition-colors">
                        <div className="p-3 bg-neutral-100 rounded-full">
                            <Utensils className="h-6 w-6 text-neutral-700" />
                        </div>
                        <span className="font-medium text-sm">Alimentación</span>
                    </Card>
                </Link>
            </div>

            {/* Check-in Action (Primary) */}
            <Card className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-200 cursor-pointer">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg">Cargar Check-in</h3>
                        <p className="text-blue-100 text-sm">Registrá tu progreso semanal</p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-200 opacity-80" />
                </div>
            </Card>

        </div>
    )
}
