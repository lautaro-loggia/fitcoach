'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mail, Loader2, Check } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
// Import the server action directly
import { sendPaymentReminder } from "@/app/(dashboard)/pagos/actions"

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
    const [sending, setSending] = useState<string | null>(null)
    const [sent, setSent] = useState<Record<string, boolean>>({})

    const handleRemind = async (clientId: string) => {
        try {
            setSending(clientId)
            const result = await sendPaymentReminder(clientId)
            if (result.success) {
                toast.success(result.message)
                setSent(prev => ({ ...prev, [clientId]: true }))
            } else {
                toast.error("Error al enviar recordatorio")
            }
        } catch (error) {
            toast.error("Error de conexión")
        } finally {
            setSending(null)
        }
    }

    const getDateBadge = (dateString: string) => {
        const date = new Date(dateString)
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
                                    <Avatar className="h-8 w-8 border border-border/50">
                                        <AvatarImage src={client.avatar_url || undefined} />
                                        <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                                            {client.full_name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col min-w-0 gap-0.5">
                                        <span className="text-sm font-medium leading-none truncate text-foreground/90">
                                            {client.full_name}
                                        </span>
                                        <span className="text-xs text-muted-foreground truncate">
                                            {client.plan_name}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right flex flex-col items-end gap-1">
                                        <span className="text-sm font-bold text-foreground tabular-nums">
                                            {formatCurrency(client.price_monthly)}
                                        </span>
                                        {getDateBadge(client.next_due_date)}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-full"
                                        onClick={() => handleRemind(client.id)}
                                        disabled={!!sending || sent[client.id]}
                                        title="Enviar recordatorio"
                                    >
                                        {sent[client.id] ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                        ) : sending === client.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <Mail className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
