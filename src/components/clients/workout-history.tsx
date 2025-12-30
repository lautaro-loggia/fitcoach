'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronUp, Dumbbell, Calendar, Clock, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getClientWorkoutHistory, type SessionHistoryItem } from '@/app/(dashboard)/clients/[id]/history-actions'
import { cn } from '@/lib/utils'

interface WorkoutHistoryProps {
    clientId: string
}

export function WorkoutHistory({ clientId }: WorkoutHistoryProps) {
    const [sessions, setSessions] = useState<SessionHistoryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedSession, setExpandedSession] = useState<string | null>(null)

    useEffect(() => {
        loadHistory()
    }, [clientId])

    const loadHistory = async () => {
        setLoading(true)
        const { sessions: data } = await getClientWorkoutHistory(clientId)
        setSessions(data)
        setLoading(false)
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Historial de Entrenamientos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (sessions.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Historial de Entrenamientos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <Dumbbell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No hay sesiones registradas aún.</p>
                        <p className="text-sm">Las sesiones aparecerán aquí cuando se registren entrenamientos.</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Historial de Entrenamientos
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {sessions.map((session) => (
                    <Collapsible
                        key={session.id}
                        open={expandedSession === session.id}
                        onOpenChange={(open) => setExpandedSession(open ? session.id : null)}
                    >
                        <CollapsibleTrigger asChild>
                            <div className="border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "h-10 w-10 rounded-full flex items-center justify-center",
                                            session.status === 'completed' ? "bg-green-500/20" : "bg-orange-500/20"
                                        )}>
                                            <Dumbbell className={cn(
                                                "h-5 w-5",
                                                session.status === 'completed' ? "text-green-600" : "text-orange-600"
                                            )} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{session.workout_name}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(session.started_at), "d 'de' MMMM, yyyy", { locale: es })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={session.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                                            {session.status === 'completed' ? 'Completada' :
                                                session.status === 'in_progress' ? 'En progreso' : 'Abandonada'}
                                        </Badge>
                                        {expandedSession === session.id ?
                                            <ChevronUp className="h-4 w-4 text-muted-foreground" /> :
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        }
                                    </div>
                                </div>
                            </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                            <div className="border-x border-b rounded-b-lg -mt-1 pt-1 pb-3 px-3 space-y-3">
                                {session.exercises.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-2">No hay ejercicios registrados</p>
                                ) : (
                                    session.exercises.map((exercise) => (
                                        <div key={exercise.id} className="border rounded-lg p-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium text-sm">{exercise.exercise_name}</h4>
                                                <span className="text-xs text-muted-foreground">
                                                    {exercise.sets.filter(s => s.is_completed).length} series
                                                </span>
                                            </div>

                                            {/* Notes */}
                                            {exercise.notes && (
                                                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded p-2">
                                                    <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                                    <span>{exercise.notes}</span>
                                                </div>
                                            )}

                                            {/* Sets table */}
                                            {exercise.sets.length > 0 && (
                                                <div className="border rounded overflow-hidden">
                                                    <table className="w-full text-xs">
                                                        <thead className="bg-muted/50">
                                                            <tr>
                                                                <th className="text-left p-2 font-medium">Serie</th>
                                                                <th className="text-center p-2 font-medium">Peso</th>
                                                                <th className="text-center p-2 font-medium">Reps</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {exercise.sets.map((set) => (
                                                                <tr key={set.set_number} className="border-t">
                                                                    <td className="p-2">{set.set_number}</td>
                                                                    <td className="text-center p-2 font-medium">{set.weight}kg</td>
                                                                    <td className="text-center p-2">{set.reps}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                ))}
            </CardContent>
        </Card>
    )
}
