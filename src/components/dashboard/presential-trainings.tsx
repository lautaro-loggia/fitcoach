"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PresentialTraining } from "@/lib/actions/dashboard"
import { Message01Icon } from "hugeicons-react"
import { Badge } from "@/components/ui/badge"

interface PresentialTrainingsProps {
    trainings: PresentialTraining[]
}

export function PresentialTrainings({ trainings }: PresentialTrainingsProps) {
    if (trainings.length === 0) return null

    const handleWhatsAppClick = (training: PresentialTraining) => {
        if (!training.clientPhone) {
            alert('El cliente no tiene un número de teléfono registrado.')
            return
        }

        const firstName = training.clientName.split(' ')[0]
        const simpleTime = training.startTime ? training.startTime.substring(0, 5) : 'hoy'

        let message = training.messageTemplate
        message = message.replace('{nombre}', firstName)

        // Smart replacement for time to handle "a las" context
        if (message.includes('a las {hora}')) {
            if (training.startTime) {
                // User already typed "a las", just insert time
                message = message.replace('{hora}', simpleTime)
            } else {
                // No time available, avoid "a las hoy"
                message = message.replace('a las {hora}', 'hoy')
            }
        } else {
            // User just has {hora}, we need to add prefix if it's a time
            const textToInsert = training.startTime ? `a las ${simpleTime}` : 'hoy'
            message = message.replace('{hora}', textToInsert)
        }

        const encodedMessage = encodeURIComponent(message)
        const cleanPhone = training.clientPhone.replace(/\D/g, '')

        window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank')
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Entrenamientos presenciales hoy</h3>

            <div className="space-y-3">
                {trainings.map((training) => (
                    <Card key={training.id} className="border-none shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-0 flex items-stretch">
                            {/* Time Box */}
                            <div className="w-16 bg-muted/30 flex flex-col items-center justify-center border-r border-border/50 py-3 px-1">
                                <span className="text-sm font-bold text-foreground">
                                    {training.startTime ? training.startTime.substring(0, 5) : '--:--'}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 p-3 flex items-center justify-between min-w-0 gap-3">
                                <div className="flex flex-col min-w-0 gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm text-foreground truncate">
                                            {training.clientName}
                                        </span>
                                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium bg-green-50 text-green-700 hover:bg-green-50 border-green-100 shadow-none">
                                            <div className="mr-1 h-1 w-1 rounded-full bg-green-500" />
                                            Presencial
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {training.workoutName}
                                    </p>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full shrink-0"
                                    onClick={() => handleWhatsAppClick(training)}
                                    title="Enviar recordatorio"
                                >
                                    <Message01Icon className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

