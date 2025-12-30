'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, MoreVertical, Plus, Dumbbell } from 'lucide-react'
import { SetRow } from './set-row'
import { RestTimer } from './rest-timer'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

interface Exercise {
    name: string
    exercise_id?: string
    sets_detail: Array<{ reps: string; weight: string; rest: string }>
}

interface ExerciseCheckinMobileProps {
    sessionId: string
    exerciseIndex: number
    exercise: Exercise
    clientName: string
}

export function ExerciseCheckinMobile({
    sessionId,
    exerciseIndex,
    exercise,
    clientName
}: ExerciseCheckinMobileProps) {
    const router = useRouter()
    const [checkin, setCheckin] = useState<ExerciseCheckin | null>(null)
    const [setLogs, setSetLogs] = useState<SetLog[]>([])
    const [notes, setNotes] = useState('')
    const [restEnabled, setRestEnabled] = useState(false)
    const [restSeconds, setRestSeconds] = useState(90)
    const [sets, setSets] = useState(exercise.sets_detail || [])
    const [loading, setLoading] = useState(true)
    const [autoStartTimer, setAutoStartTimer] = useState(false)

    // Initial load
    useEffect(() => {
        loadCheckin()
    }, [sessionId, exerciseIndex])

    const loadCheckin = async () => {
        setLoading(true)

        // Get default rest from exercise
        const defaultRest = parseInt(exercise.sets_detail[0]?.rest || '1') * 60 // Convert minutes to seconds

        // Get or create checkin
        const { checkin: existingCheckin } = await getExerciseCheckinWithSets(sessionId, exerciseIndex)

        if (existingCheckin) {
            setCheckin(existingCheckin as any)
            setNotes(existingCheckin.notes || '')
            setRestEnabled(existingCheckin.rest_enabled)
            setRestSeconds(existingCheckin.rest_seconds)
            setSetLogs((existingCheckin as any).set_logs || [])
        } else {
            // Create new checkin
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

            // Auto-start timer when completing a set
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

        // If it was the last set, remove it from UI
        if (setNumber === sets.length) {
            setSets(prev => prev.slice(0, -1))
        }
    }

    const handleAddSet = () => {
        const lastSet = sets[sets.length - 1] || { reps: '10', weight: '0', rest: '1' }
        setSets([...sets, { ...lastSet }])
    }

    const handleNotesChange = async (value: string) => {
        setNotes(value)
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

    const getSetLog = (setNumber: number) => {
        return setLogs.find(s => s.set_number === setNumber)
    }

    const getPreviousData = (setNumber: number) => {
        if (setNumber <= 1) return null
        const prevLog = setLogs.find(s => s.set_number === setNumber - 1)
        if (!prevLog) return null
        return { weight: prevLog.weight, reps: prevLog.reps }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background border-b">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                <Dumbbell className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-primary">{exercise.name}</h1>
                                <p className="text-xs text-muted-foreground">{clientName}</p>
                            </div>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.back()}>
                                Volver a la lista
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* Notes */}
                <Textarea
                    placeholder="Agregar notas aquí..."
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    onBlur={handleNotesBlur}
                    className="min-h-[60px] bg-transparent border-0 resize-none p-0 text-muted-foreground placeholder:text-muted-foreground/50 focus-visible:ring-0"
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
                    {/* Header */}
                    <div className="grid grid-cols-[40px_1fr_80px_60px_50px] items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase">
                        <span>Serie</span>
                        <span>Anterior</span>
                        <span className="text-center flex items-center justify-center gap-1">
                            <Dumbbell className="h-3 w-3" /> KG
                        </span>
                        <span className="text-center">Reps</span>
                        <span className="text-center">✓</span>
                    </div>

                    {/* Rows */}
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
                    variant="secondary"
                    className="w-full py-6"
                    onClick={handleAddSet}
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Agregar Serie
                </Button>
            </div>
        </div>
    )
}
