'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ClientAvatar } from "@/components/clients/client-avatar"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

interface ClientDue {
    id: string
    full_name: string
    avatar_url: string | null
    plan_name: string | null
    next_due_date: string
    price_monthly: number
    status: 'pending' | 'overdue'
}

interface UpcomingPaymentsProps {
    clients: ClientDue[]
    title?: string
    description?: string
    emptyMessage?: string
    cardClassName?: string
}

export function UpcomingPayments({
    clients,
    title = "Vencimientos Próximos",
    description = "Pagos a vencer en los próximos 7 días.",
    emptyMessage = "No hay vencimientos próximos.",
    cardClassName = "col-span-3"
}: UpcomingPaymentsProps) {

    const getDateBadge = (dateString: string) => {
        // Add T12:00:00 to avoid timezone issues when parsing YYYY-MM-DD dates
        const date = new Date(dateString + 'T12:00:00')
        const today = new Date()
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const diffTime = d.getTime() - t.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
            return (
                <Badge variant="destructive" className="h-[20px] px-1.5 text-[10px] font-medium bg-red-100 text-red-700 hover:bg-red-100 hover:text-red-700 border-red-200">
                    Hace {Math.abs(diffDays)} días
                </Badge>
            )
        }
        if (diffDays === 0) {
            return (
                <Badge variant="outline" className="h-[20px] px-1.5 text-[10px] font-medium bg-amber-50 text-amber-600 border-amber-200">
                    Vence hoy
                </Badge>
            )
        }
        if (diffDays === 1) {
            return (
                <Badge variant="outline" className="h-[20px] px-1.5 text-[10px] font-medium bg-blue-50 text-blue-600 border-blue-200">
                    Mañana
                </Badge>
            )
        }
        return (
            <span className="text-xs text-muted-foreground font-medium">
                En {diffDays} días
            </span>
        )
    }

    return (
        <Card className={cardClassName}>
            <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base font-medium">{title}</CardTitle>
                {description && (
                    <CardDescription>
                        {description}
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="p-0">
                <div className="flex flex-col divide-y divide-border/50">
                    {clients.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            {emptyMessage}
                        </p>
                    ) : (
                        clients.map((client) => (
                            <div key={client.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <ClientAvatar
                                        name={client.full_name}
                                        avatarUrl={client.avatar_url}
                                        size="sm"
                                        className="border border-border/50"
                                    />
                                    <div className="flex flex-col min-w-0 gap-0.5">
                                        <span className="text-sm font-medium leading-none truncate text-foreground/90">
                                            {client.full_name}
                                        </span>
                                        <span className="text-xs text-muted-foreground truncate">
                                            {client.plan_name}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1">
                                    <span className="text-sm font-bold text-foreground tabular-nums">
                                        {formatCurrency(client.price_monthly)}
                                    </span>
                                    {getDateBadge(client.next_due_date)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
