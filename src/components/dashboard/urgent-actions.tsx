'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClientAvatar } from "@/components/clients/client-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { ClientDue, CheckinDue } from "@/lib/actions/dashboard"
import { Wallet, Mail, AlertCircle } from "lucide-react"
import Link from "next/link"

interface UrgentActionsProps {
    overduePayments: ClientDue[]
    pendingCheckins: CheckinDue[]
}

export function UrgentActions({ overduePayments, pendingCheckins }: UrgentActionsProps) {
    const totalCount = overduePayments.length + pendingCheckins.length

    if (totalCount === 0) return null

    const handleSendReminder = (clientName: string, type: 'payment' | 'checkin') => {
        const message = type === 'payment'
            ? `Hola ${clientName.split(' ')[0]}, te recuerdo que tu pago ha vencido. Por favor regulariza tu situación.`
            : `Hola ${clientName.split(' ')[0]}, te recuerdo que debes realizar tu check-in hoy.`

        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
    }

    const getDaysOverdue = (dateString: string) => {
        const date = new Date(dateString)
        const today = new Date()
        date.setHours(0, 0, 0, 0)
        today.setHours(0, 0, 0, 0)
        const diffTime = today.getTime() - date.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return "hoy"
        return `hace ${diffDays} días`
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Acciones urgentes</h3>
                <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100 border-0">
                    {totalCount} pendientes
                </Badge>
            </div>

            <Card className="border-none shadow-sm bg-white">
                <CardContent className="p-0 divide-y divide-border/50">
                    {/* Overdue Payments */}
                    {overduePayments.map((client) => (
                        <div key={`payment-${client.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="relative">
                                    <ClientAvatar
                                        name={client.full_name}
                                        avatarUrl={client.avatar_url}
                                        size="md"
                                        className="h-10 w-10 sm:h-12 sm:w-12 border border-border/50"
                                    />
                                    <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5 border-2 border-white">
                                        <AlertCircle className="h-3 w-3 text-white" />
                                    </div>
                                </div>
                                <div className="flex flex-col min-w-0 gap-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold leading-none text-foreground">
                                            {client.full_name}
                                        </span>
                                        <Badge variant="destructive" className="h-[20px] px-1.5 text-[10px] font-medium bg-red-100 text-red-700 hover:bg-red-100 border-0 shadow-none">
                                            Pago vencido
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                                        <span>Vencido {getDaysOverdue(client.next_due_date)}</span>
                                        <span className="text-border">•</span>
                                        <span className="font-medium text-foreground">{formatCurrency(client.price_monthly)}</span>
                                    </div>
                                </div>
                            </div>

                            <Link href={`/clients/${client.id}?tab=billing`}>
                                <Button
                                    className="w-full sm:w-auto bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium h-9 text-xs sm:text-sm shadow-sm"
                                >
                                    <Wallet className="mr-2 h-3.5 w-3.5" />
                                    Registrar pago
                                </Button>
                            </Link>
                        </div>
                    ))}

                    {/* Pending Check-ins */}
                    {pendingCheckins.map((client) => (
                        <div key={`checkin-${client.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="relative">
                                    <ClientAvatar
                                        name={client.full_name}
                                        avatarUrl={client.avatar_url}
                                        size="md"
                                        className="h-10 w-10 sm:h-12 sm:w-12 border border-border/50"
                                    />
                                    <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-0.5 border-2 border-white">
                                        <AlertCircle className="h-3 w-3 text-white" />
                                    </div>
                                </div>
                                <div className="flex flex-col min-w-0 gap-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold leading-none text-foreground">
                                            {client.full_name}
                                        </span>
                                        <Badge variant="secondary" className="h-[20px] px-1.5 text-[10px] font-medium bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 shadow-none">
                                            Check-in atrasado
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Atrasado {getDaysOverdue(client.next_checkin_date)}
                                    </div>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full sm:w-auto h-9 text-xs sm:text-sm font-medium"
                                onClick={() => handleSendReminder(client.full_name, 'checkin')}
                            >
                                <Mail className="mr-2 h-3.5 w-3.5" />
                                Enviar recordatorio
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}
