'use client'

import { StepsCard } from './cards/steps-card'
import { InjuriesCard } from './cards/injuries-card'
import { Card, CardContent } from '@/components/ui/card'
import { FireIcon, CheckmarkCircle02Icon } from 'hugeicons-react'
import { WorkoutHistory } from './workout-history'

interface TrainingSummarySidebarProps {
    client: any
}

export function TrainingSummarySidebar({ client }: TrainingSummarySidebarProps) {
    return (
        <aside className="space-y-6">
            {/* Steps Section */}
            <StepsCard client={client} />

            {/* Injuries Section */}
            <InjuriesCard client={client} />

            {/* History Summary Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 text-lg">Historial</h3>
                    <button className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                        Ver todo
                    </button>
                </div>

                <Card className="bg-white overflow-hidden">
                    <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-6">
                            <div className="space-y-0.5">
                                <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">
                                    Adherencia Semanal
                                </p>
                                <p className="text-2xl font-extrabold text-gray-900">92%</p>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1 text-orange-600">
                                    <FireIcon className="h-4 w-4 fill-current" />
                                    <p className="text-[10px] font-bold uppercase tracking-wider">Racha</p>
                                </div>
                                <p className="text-[15px] font-bold text-gray-900">4 entrenamientos</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Simple mock of last sessions */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-50 rounded-full">
                                        <CheckmarkCircle02Icon className="h-4 w-4 text-emerald-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Jueves – Hombros & Abs</p>
                                        <p className="text-[10px] text-gray-400">5 ejercicios · 42 min</p>
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-300 font-medium">Ayer</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </aside>
    )
}
