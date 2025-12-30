'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MoreVertical, Plus, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react'
import { SetRow } from './set-row'
import { RestTimer } from './rest-timer'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
    getOrCreateExerciseCheckin,
    getExerciseCheckinWithSets,
    saveSetLog,
    deleteSetLog,
    updateExerciseNotes,
    updateRestSettings,
    type SetLog,
    type ExerciseCheckin
} from '@/app/(dashboard)/session/actions'
import { cn } from '@/lib/utils'

interface Exercise {
    name: string
    exercise_id?: string
    sets_detail: Array<{ reps: string; weight: string; rest: string }>
}

interface ExerciseCardProps {
    sessionId: string
    exerciseIndex: number
    exercise: Exercise
    isFirst?: boolean
}

function ExerciseCard({ sessionId, exerciseIndex, exercise, isFirst }: ExerciseCardProps) {
    const [checkin, setCheckin] = useState<ExerciseCheckin | null>(null)
    const [setLogs, setSetLogs] = useState<SetLog[]>([])
    const [notes, setNotes] = useState('')
    const [restEnabled, setRestEnabled] = useState(false)
    const [restSeconds, setRestSeconds] = useState(90)
    const [sets, setSets] = useState(exercise.sets_detail || [])
    const [loading, setLoading] = useState(true)
    const [autoStartTimer, setAutoStartTimer] = useState(false)
    const [isOpen, setIsOpen] = useState(isFirst ?? false)

    useEffect(() => {
        loadCheckin()
    }, [sessionId, exerciseIndex])

    const loadCheckin = async () => {
        setLoading(true)
        const defaultRest = parseInt(exercise.sets_detail[0]?.rest || '1') * 60

        const { checkin: existingCheckin } = await getExerciseCheckinWithSets(sessionId, exerciseIndex)

        if (existingCheckin) {
            setCheckin(existingCheckin as any)
            setNotes(existingCheckin.notes || '')
            setRestEnabled(existingCheckin.rest_enabled)
            setRestSeconds(existingCheckin.rest_seconds)
            setSetLogs((existingCheckin as any).set_logs || [])
        } else {
            const { checkin: newCheckin } = await getOrCreateExerciseCheckin(
                sessionId,
                exerciseIndex,
                exercise.name,
                defaultRest
            )
            if (newCheckin) {
                setCheckin(newCheckin)
                setRestSeconds(newCheckin.rest_seconds)
            }
        }

        setLoading(false)
    }

    const handleSaveSet = async (setNumber: number, reps: number, weight: number, isCompleted: boolean) => {
        if (!checkin) return

        const { setLog } = await saveSetLog(checkin.id, setNumber, reps, weight, isCompleted)

        if (setLog) {
            setSetLogs(prev => {
                const existing = prev.findIndex(s => s.set_number === setNumber)
                if (existing >= 0) {
                    const updated = [...prev]
                    updated[existing] = setLog
                    return updated
                }
                return [...prev, setLog]
            })

            if (isCompleted && restEnabled) {
                setAutoStartTimer(true)
                setTimeout(() => setAutoStartTimer(false), 100)
            }
        }
    }

    const handleDeleteSet = async (setLogId: string, setNumber: number) => {
        if (!confirm('¿Eliminar esta serie?')) return

        await deleteSetLog(setLogId)
        setSetLogs(prev => prev.filter(s => s.id !== setLogId))

        if (setNumber === sets.length) {
            setSets(prev => prev.slice(0, -1))
        }
    }

    const handleAddSet = () => {
        const lastSet = sets[sets.length - 1] || { reps: '10', weight: '0', rest: '1' }
        setSets([...sets, { ...lastSet }])
    }

    const handleNotesBlur = async () => {
        if (checkin) {
            await updateExerciseNotes(checkin.id, notes)
        }
    }

    const handleRestSettingsChange = async (enabled: boolean, seconds: number) => {
        setRestEnabled(enabled)
        setRestSeconds(seconds)
        if (checkin) {
            await updateRestSettings(checkin.id, enabled, seconds)
        }
    }

    const getSetLog = (setNumber: number) => setLogs.find(s => s.set_number === setNumber)
    const getPreviousData = (setNumber: number) => {
        if (setNumber <= 1) return null
        const prevLog = setLogs.find(s => s.set_number === setNumber - 1)
        if (!prevLog) return null
        return { weight: prevLog.weight, reps: prevLog.reps }
    }

    // Calculate completion status
    const completedSets = setLogs.filter(s => s.is_completed).length
    const totalSets = sets.length
    const isComplete = completedSets === totalSets && totalSets > 0

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-xl overflow-hidden">
            <CollapsibleTrigger asChild>
                <div className={cn(
                    "flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                    isComplete && "bg-green-500/10"
                )}>
                    <div className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center",
                        isComplete ? "bg-green-500/20" : "bg-muted"
                    )}>
                        <Dumbbell className={cn("h-6 w-6", isComplete ? "text-green-600" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className={cn("font-semibold", isComplete && "text-green-600")}>{exercise.name}</h3>
                        <p className="text-sm text-muted-foreground">
                            {completedSets}/{totalSets} series • {exercise.sets_detail?.[0]?.reps || 10} reps
                        </p>
                    </div>
                    {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
                <div className="border-t px-4 py-4 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        </div>
                    ) : (
                        <>
                            {/* Notes */}
                            <Textarea
                                placeholder="Agregar notas aquí..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                onBlur={handleNotesBlur}
                                className="min-h-[50px] bg-muted/30 resize-none text-sm"
                            />

                            {/* Rest Timer */}
                            <RestTimer
                                enabled={restEnabled}
                                seconds={restSeconds}
                                onSettingsChange={handleRestSettingsChange}
                                autoStart={autoStartTimer}
                            />

                            {/* Sets Table */}
                            <div className="space-y-1">
                                <div className="grid grid-cols-[40px_1fr_70px_50px_44px] items-center gap-1 px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase">
                                    <span>Serie</span>
                                    <span>Anterior</span>
                                    <span className="text-center">KG</span>
                                    <span className="text-center">Reps</span>
                                    <span className="text-center">✓</span>
                                </div>

                                <div className="border rounded-lg overflow-hidden">
                                    {sets.map((set, index) => {
                                        const setNumber = index + 1
                                        const existingLog = getSetLog(setNumber)
                                        return (
                                            <SetRow
                                                key={setNumber}
                                                setNumber={setNumber}
                                                previousData={getPreviousData(setNumber)}
                                                defaultWeight={parseFloat(set.weight) || 0}
                                                defaultReps={parseInt(set.reps) || 10}
                                                currentWeight={existingLog?.weight}
                                                currentReps={existingLog?.reps}
                                                isCompleted={existingLog?.is_completed || false}
                                                onSave={(reps, weight, isCompleted) =>
                                                    handleSaveSet(setNumber, reps, weight, isCompleted)
                                                }
                                                onDelete={existingLog
                                                    ? () => handleDeleteSet(existingLog.id, setNumber)
                                                    : undefined
                                                }
                                            />
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Add Set Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={handleAddSet}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar Serie
                            </Button>
                        </>
                    )}
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}

interface SessionExerciseListProps {
    sessionId: string
    exercises: Exercise[]
    clientName: string
    workoutName: string
}

export function SessionExerciseList({ sessionId, exercises, clientName, workoutName }: SessionExerciseListProps) {
    return (
        <div className="space-y-3">
            {exercises.map((exercise, index) => (
                <ExerciseCard
                    key={index}
                    sessionId={sessionId}
                    exerciseIndex={index}
                    exercise={exercise}
                    isFirst={index === 0}
                />
            ))}
        </div>
    )
}
