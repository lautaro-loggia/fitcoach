'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Activity } from 'lucide-react'

// Severity colors helpers
const getSeverityColor = (severity: string) => {
    switch (severity) {
        case 'low': return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
        case 'moderate': return 'bg-orange-100 text-orange-700 hover:bg-orange-200'
        case 'severe': return 'bg-red-100 text-red-700 hover:bg-red-200'
        default: return 'bg-gray-100 text-gray-700'
    }
}

const getSeverityLabel = (severity: string) => {
    switch (severity) {
        case 'low': return 'Leve'
        case 'moderate': return 'Moderada'
        case 'severe': return 'Severa'
        default: return severity
    }
}

export function InjuriesCard({ client }: { client: any }) {
    const injuries = client.injuries || []
    const hasInjuries = Array.isArray(injuries) && injuries.length > 0

    if (!hasInjuries) {
        return (
            <Card className="flex flex-col h-full opacity-60">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-muted-foreground flex items-center gap-2">
                        <Activity className="h-4 w-4" /> Lesiones
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Sin lesiones reportadas.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="flex flex-col h-full border-l-4 border-l-amber-400">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" /> Lesiones / Molestias
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">{injuries.length}</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
                {injuries.map((injury: any, idx: number) => (
                    <div key={idx} className="space-y-1 border-b last:border-0 pb-3 last:pb-0">
                        <div className="flex justify-between items-start">
                            <span className="font-semibold text-sm">{injury.zone}</span>
                            <Badge className={`text-[10px] px-1.5 py-0 h-5 ${getSeverityColor(injury.severity)} border-none shadow-none`}>
                                {getSeverityLabel(injury.severity)}
                            </Badge>
                        </div>
                        {injury.description && (
                            <p className="text-xs text-gray-600 leading-snug">{injury.description}</p>
                        )}
                        {injury.diagnosed && (
                            <p className="text-[10px] text-blue-600 font-medium">Diagnosticado por médico</p>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
