import { UserPlus, UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getDashboardStats, getUpcomingPayments, getTodayPresentialTrainings, getPendingCheckins } from '@/lib/actions/dashboard'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PresentialTrainings } from '@/components/dashboard/presential-trainings'
import { UrgentActions } from '@/components/dashboard/urgent-actions'
import { redirect } from 'next/navigation'
import { FloatingActionButton } from '@/components/ui/fab'



export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Helper to check client role and redirect
    if (user.user_metadata?.role === 'client') {
        const { data: client } = await supabase
            .from('clients')
            .select('onboarding_status')
            .eq('user_id', user.id)
            .single()

        if (client && client.onboarding_status !== 'completed') {
            redirect('/onboarding')
        } else {
            redirect('/dashboard')
        }
    }

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
    const [stats, upcomingPayments, presentialTrainings, pendingCheckins] = await Promise.all([
        getDashboardStats(),
        getUpcomingPayments(),
        getTodayPresentialTrainings(),
        getPendingCheckins()
    ])

    const statCards = [
        {
            title: "Pagos vencidos",
            value: stats.pendingPaymentsCount.toString(),
            description: "Requieren atención inmediata",
            icon: () => <div className="h-2 w-2 rounded-full bg-red-500" />,
            alert: stats.pendingPaymentsCount > 0,
            variant: "destructive",
            href: "/pagos?filter=overdue",
            customStyles: {
                value: "text-red-500",
                description: "text-red-400"
            }
        },
        {
            title: "Check-ins pendientes",
            value: stats.pendingCheckinsCount.toString(),
            description: "Esperando revisión",
            icon: () => <div className="h-2 w-2 rounded-full bg-amber-500" />,
            alert: stats.pendingCheckinsCount > 0,
            customStyles: {
                value: "text-amber-500",
                description: "text-amber-500"
            }
        },
        {
            title: "Entrenamientos hoy",
            value: presentialTrainings.length.toString(),
            description: "Todo en orden",
            icon: () => <div className="h-2 w-2 rounded-full bg-green-500" />,
            customStyles: {
                value: "text-foreground",
                description: "text-green-500"
            },
            extraIcon: true // Hack to show check icon on right? Or we can just adapt StatsCard
        },
        // We will adapt StatsCard component similarly or just inline the change here if needed, 
        // but for now let's pass this structure and update StatsCard if needed or map carefully.
        // Actually, the previous map loop used specific props. Let's look at StatsCard.
        // StatsCard expects LucideIcon. 
    ]

    // The design shows specific styling per card (Red text for red card, etc).
    // I should probably simplify and just inline the cards implementation here or make StatsCard more flexible.
    // Given the specific design, I'll inline the cards in the JSX for maximum control to match the image exactly.

    const overduePayments = upcomingPayments.filter(p => p.status === 'overdue')

    return (
        <div className="p-4 md:p-8 pt-6 md:pt-8 bg-background min-h-full">
            <FloatingActionButton />
            <div className="space-y-6 md:space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-normal tracking-tight text-foreground">
                            {greeting}, <span className="font-bold">{userName}</span>
                        </h2>
                        <p className="text-muted-foreground mt-1">
                            Este es tu estado hoy
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/clients?new=true">
                            <Button variant="outline" className="gap-2 bg-white">
                                <UserPlus className="h-4 w-4 text-muted-foreground" />
                                Nuevo asesorado
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Status Cards Row */}
                <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                    {/* Active Clients Card */}
                    <Card className="border bg-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                Asesorados activos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-2xl md:text-4xl font-bold text-foreground">{stats.activeClients}</div>
                            <p className="text-[10px] md:text-xs font-medium text-muted-foreground mt-1">
                                Total clientes activos
                            </p>
                        </CardContent>
                    </Card>

                    {/* Pagos Cards */}
                    <Card className="border bg-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-red-500" />
                                Pagos vencidos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-2xl md:text-4xl font-bold text-foreground">{stats.pendingPaymentsCount}</div>
                            <p className="text-[10px] md:text-xs font-medium text-red-500 mt-1">
                                Requieren atención
                            </p>
                        </CardContent>
                    </Card>

                    {/* Check-ins Card */}
                    <Card className="border bg-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-amber-500" />
                                Check-ins pendientes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-2xl md:text-4xl font-bold text-foreground">{stats.pendingCheckinsCount}</div>
                            <p className="text-[10px] md:text-xs font-medium text-amber-500 mt-1">
                                Esperando revisión
                            </p>
                        </CardContent>
                    </Card>

                    {/* Trainings Card */}
                    <Card className="border bg-white relative overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                Entrenamientos hoy
                            </CardTitle>
                            <div className="h-6 w-6 rounded-full border border-green-200 flex items-center justify-center bg-green-50">
                                <UserCheck className="h-3 w-3 text-green-600" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-2xl md:text-4xl font-bold text-foreground">{presentialTrainings.length}</div>
                            <p className="text-[10px] md:text-xs font-medium text-green-500 mt-1">
                                Todo en orden
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid lg:grid-cols-12 gap-6">
                    {/* Left Column: Urgent Actions */}
                    <div className="lg:col-span-8">
                        <UrgentActions
                            overduePayments={overduePayments}
                            pendingCheckins={pendingCheckins}
                        />
                    </div>

                    {/* Right Column: Presential Trainings */}
                    <div className="lg:col-span-4">
                        <PresentialTrainings trainings={presentialTrainings} />
                    </div>
                </div>
            </div>
        </div>
    )
}
