'use client'

import { StepsCard } from './cards/steps-card'
import { InjuriesCard } from './cards/injuries-card'
import { Card, CardContent } from '@/components/ui/card'
import { FireIcon, CheckmarkCircle02Icon } from 'hugeicons-react'
import { WorkoutHistory } from './workout-history'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface TrainingSummarySidebarProps {
    client: any
}

export function TrainingSummarySidebar({ client }: TrainingSummarySidebarProps) {
    const [showHistory, setShowHistory] = useState(false)
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
                    <button
                        onClick={() => setShowHistory(true)}
                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        Ver todo
                    </button>
                </div>

                <HistorySummaryContent clientId={client.id} />
            </div>

            <Dialog open={showHistory} onOpenChange={setShowHistory}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Historial de Entrenamientos</DialogTitle>
                    </DialogHeader>
                    <WorkoutHistory clientId={client.id} />
                </DialogContent>
            </Dialog>
        </aside>
    )
}

import { getClientWorkoutHistory } from '@/app/(dashboard)/clients/[id]/history-actions'
import { useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function HistorySummaryContent({ clientId }: { clientId: string }) {
    const [summary, setSummary] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            setLoading(true)
            const { sessions } = await getClientWorkoutHistory(clientId)

            // Basic logic:
            // Last session is sessions[0] (if ordered by date desc)
            // Streak: naive count of completed sessions in last 7 days? Or just count them all for now.
            // Let's just use total completed sessions count for Racha label visualization purpose

            const completedSessions = sessions.filter(s => s.status === 'completed')
            const lastSession = completedSessions.length > 0 ? completedSessions[0] : null

            // Calculate a fake adherence for now or 0 if no sessions
            const adherence = sessions.length > 0 ? Math.round((completedSessions.length / sessions.length) * 100) : 0

            setSummary({
                count: completedSessions.length,
                lastSession,
                adherence
            })
            setLoading(false)
        }
        load()
    }, [clientId])

    if (loading) return <div className="h-40 bg-gray-50 animate-pulse rounded-xl" />

    if (!summary || summary.count === 0) {
        return (
            <Card className="bg-white overflow-hidden border-dashed">
                <CardContent className="p-5 text-center py-8">
                    <p className="text-sm text-gray-400 font-medium">Sin historial reciente</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-white overflow-hidden">
            <CardContent className="p-5">
                <div className="flex justify-between items-start mb-6">
                    <div className="space-y-0.5">
                        <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">
                            Tasa de Finalización
                        </p>
                        <p className="text-2xl font-extrabold text-gray-900">{summary.adherence}%</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 text-orange-600">
                            <FireIcon className="h-4 w-4 fill-current" />
                            <p className="text-[10px] font-bold uppercase tracking-wider">Total</p>
                        </div>
                        <p className="text-[15px] font-bold text-gray-900">{summary.count} completados</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {summary.lastSession ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 rounded-full">
                                    <CheckmarkCircle02Icon className="h-4 w-4 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 truncate max-w-[140px]">{summary.lastSession.workout_name}</p>
                                    <p className="text-[10px] text-gray-400">
                                        {summary.lastSession.exercises.length} ejercicios
                                    </p>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-300 font-medium capitalize">
                                {format(new Date(summary.lastSession.started_at), 'EEEE', { locale: es })}
                            </p>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground text-center">No hay última sesión completada.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
