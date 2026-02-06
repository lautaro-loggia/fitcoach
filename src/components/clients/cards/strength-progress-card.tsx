'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowUp01Icon, ArrowDown01Icon, InformationCircleIcon, Dumbbell01Icon } from 'hugeicons-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { createClient } from '@/lib/supabase/client'
import { progressColorClasses } from '@/lib/utils/progress-colors'
import { subWeeks, isAfter, isBefore, parseISO } from 'date-fns'

interface StrengthProgressCardProps {
    clientId: string
}

interface Exercise1RM {
    name: string
    initial1RM: number
    current1RM: number
    changePct: number
}

// Key compound exercises keywords to prioritize
const PRIORITY_KEYWORDS = ['squat', 'bench', 'deadlift', 'peso muerto', 'press', 'sentadilla', 'banca', 'dominada', 'remo']

export function StrengthProgressCard({ clientId }: StrengthProgressCardProps) {
    const [progress, setProgress] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [insufficientData, setInsufficientData] = useState(false)
    const [keyExercises, setKeyExercises] = useState<Exercise1RM[]>([])

    useEffect(() => {
        if (clientId) {
            calculateStrengthProgress()
        }
    }, [clientId])

    const calculateStrengthProgress = async () => {
        setLoading(true)
        setInsufficientData(false)
        try {
            const supabase = createClient()
            const fourWeeksAgo = subWeeks(new Date(), 4).toISOString()

            // 1. Fetch sessions in the last 4 weeks and determine key exercises from ALL history if needed, 
            // but requirements say "key exercises of the advised". 
            // Strategy: Get all set logs for the last 4 weeks.

            // Fetch workout sessions completed in last 4 weeks
            const { data: sessions, error: sessionsError } = await supabase
                .from('workout_sessions')
                .select('id, started_at')
                .eq('client_id', clientId)
                .eq('status', 'completed')
                .gte('started_at', fourWeeksAgo)
                .order('started_at', { ascending: true })

            if (sessionsError) throw sessionsError

            if (!sessions || sessions.length < 2) {
                setInsufficientData(true)
                setLoading(false)
                return
            }

            const sessionIds = sessions.map(s => s.id)

            // Fetch checkins (exercises performed) for these sessions
            const { data: checkins, error: checkinsError } = await supabase
                .from('exercise_checkins')
                .select(`
                    id, 
                    session_id, 
                    exercise_name, 
                    set_logs (
                        weight, 
                        reps
                    )
                `)
                .in('session_id', sessionIds)

            if (checkinsError) throw checkinsError

            if (!checkins || checkins.length === 0) {
                setInsufficientData(true)
                setLoading(false)
                return
            }

            // Group by exercise name
            const exerciseGroups: { [name: string]: any[] } = {}
            checkins.forEach(c => {
                if (!exerciseGroups[c.exercise_name]) exerciseGroups[c.exercise_name] = []
                exerciseGroups[c.exercise_name].push(c)
            })

            // Filter and Select Key Exercises
            // Priority: Compound words match -> Frequency
            const sortedExercises = Object.keys(exerciseGroups).sort((a, b) => {
                const aIsPriority = PRIORITY_KEYWORDS.some(k => a.toLowerCase().includes(k))
                const bIsPriority = PRIORITY_KEYWORDS.some(k => b.toLowerCase().includes(k))

                if (aIsPriority && !bIsPriority) return -1
                if (!aIsPriority && bIsPriority) return 1

                // If both priority or neither, sort by frequency (count of checkins)
                return exerciseGroups[b].length - exerciseGroups[a].length
            })

            // Take top 5
            const topExercises = sortedExercises.slice(0, 5)
            const exerciseProgressResults: Exercise1RM[] = []

            for (const name of topExercises) {
                const logs = exerciseGroups[name]

                // We need at least 2 sessions to compare (start and end)
                // Filter logs that actually have set data
                const validLogs = logs.filter(l => l.set_logs && l.set_logs.length > 0)

                if (validLogs.length < 2) continue

                // Find First Session and Last Session for this exercise in the period
                // We need to map back to session date.
                // Create a map of session_id -> date
                const sessionDateMap = new Map(sessions.map(s => [s.id, new Date(s.started_at).getTime()]))

                validLogs.sort((a, b) => {
                    const dateA = sessionDateMap.get(a.session_id) || 0
                    const dateB = sessionDateMap.get(b.session_id) || 0
                    return dateA - dateB
                })

                const firstLog = validLogs[0]
                const lastLog = validLogs[validLogs.length - 1]

                // If only one session, cannot calculate progress
                if (firstLog.session_id === lastLog.session_id) continue

                // Calculate Max Estimated 1RM for first and last session
                const calculateMax1RM = (setLogs: any[]) => {
                    let max1RM = 0
                    setLogs.forEach((set: any) => {
                        // Epley Formula: 1RM = Weight * (1 + Reps/30)
                        if (set.weight > 0 && set.reps > 0) {
                            const e1rm = Number(set.weight) * (1 + Number(set.reps) / 30)
                            if (e1rm > max1RM) max1RM = e1rm
                        }
                    })
                    return max1RM
                }

                const initial1RM = calculateMax1RM(firstLog.set_logs)
                const current1RM = calculateMax1RM(lastLog.set_logs)

                if (initial1RM > 0 && current1RM > 0) {
                    // Check logic: No compare different exercises (implicit by grouping)
                    const changePct = ((current1RM - initial1RM) / initial1RM) * 100
                    exerciseProgressResults.push({
                        name,
                        initial1RM,
                        current1RM,
                        changePct
                    })
                }
            }

            if (exerciseProgressResults.length === 0) {
                setInsufficientData(true)
            } else {
                // Calculate Average Progress
                const totalChange = exerciseProgressResults.reduce((sum, item) => sum + item.changePct, 0)
                const avgChange = totalChange / exerciseProgressResults.length
                setProgress(avgChange)
                setKeyExercises(exerciseProgressResults)
            }

            setLoading(false)

        } catch (err) {
            console.error("Error calculating strength progress:", err)
            setInsufficientData(true)
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <Card className="flex flex-col h-full animate-pulse">
                <CardHeader className="pb-2">
                    <div className="h-4 w-1/3 bg-muted rounded"></div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end">
                    <div className="h-8 w-1/2 bg-muted rounded mb-2"></div>
                </CardContent>
            </Card>
        )
    }

    // Determine color and icon
    const getProgressState = (value: number) => {
        if (value > 0.5) return { color: "text-green-600", badge: "bg-green-100 text-green-700", icon: ArrowUp01Icon }
        if (value < -0.5) return { color: "text-red-500", badge: "bg-red-100 text-red-700", icon: ArrowDown01Icon }
        return { color: "text-muted-foreground", badge: "bg-gray-100 text-gray-700", icon: null }
    }

    const state = progress !== null ? getProgressState(progress) : { color: "", badge: "", icon: null }
    const Icon = state.icon

    return (
        <Card className="flex flex-col bg-white rounded-2xl min-h-[90px] justify-center">
            <CardContent className="p-4 py-3">
                {insufficientData ? (
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                            <h3 className="text-[17px] font-bold text-gray-900 leading-tight">Progreso en fuerza</h3>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="cursor-help text-gray-300 hover:text-gray-400 transition-colors">
                                            <InformationCircleIcon className="h-3.5 w-3.5" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="p-3 max-w-[240px] bg-zinc-900 text-white border-zinc-800 rounded-xl shadow-xl">
                                        <p className="text-[11px] leading-relaxed">
                                            Mide la evolución del 1RM estimado en los ejercicios principales de las últimas 4 semanas, promediando la mejora en peso y repeticiones logradas.
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <p className="text-[15px] text-gray-400">Aún no se ha registrado ningún ejercicio</p>
                    </div>
                ) : (
                    <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                                <h3 className="text-[17px] font-bold text-gray-900 leading-tight">Progreso en fuerza</h3>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="cursor-help text-gray-300 hover:text-gray-400 transition-colors">
                                                <InformationCircleIcon className="h-3.5 w-3.5" />
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="p-3 max-w-[240px] bg-zinc-900 text-white border-zinc-800 rounded-xl shadow-xl">
                                            <p className="text-[11px] leading-relaxed">
                                                Mide la evolución del 1RM estimado en los ejercicios principales de las últimas 4 semanas, promediando la mejora en peso y repeticiones logradas.
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <p className="text-[15px] text-gray-400">últimas 4 semanas</p>
                        </div>
                        <div className="text-[18px] font-bold text-[#22C55E]">
                            {progress && progress > 0 ? '+' : ''}{progress?.toFixed(1)}%
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
