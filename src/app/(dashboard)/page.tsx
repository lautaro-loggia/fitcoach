
import { StatsCard } from '@/components/dashboard/stats-cards'
import { Users, Utensils, Dumbbell, CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { SessionStartButton } from '@/components/workout-session/session-start-button'

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

    // 1. Active Clients
    const { count: activeClientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', user.id)
        .eq('status', 'active')

    // 2. Assigned Workouts
    const { count: activeWorkoutsCount } = await supabase
        .from('assigned_workouts')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', user.id)

    // 3. Assigned Diets
    const { count: activeDietsCount } = await supabase
        .from('assigned_diets')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', user.id)

    // 4. Pending Payments
    const { count: pendingPaymentsCount } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', user.id)
        .eq('status', 'pending')

    const stats = [
        {
            title: "Asesorados activos",
            value: activeClientsCount?.toString() || "0",
            description: "En seguimiento",
            icon: Users,
        },
        {
            title: "Rutinas asignadas",
            value: activeWorkoutsCount?.toString() || "0",
            description: "Planes activos",
            icon: Dumbbell,
        },
        {
            title: "Dietas asignadas",
            value: activeDietsCount?.toString() || "0",
            description: "Planes nutricionales",
            icon: Utensils,
        },
        {
            title: "Pagos pendientes",
            value: pendingPaymentsCount?.toString() || "0",
            description: "Por cobrar",
            icon: CreditCard,
        },
    ]

    // Fetch Recent Activity (Latest Checkins)
    const { data: recentCheckins } = await supabase
        .from('checkins')
        .select('id, date, weight, clients(full_name)')
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

    return (
        <div className="space-y-6 md:space-y-8">
            <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                    {greeting}, <span className="text-primary">{userName}</span>
                </h2>
                <p className="text-muted-foreground text-sm md:text-base">
                    Aquí tenés un resumen de tu actividad hoy.
                </p>
            </div>

            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, index) => (
                    <StatsCard key={index} {...stat} />
                ))}
            </div>

            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-7">
                {/* Activity Feed */}
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Actividad Reciente</CardTitle>
                        <CardDescription>
                            Últimos check-ins recibidos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentCheckins && recentCheckins.length > 0 ? (
                                recentCheckins.map((checkin: any) => (
                                    <div key={checkin.id} className="flex items-center">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {checkin.clients?.full_name || 'Cliente'} actualizó su estado
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(checkin.date), { addSuffix: true, locale: es })}
                                            </p>
                                        </div>
                                        {checkin.weight && (
                                            <div className="ml-auto font-medium text-sm">
                                                {checkin.weight} kg
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">No hay actividad reciente.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Alerts / Tasks */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Accesos Rápidos</CardTitle>
                        <CardDescription>
                            Acciones frecuentes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Session Start - Mobile Only */}
                            <SessionStartButton />

                            {/* Placeholder for shortcuts */}
                            <div className="p-4 border rounded-md bg-muted/20 text-sm text-muted-foreground text-center hidden md:block">
                                Próximamente: Alertas de vencimiento de planes.
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
