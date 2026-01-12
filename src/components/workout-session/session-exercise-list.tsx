'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Plus } from 'lucide-react'
import { SetRow } from './set-row'
import { RestTimer } from './rest-timer'
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
    category?: string
    sets_detail?: Array<{ reps: string; weight: string; rest: string }>
    cardio_config?: {
        type: 'continuous' | 'intervals'
        duration?: number
        intensity?: 'low' | 'medium' | 'high' | 'hiit'
        work_time?: number
        rest_time?: number
        rounds?: number
    }
}

interface ExerciseCardProps {
    sessionId: string
    exerciseIndex: number
    exercise: Exercise
}

function ExerciseCard({ sessionId, exerciseIndex, exercise }: ExerciseCardProps) {
    const [checkin, setCheckin] = useState<ExerciseCheckin | null>(null)
    const [setLogs, setSetLogs] = useState<SetLog[]>([])
    const [notes, setNotes] = useState('')
    const [restEnabled, setRestEnabled] = useState(false)
    const [restSeconds, setRestSeconds] = useState(90)
    const [sets, setSets] = useState(exercise.sets_detail || [])
    const [loading, setLoading] = useState(true)
    // autoStartTimer state can be kept if we want to auto-open the rest modal, 
    // but the design just shows "Descanso: APAGADO". We will keep the prop connected.
    const [autoStartTimer, setAutoStartTimer] = useState(false)

    useEffect(() => {
        loadCheckin()
    }, [sessionId, exerciseIndex])

    const loadCheckin = async () => {
        setLoading(true)
        const defaultRest = parseInt(exercise.sets_detail?.[0]?.rest || '1') * 60

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

    if (loading) {
        return (
            <div className="py-8 space-y-4">
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                <div className="h-32 bg-muted/50 animate-pulse rounded-lg" />
            </div>
        )
    }

    return (
        <div className="space-y-4 py-2">
            <div className="space-y-2">
                <h3 className="font-bold text-lg leading-none">{exercise.name}</h3>

                {/* Notes Input styled as plain text */}
                <div className="relative group">
                    <Textarea
                        placeholder="Agregar notas aqui..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        onBlur={handleNotesBlur}
                        className="min-h-[24px] h-8 py-1 px-0 bg-transparent border-0 resize-none text-muted-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus:text-foreground text-base transition-colors overflow-hidden"
                    />
                </div>

                {/* Rest Timer */}
                <div className="flex items-center">
                    <RestTimer
                        enabled={restEnabled}
                        seconds={restSeconds}
                        onSettingsChange={handleRestSettingsChange}
                        autoStart={autoStartTimer}
                    />
                </div>
            </div>

            {/* Table Header & Content */}
            <div className="space-y-1">
                <div className="grid grid-cols-[40px_1fr_70px_60px_40px] gap-2 py-2 text-[10px] font-medium text-muted-foreground uppercase text-center">
                    <span>Serie</span>
                    <span>Anterior</span>
                    <span>KG</span>
                    <span>Reps</span>
                    <span>✓</span>
                </div>

                <div className="border rounded-lg border-border/60 overflow-hidden bg-background">
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
                className="w-full h-11 border bg-background hover:bg-muted/50 text-foreground font-medium"
                onClick={handleAddSet}
            >
                <Plus className="h-4 w-4 mr-2" />
                Agregar serie
            </Button>

            {/* Divider between exercises */}
            <div className="pt-6 border-b border-border/40" />
        </div>
    )
}

interface CardioExerciseCardProps {
    exercise: Exercise
}

function CardioExerciseCard({ exercise }: CardioExerciseCardProps) {
    const config = exercise.cardio_config
    const intensityLabel = config?.intensity === 'low' ? 'Baja' :
        config?.intensity === 'medium' ? 'Media' :
            config?.intensity === 'high' ? 'Alta' : 'HIIT'

    return (
        <div className="space-y-4 py-2">
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg leading-none">{exercise.name}</h3>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">
                        Cardio
                    </span>
                </div>
            </div>

            <div className="border rounded-lg overflow-hidden bg-background p-4 space-y-3">
                {config?.type === 'continuous' ? (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Duración</span>
                            <span className="font-bold text-lg">{config?.duration} minutos</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Intensidad</span>
                            <span className="font-semibold">{intensityLabel}</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-xs text-muted-foreground">Trabajo</div>
                                <div className="font-bold text-lg">{config?.work_time}s</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Descanso</div>
                                <div className="font-bold text-lg">{config?.rest_time}s</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Rondas</div>
                                <div className="font-bold text-lg">{config?.rounds}</div>
                            </div>
                        </div>
                        <div className="text-center text-sm text-muted-foreground border-t pt-2">
                            Tiempo total: {Math.floor(((config?.work_time || 0) + (config?.rest_time || 0)) * (config?.rounds || 0) / 60)} min
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Intensidad</span>
                            <span className="font-semibold">{intensityLabel}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Divider between exercises */}
            <div className="pt-6 border-b border-border/40" />
        </div>
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
        <div className="space-y-6 pb-20">
            {exercises.map((exercise, index) => {
                const isCardio = exercise.category === 'Cardio'

                if (isCardio) {
                    return (
                        <CardioExerciseCard
                            key={index}
                            exercise={exercise}
                        />
                    )
                }

                return (
                    <ExerciseCard
                        key={index}
                        sessionId={sessionId}
                        exerciseIndex={index}
                        exercise={exercise}
                    />
                )
            })}
        </div>
    )
}
