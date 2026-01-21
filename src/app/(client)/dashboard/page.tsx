import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, Calendar, Dumbbell, Utensils, LogOut, Settings as SettingsIcon } from 'lucide-react'
import Link from 'next/link'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UpdatePasswordDialog } from '@/components/clients/update-password-dialog'
import { ClientLogoutButton } from '@/components/clients/client-logout-button'

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
        // logic...
    }

    // Check for assigned plans...
    const { count: workoutCount } = await supabase
        .from('assigned_workouts')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)

    const { count: dietCount } = await supabase
        .from('assigned_diets')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)

    const hasWorkout = workoutCount ? workoutCount > 0 : false
    const hasDiet = dietCount ? dietCount > 0 : false

    return (
        <div className="p-4 space-y-6 pb-24">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Hola, {client.full_name.split(' ')[0]}</h1>
                    <p className="text-sm text-gray-500">Vamos por esos objetivos 💪</p>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <SettingsIcon className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <UpdatePasswordDialog asMenuItem />
                        <DropdownMenuSeparator />
                        <ClientLogoutButton />
                    </DropdownMenuContent>
                </DropdownMenu>
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
                <Link href={hasWorkout ? "/dashboard/plan" : "#"} className={hasWorkout ? "block" : "block pointer-events-none"}>
                    <Card className={`p-4 flex flex-col items-center justify-center gap-2 h-32 transition-colors ${hasWorkout ? "hover:bg-gray-50 cursor-pointer" : "opacity-50 cursor-not-allowed bg-gray-50"}`}>
                        <div className={`p-3 rounded-full ${hasWorkout ? "bg-neutral-100" : "bg-neutral-200"}`}>
                            <Dumbbell className={`h-6 w-6 ${hasWorkout ? "text-neutral-700" : "text-neutral-400"}`} />
                        </div>
                        <span className="font-medium text-sm">Tu Plan</span>
                    </Card>
                </Link>

                <Link href={hasDiet ? "/dashboard/diet" : "#"} className={hasDiet ? "block" : "block pointer-events-none"}>
                    <Card className={`p-4 flex flex-col items-center justify-center gap-2 h-32 transition-colors ${hasDiet ? "hover:bg-gray-50 cursor-pointer" : "opacity-50 cursor-not-allowed bg-gray-50"}`}>
                        <div className={`p-3 rounded-full ${hasDiet ? "bg-neutral-100" : "bg-neutral-200"}`}>
                            <Utensils className={`h-6 w-6 ${hasDiet ? "text-neutral-700" : "text-neutral-400"}`} />
                        </div>
                        <span className="font-medium text-sm">Alimentación</span>
                    </Card>
                </Link>
            </div>

            {/* Check-in Action (Primary) */}
            <Link href="/dashboard/checkin" className="block">
                <Card className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-200 cursor-pointer hover:shadow-xl transition-shadow">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg">Cargar Check-in</h3>
                            <p className="text-blue-100 text-sm">Registrá tu progreso semanal</p>
                        </div>
                        <Calendar className="h-8 w-8 text-blue-200 opacity-80" />
                    </div>
                </Card>
            </Link>

        </div>
    )
}
