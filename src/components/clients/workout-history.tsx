'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronUp, Dumbbell, Calendar, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getClientWorkoutHistory, type SessionHistoryItem } from '@/app/(dashboard)/clients/[id]/history-actions'

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
            <Card className="border-none shadow-none">
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-500">Historial de Entrenamientos</CardTitle>
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
            <Card className="border-none shadow-none">
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-500">Historial de Entrenamientos</CardTitle>
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
        <Card className="border-none shadow-none bg-transparent">

            <CardContent className="space-y-4 px-0">
                {sessions.map((session) => (
                    <Collapsible
                        key={session.id}
                        open={expandedSession === session.id}
                        onOpenChange={(open) => setExpandedSession(open ? session.id : null)}
                        className="bg-white rounded-2xl overflow-hidden shadow-sm transition-all duration-200 border border-gray-100"
                    >
                        <CollapsibleTrigger asChild>
                            <div className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors bg-white w-full">
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-[#4139CF]/10 flex items-center justify-center flex-shrink-0">
                                            <Dumbbell className="h-5 w-5 text-[#4139CF]" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-gray-900">{session.workout_name}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                <Calendar className="h-3 w-3" />
                                                <span className="capitalize">
                                                    {format(new Date(session.started_at), "d 'de' MMMM, yyyy", { locale: es })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {session.status === 'completed' ? (
                                            <Badge className="bg-black text-white hover:bg-black/90 font-medium border-none px-3 h-6">
                                                Completada
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-xs h-6">
                                                {session.status === 'in_progress' ? 'En progreso' : 'Abandonada'}
                                            </Badge>
                                        )}
                                        {expandedSession === session.id ?
                                            <ChevronUp className="h-4 w-4 text-gray-400" /> :
                                            <ChevronDown className="h-4 w-4 text-gray-400" />
                                        }
                                    </div>
                                </div>
                            </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                            <div className="px-6 pb-8 pt-4 animate-in slide-in-from-top-2 duration-200 bg-white">


                                {/* Metrics Row */}
                                {session.feedback && Object.keys(session.feedback).length > 0 ? (
                                    <div className="flex items-center w-full mb-8">
                                        <div className="flex-1 pr-4 border-r border-gray-100">
                                            <span className="text-[10px] uppercase text-gray-400 font-medium block mb-1 tracking-wider">Esfuerzo</span>
                                            <span className="text-[14px] font-medium text-black">
                                                {session.feedback.generalSensation}
                                            </span>
                                        </div>
                                        <div className="flex-1 px-4 border-r border-gray-100">
                                            <span className="text-[10px] uppercase text-gray-400 font-medium block mb-1 tracking-wider">RPE</span>
                                            <span className="text-[14px] font-bold text-[#4139CF]">
                                                {session.feedback.rpe}
                                            </span>
                                        </div>
                                        <div className="flex-1 px-4 border-r border-gray-100">
                                            <span className="text-[10px] uppercase text-gray-400 font-medium block mb-1 tracking-wider">Energía</span>
                                            <span className="text-[14px] font-medium text-black">
                                                {session.feedback.energy}
                                            </span>
                                        </div>
                                        <div className="flex-1 pl-4">
                                            <span className="text-[10px] uppercase text-gray-400 font-medium block mb-1 tracking-wider">Rendimiento</span>
                                            <span className="text-[14px] font-medium text-black">
                                                {session.feedback.performance === 'Igual' ? 'Estable' : session.feedback.performance}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-8 text-sm text-gray-400 italic">Sin feedback registrado</div>
                                )}

                                {/* Exercises List */}
                                <div className="space-y-8">
                                    {session.exercises.length === 0 ? (
                                        <p className="text-sm text-gray-400">No hay ejercicios registrados</p>
                                    ) : (
                                        session.exercises.map((exercise) => (
                                            <div key={exercise.id} className="space-y-3">
                                                <h4 className="font-bold text-black text-[15px]">{exercise.exercise_name}</h4>

                                                {exercise.notes && (
                                                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-1 px-1">
                                                        <MessageSquare className="h-3 w-3 text-[#4139CF]" />
                                                        <span className="italic font-medium">{exercise.notes}</span>
                                                    </div>
                                                )}

                                                {exercise.sets.length > 0 && (
                                                    <div className="w-full">
                                                        {/* Table Header */}
                                                        <div className="grid grid-cols-[60px_1fr_1fr] mb-3 px-2">
                                                            <div className="text-[11px] text-gray-400 font-medium">Serie</div>
                                                            <div className="text-[11px] text-gray-400 font-medium text-center">Peso</div>
                                                            <div className="text-[11px] text-gray-400 font-medium text-center">Reps</div>
                                                        </div>

                                                        {/* Rows */}
                                                        <div className="space-y-1">
                                                            {exercise.sets.map((set) => (
                                                                <div key={set.set_number} className="grid grid-cols-[60px_1fr_1fr] items-center py-2 px-2 hover:bg-gray-50 rounded-lg transition-colors">
                                                                    <div className="text-[11px] text-gray-400">{set.set_number}</div>
                                                                    <div className="text-[13px] font-bold text-black text-center">{set.weight}kg</div>
                                                                    <div className="text-[13px] font-bold text-black text-center">{set.reps}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                ))}
            </CardContent>
        </Card>
    )
}
