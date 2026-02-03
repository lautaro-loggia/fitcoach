'use client'

import { Card, CardContent } from '@/components/ui/card'
import { AlertCircleIcon, Task01Icon } from 'hugeicons-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function InjuriesCard({ client }: { client: any }) {
    const injuries = client.injuries || []
    const hasInjuries = Array.isArray(injuries) && injuries.length > 0

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-50 rounded-xl">
                        <Task01Icon className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 leading-tight">Lesiones</h3>
                        <p className="text-xs text-orange-600 font-medium">
                            {hasInjuries ? `${injuries.length} activas` : 'Sin lesiones activas'}
                        </p>
                    </div>
                </div>
                {hasInjuries && (
                    <button className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                        Historial
                    </button>
                )}
            </div>

            <div className="space-y-3">
                {hasInjuries ? (
                    injuries.map((injury: any, idx: number) => (
                        <Card key={idx} className="border-l-4 border-l-orange-500 bg-white overflow-hidden py-0">
                            <CardContent className="p-5">
                                <div className="flex gap-4">
                                    <AlertCircleIcon className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                                    <div className="space-y-1.5">
                                        <h4 className="font-bold text-gray-900 text-sm leading-tight">
                                            {injury.zone}
                                        </h4>
                                        <p className="text-xs text-gray-500 leading-relaxed">
                                            {injury.description || 'Sin descripción adicional.'}
                                        </p>
                                        <p className="text-[10px] text-gray-300 font-medium uppercase tracking-wider pt-1">
                                            Reportado: {injury.created_at ? format(parseISO(injury.created_at), "d MMM yyyy", { locale: es }) : 'Recientemente'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Card className="bg-white overflow-hidden opacity-50 py-0">
                        <CardContent className="p-6 text-center">
                            <p className="text-xs text-gray-400">Todo en orden por aquí.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
