
import { StatsCard } from '@/components/dashboard/stats-cards'
import { Users, AlertCircle, UserPlus, Activity, ArrowRight, UserCheck, Dumbbell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getDashboardStats, getUpcomingPayments } from '@/lib/actions/dashboard'
import { UpcomingPayments } from '@/components/dashboard/upcoming-payments'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { ClientSelectorDialog } from '@/components/dashboard/client-selector-dialog'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Get user profile for name
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

    // Function to get greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour >= 6 && hour < 12) return 'Buenos días'
        if (hour >= 12 && hour < 20) return 'Buenas tardes'
        return 'Buenas noches'
    }

    const greeting = getGreeting()
    const userName = profile?.full_name?.split(' ')[0] || 'Entrenador'

    // Fetch all dashboard data
    const [stats, upcomingPayments] = await Promise.all([
        getDashboardStats(),
        getUpcomingPayments()
    ])

    const statCards = [
        {
            title: "Asesorados Activos",
            value: stats.activeClients.toString(),
            description: "Total clientes activos",
            icon: Users,
        },
        {
            title: "Pagos Vencidos",
            value: stats.pendingPaymentsCount.toString(),
            description: "Requieren atención inmediata",
            icon: AlertCircle,
            alert: stats.pendingPaymentsCount > 0,
            variant: "destructive"
        },
        {
            title: "Check-ins Pendientes",
            value: stats.pendingCheckinsCount.toString(),
            description: "Deben reportarse hoy",
            icon: Activity,
            alert: stats.pendingCheckinsCount > 0,
        },
        // New Clients (Already implemented in backend now)
        {
            title: "Nuevos este mes",
            value: stats.newClientsCount.toString(),
            description: "Clientes registrados",
            icon: UserPlus,
        },
    ]

    const overduePayments = upcomingPayments.filter(p => p.status === 'overdue')
    const futurePayments = upcomingPayments.filter(p => p.status === 'pending')

    return (
        <div className="space-y-6 md:space-y-8">
            <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                    {greeting}, <span className="text-primary">{userName}</span>
                </h2>
                <p className="text-muted-foreground text-sm md:text-base">
                    Aquí tienes el resumen de tu actividad con los asesorados.
                </p>
            </div>

            {/* Quick Actions Container */}
            <Card>
                <CardHeader className="px-4 py-3 border-b border-border">
                    <CardTitle className="text-base font-medium">Accesos Rápidos</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-3">
                        {/* Nuevo Asesorado */}
                        <Link href="/clients?new=true" className="flex-1 w-full">
                            <Button variant="outline" className="w-full h-auto py-3 justify-start gap-3 border-dashed hover:border-solid hover:bg-muted/50 group">
                                <div className="p-2 rounded-full bg-blue-50 text-blue-500 group-hover:bg-blue-100 transition-colors">
                                    <UserPlus className="h-4 w-4" />
                                </div>
                                <div className="text-left">
                                    <span className="font-medium block">Nuevo Asesorado</span>
                                    <span className="text-xs text-muted-foreground hidden sm:block">Registrar cliente</span>
                                </div>
                            </Button>
                        </Link>

                        {/* Crear Rutina */}
                        <Link href="/workouts?new=true" className="flex-1 w-full">
                            <Button variant="outline" className="w-full h-auto py-3 justify-start gap-3 border-dashed hover:border-solid hover:bg-muted/50 group">
                                <div className="p-2 rounded-full bg-purple-50 text-purple-500 group-hover:bg-purple-100 transition-colors">
                                    <Dumbbell className="h-4 w-4" />
                                </div>
                                <div className="text-left">
                                    <span className="font-medium block">Crear Rutina</span>
                                    <span className="text-xs text-muted-foreground hidden sm:block">Nueva planificación</span>
                                </div>
                            </Button>
                        </Link>

                        {/* Registrar Check-in */}
                        <div className="flex-1 w-full">
                            <ClientSelectorDialog>
                                <Button variant="outline" className="w-full h-auto py-3 justify-start gap-3 border-dashed hover:border-solid hover:bg-muted/50 group">
                                    <div className="p-2 rounded-full bg-green-50 text-green-500 group-hover:bg-green-100 transition-colors">
                                        <UserCheck className="h-4 w-4" />
                                    </div>
                                    <div className="text-left">
                                        <span className="font-medium block">Registrar Check-in</span>
                                        <span className="text-xs text-muted-foreground hidden sm:block">Actualizar progreso</span>
                                    </div>
                                </Button>
                            </ClientSelectorDialog>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat, index) => (
                    <StatsCard key={index} {...stat} />
                ))}
            </div>

            <div className="space-y-6">
                {/* Overdue Payments */}
                {overduePayments.length > 0 && (
                    <UpcomingPayments
                        clients={overduePayments}
                        title="Pagos Vencidos"
                        description="Requieren atención inmediata"
                        cardClassName="border-red-200"
                    />
                )}

                {/* Upcoming Payments */}
                <UpcomingPayments
                    clients={futurePayments}
                    title="Vencimientos Próximos"
                />
            </div>
        </div>
    )
}
