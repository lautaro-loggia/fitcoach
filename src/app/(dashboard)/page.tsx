
import { StatsCard } from '@/components/dashboard/stats-cards'
import { Activity, Users, FileText, Utensils, AlertCircle, Dumbbell, CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function DashboardPage() {
    // Placeholder data - In real app, fetch from Supabase
    const stats = [
        {
            title: "Asesorados activos",
            value: "12",
            description: "+2 este mes",
            icon: Users,
        },
        {
            title: "Rutinas activas",
            value: "24",
            description: "Asignadas a 10 clientes",
            icon: Dumbbell,
        },
        {
            title: "Dietas activas",
            value: "8",
            description: "Asignadas a 8 clientes",
            icon: Utensils,
        },
        {
            title: "Pagos pendientes",
            value: "3",
            description: "Vencen pronto",
            icon: AlertCircle,
            alert: true,
        },
    ]

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Hola, Entrenador</h2>
                <p className="text-muted-foreground">
                    Aquí tenés un resumen de tu actividad hoy.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, index) => (
                    <StatsCard key={index} {...stat} />
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Activity Feed */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Actividad Reciente</CardTitle>
                        <CardDescription>
                            Últimos movimientos de tus asesorados.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Stub items */}
                            <div className="flex items-center">
                                <div className="ml-4 space-y-1">
                                    <p className="text-sm font-medium leading-none">Juan Perez actualizó su peso</p>
                                    <p className="text-sm text-muted-foreground">Hace 2 horas</p>
                                </div>
                                <div className="ml-auto font-medium text-green-600">-0.5 kg</div>
                            </div>
                            <div className="flex items-center">
                                <div className="ml-4 space-y-1">
                                    <p className="text-sm font-medium leading-none">Maria Garcia realizó check-in</p>
                                    <p className="text-sm text-muted-foreground">Hace 5 horas</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <div className="ml-4 space-y-1">
                                    <p className="text-sm font-medium leading-none">Pago recibido de Carlos Lopez</p>
                                    <p className="text-sm text-muted-foreground">Ayer</p>
                                </div>
                                <div className="ml-auto font-medium">+$50</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Alerts / Tasks */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Alertas</CardTitle>
                        <CardDescription>
                            Acciones requeridas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-3 border rounded-md bg-destructive/5 border-destructive/20">
                                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-destructive">Check-in vencido</p>
                                    <p className="text-xs text-muted-foreground">Pedro Rodriguez debe su check-in hace 2 días.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-3 border rounded-md">
                                <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Pago pendiente</p>
                                    <p className="text-xs text-muted-foreground">Laura Martinez vence mañana.</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
