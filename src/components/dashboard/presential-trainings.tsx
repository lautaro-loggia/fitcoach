"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { PresentialTraining } from "@/lib/actions/dashboard"
import { MapPin, MessageCircle } from "lucide-react"

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

        // Remove non-numeric characters from phone and ensure it works with specialized link
        // Ideally user should input country code, but let's clear special chars at least.
        const cleanPhone = training.clientPhone.replace(/\D/g, '')

        window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank')
    }

    return (
        <Card className="bg-white">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Entrenamientos Presenciales Hoy
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {trainings.map((training) => (
                        <div key={training.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-lg border border-blue-100 shadow-sm gap-3">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                    <AvatarImage src={training.clientAvatar || undefined} />
                                    <AvatarFallback className="bg-blue-100 text-blue-700">
                                        {training.clientName.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-sm text-gray-900">{training.clientName}</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-muted-foreground">{training.workoutName}</p>
                                        {training.startTime && (
                                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                                {training.startTime.substring(0, 5)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="hidden sm:block text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                    Presencial
                                </div>
                                <Button
                                    size="sm"
                                    className="h-8 w-8 p-0 sm:w-auto sm:px-3 sm:py-1 bg-green-500 hover:bg-green-600 text-white rounded-full sm:rounded-md"
                                    onClick={() => handleWhatsAppClick(training)}
                                    title="Enviar recordatorio por WhatsApp"
                                >
                                    <MessageCircle className="h-4 w-4 sm:mr-1.5" />
                                    <span className="hidden sm:inline">Enviar recordatorio</span>
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
