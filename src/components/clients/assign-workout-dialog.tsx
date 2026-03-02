'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PlusSignIcon, Cancel01Icon, DragDropVerticalIcon, FloppyDiskIcon, ArrowLeft01Icon, PencilEdit01Icon, Calendar03Icon, Delete02Icon, Tick01Icon, ArrowUpDownIcon, InformationCircleIcon, Dumbbell01Icon, ZapIcon, GridViewIcon } from 'hugeicons-react'
import { createClient } from '@/lib/supabase/client'
import { assignWorkoutAction, updateAssignedWorkoutAction } from '@/app/(dashboard)/clients/[id]/training-actions'
import { searchExercises } from '@/app/(dashboard)/workouts/actions'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { format, parse, addWeeks, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn, normalizeText } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { AlertTriangle, Sparkles } from 'lucide-react'
import { formatInjuryWarningMessage, getActiveInjuries } from '@/lib/injury-risk-utils'
import { AIWorkoutBriefDialog } from '@/components/workouts/ai-workout-brief-dialog'
import { getClientWorkoutDraftDefaultsAction } from '@/app/(dashboard)/workouts/ai-workout-actions'
import type { AIGeneratedWorkoutDraft, AIWorkoutBriefDefaults } from '@/lib/ai/workout-ai-types'

// Helper to convert string to Title Case
const toTitleCase = (str: string) => {
    return str.toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Helper to get contextual icon for a routine name
const getRoutineIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('pierna')) return <Dumbbell01Icon className="h-5 w-5 text-amber-500" />;
    if (n.includes('empuje') || n.includes('push')) return <ZapIcon className="h-5 w-5 text-blue-500" />;
    if (n.includes('traccion') || n.includes('pull') || n.includes('tirón')) return <ZapIcon className="h-5 w-5 text-purple-500" />;
    if (n.includes('pecho') || n.includes('espalda') || n.includes('hombro')) return <Dumbbell01Icon className="h-5 w-5 text-red-500" />;
    if (n.includes('brazos') || n.includes('biceps')) return <Dumbbell01Icon className="h-5 w-5 text-green-500" />;
    if (n.includes('dia') || n.includes('lunes') || n.includes('martes') || n.includes('miércoles') || n.includes('jueves') || n.includes('viernes') || n.includes('sábado') || n.includes('domingo')) return <Calendar03Icon className="h-5 w-5 text-indigo-500" />;
    return <GridViewIcon className="h-5 w-5 text-gray-500" />;
}

// Color mapping for muscle groups
const getMuscleGroupColor = (muscleGroup: string) => {
    const colors: Record<string, string> = {
        'Pecho': 'bg-red-100 text-red-700',
        'Espalda': 'bg-blue-100 text-blue-700',
        'Hombros': 'bg-purple-100 text-purple-700',
        'Brazos': 'bg-green-100 text-green-700',
        'Bíceps': 'bg-green-100 text-green-700',
        'Tríceps': 'bg-teal-100 text-teal-700',
        'Piernas': 'bg-amber-100 text-amber-700',
        'Cuádriceps': 'bg-yellow-100 text-yellow-700',
        'Isquiotibiales': 'bg-lime-100 text-lime-700',
        'Glúteos': 'bg-pink-100 text-pink-700',
        'Abdominales': 'bg-indigo-100 text-indigo-700',
        'Core': 'bg-violet-100 text-violet-700',
        'Antebrazos': 'bg-cyan-100 text-cyan-700',
        'Pantorrillas': 'bg-emerald-100 text-emerald-700',
        'Trapecio': 'bg-sky-100 text-sky-700',
        'Cuello': 'bg-fuchsia-100 text-fuchsia-700',
        'Cardio': 'bg-orange-100 text-orange-700'
    }
    return colors[muscleGroup] || 'bg-gray-100 text-gray-600'
}

interface AssignWorkoutDialogProps {
    clientId: string
    clientName?: string
    existingWorkout?: any
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export function AssignWorkoutDialog({
    clientId,
    clientName,
    existingWorkout,
    trigger,
    open: controlledOpen,
    onOpenChange: setControlledOpen
}: AssignWorkoutDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)

    // Derived state for open status
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
    const setOpen = (val: boolean) => {
        setInternalOpen(val)
        if (setControlledOpen) setControlledOpen(val)
    }

    const [step, setStep] = useState<'select' | 'edit'>('select')
    const [loading, setLoading] = useState(false)

    // Templates
    const [templates, setTemplates] = useState<any[]>([])
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')

    // Editor
    const [workoutName, setWorkoutName] = useState('')
    const [exercises, setExercises] = useState<any[]>([])
    const [validUntil, setValidUntil] = useState<Date | undefined>(undefined)
    const [reviewDatePopoverOpen, setReviewDatePopoverOpen] = useState(false)
    const [scheduledDays, setScheduledDays] = useState<string[]>([])
    const [notes, setNotes] = useState('')
    const [isPresential, setIsPresential] = useState(false)
    const [startTime, setStartTime] = useState<string>('')
    const [endTime, setEndTime] = useState<string>('')
    const [clientInjuries, setClientInjuries] = useState<any[]>([])
    const [aiDialogOpen, setAiDialogOpen] = useState(false)
    const [aiDefaults, setAiDefaults] = useState<AIWorkoutBriefDefaults | undefined>(undefined)
    const [aiDraftQueue, setAiDraftQueue] = useState<AIGeneratedWorkoutDraft[]>([])
    const [aiDraftIndex, setAiDraftIndex] = useState(0)

    // Exercise Form State
    const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null)
    const [isAddingNewExercise, setIsAddingNewExercise] = useState(false)
    const [injuryWarningOpen, setInjuryWarningOpen] = useState(false)
    const [injuryWarningMessage, setInjuryWarningMessage] = useState('')
    const [pendingWarningAction, setPendingWarningAction] = useState<null | (() => void)>(null)

    useEffect(() => {
        if (isOpen) {
            if (existingWorkout) {
                setWorkoutName(existingWorkout.name)
                setExercises(Array.isArray(existingWorkout.structure) ? JSON.parse(JSON.stringify(existingWorkout.structure)) : [])
                setValidUntil(existingWorkout.valid_until ? parse(existingWorkout.valid_until, 'yyyy-MM-dd', new Date()) : undefined)
                setScheduledDays(existingWorkout.scheduled_days || [])
                setNotes(existingWorkout.notes || '')
                setIsPresential(existingWorkout.is_presential || false)
                setStartTime(existingWorkout.start_time ? existingWorkout.start_time.substring(0, 5) : '')
                setEndTime(existingWorkout.end_time ? existingWorkout.end_time.substring(0, 5) : '')
            } else {

                fetchTemplates()
                setStep('select')
                resetEditor()
                loadAIDefaults()
            }

            fetchClientInjuries()
        }
    }, [isOpen, existingWorkout])

    const fetchClientInjuries = async () => {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('clients')
            .select('injuries')
            .eq('id', clientId)
            .single()

        if (error) {
            console.error('Error loading client injuries:', error)
            setClientInjuries([])
            return
        }

        setClientInjuries(getActiveInjuries(data?.injuries))
    }

    const loadAIDefaults = async () => {
        const result = await getClientWorkoutDraftDefaultsAction(clientId)
        if (!result.success || !result.defaults) {
            setAiDefaults(undefined)
            return
        }

        setAiDefaults(result.defaults)
    }

    const fetchTemplates = async () => {
        const supabase = createClient()
        const { data } = await supabase.from('workouts').select('*').order('name')
        if (data) {
            // Deduplicate by name (normalized) and filter out empty names
            const seen = new Set();
            const unique = data.filter(t => {
                if (!t.name || t.name.trim() === '') return false;
                const normalized = t.name.trim().toLowerCase();
                if (seen.has(normalized)) return false;
                seen.add(normalized);
                return true;
            });
            setTemplates(unique)
        }
    }

    const resetEditor = () => {
        setWorkoutName('')
        setExercises([])
        setSelectedTemplateId('')
        setValidUntil(addWeeks(new Date(), 4))
        setReviewDatePopoverOpen(false)
        setScheduledDays([])
        setScheduledDays([])
        setNotes('')
        setIsPresential(false)
        setStartTime('')
        setEndTime('')
        setAiDraftQueue([])
        setAiDraftIndex(0)
    }

    const toggleDay = (day: string) => {
        setScheduledDays(prev => (prev.includes(day) ? [] : [day]))
    }

    const handleSelectTemplate = () => {
        if (!selectedTemplateId) return
        const template = templates.find(t => t.id === selectedTemplateId)
        if (template) {
            setWorkoutName(template.name)
            const exList = Array.isArray(template.structure) ? template.structure : []
            setExercises(JSON.parse(JSON.stringify(exList)))
            setAiDraftQueue([])
            setAiDraftIndex(0)
            setStep('edit')
        }
    }

    const handleCreateEmpty = () => {
        setWorkoutName('Nuevo Entrenamiento')
        setExercises([])
        setSelectedTemplateId('')
        setAiDraftQueue([])
        setAiDraftIndex(0)
        setStep('edit')
    }

    const applyDraftToEditor = (draft: AIGeneratedWorkoutDraft) => {
        setWorkoutName(draft.name)
        setExercises(Array.isArray(draft.exercises) ? JSON.parse(JSON.stringify(draft.exercises)) : [])
        setSelectedTemplateId('')
        setStep('edit')

        if (Array.isArray(draft.scheduled_days) && draft.scheduled_days.length > 0) {
            setScheduledDays([draft.scheduled_days[0]])
        } else {
            setScheduledDays([])
        }

        if (draft.valid_until) {
            const parsedDate = parse(draft.valid_until, 'yyyy-MM-dd', new Date())
            if (!Number.isNaN(parsedDate.getTime())) {
                setValidUntil(parsedDate)
            }
        }

        // Las notas son responsabilidad del coach; no precargamos texto generado por IA.
        setNotes('')
    }

    const getRoutineFocusLabel = (exercise: any) => {
        const rawMuscleGroup = typeof exercise?.muscle_group === 'string' ? exercise.muscle_group : ''
        const normalized = normalizeText(rawMuscleGroup)

        if (!normalized) return 'General'
        if (normalized.includes('pecho')) return 'Pecho'
        if (normalized.includes('espalda') || normalized.includes('dorsal') || normalized.includes('trapec')) return 'Espalda'
        if (normalized.includes('hombro') || normalized.includes('deltoid')) return 'Hombros'
        if (normalized.includes('bicep')) return 'Bíceps'
        if (normalized.includes('tricep')) return 'Tríceps'
        if (
            normalized.includes('pierna') ||
            normalized.includes('cuadri') ||
            normalized.includes('isquio') ||
            normalized.includes('glute') ||
            normalized.includes('pantorr') ||
            normalized.includes('aductor') ||
            normalized.includes('abductor')
        ) {
            return 'Piernas'
        }
        if (normalized.includes('abd') || normalized.includes('core')) return 'Core'
        if (normalized.includes('cardio')) return 'Cardio'

        return rawMuscleGroup.trim() || 'General'
    }

    const splitAIDraftIntoIndividualRoutines = (draft: AIGeneratedWorkoutDraft): AIGeneratedWorkoutDraft[] => {
        const days = Array.isArray(draft.scheduled_days) && draft.scheduled_days.length > 0
            ? [...new Set(draft.scheduled_days)]
            : ['Lunes']

        if (days.length === 1) {
            return [{ ...draft, scheduled_days: [days[0]] }]
        }

        const sourceExercises = Array.isArray(draft.exercises) ? draft.exercises : []
        if (sourceExercises.length === 0) {
            return days.map((day, index) => ({
                ...draft,
                name: `Rutina ${index + 1} - ${day}`,
                exercises: [],
                scheduled_days: [day],
            }))
        }

        const byFocus = new Map<string, any[]>()
        sourceExercises.forEach((exercise) => {
            const focus = getRoutineFocusLabel(exercise)
            if (!byFocus.has(focus)) {
                byFocus.set(focus, [])
            }
            byFocus.get(focus)?.push(exercise)
        })

        const focusBuckets = Array.from(byFocus.entries())
            .map(([focus, exercises]) => ({ focus, exercises: [...exercises] }))
            .sort((a, b) => b.exercises.length - a.exercises.length)

        const maxRoutinesByExercises = Math.max(1, sourceExercises.length)
        const targetCount = Math.min(days.length, maxRoutinesByExercises)
        const routines: Array<{ focus: string; exercises: any[] }> = []

        focusBuckets.forEach((bucket) => {
            if (routines.length < targetCount) {
                routines.push({ focus: bucket.focus, exercises: [...bucket.exercises] })
                return
            }

            const targetIndex = routines.reduce((bestIndex, current, index, arr) => {
                return current.exercises.length < arr[bestIndex].exercises.length ? index : bestIndex
            }, 0)
            routines[targetIndex].exercises.push(...bucket.exercises)
        })

        while (routines.length < targetCount) {
            const splitIndex = routines.findIndex((routine) => routine.exercises.length > 1)
            if (splitIndex === -1) break

            const source = routines[splitIndex]
            const splitPoint = Math.ceil(source.exercises.length / 2)
            const moved = source.exercises.splice(splitPoint)
            if (moved.length === 0) break
            routines.push({ focus: source.focus, exercises: moved })
        }

        return routines
            .filter((routine) => routine.exercises.length > 0)
            .map((routine, index) => {
                const day = days[index] || days[days.length - 1]
                const focus = routine.focus || `Rutina ${index + 1}`
                return {
                    ...draft,
                    name: `${focus} - ${day}`,
                    exercises: routine.exercises,
                    scheduled_days: [day],
                }
            })
    }

    const handleAIDraftGenerated = (payload: { draft: AIGeneratedWorkoutDraft; warnings: string[] }) => {
        const { draft, warnings } = payload
        const individualDrafts = splitAIDraftIntoIndividualRoutines(draft)
        setAiDraftQueue(individualDrafts)
        setAiDraftIndex(0)
        applyDraftToEditor(individualDrafts[0])

        if (warnings.length > 0) {
            toast.info(`Revisá ${warnings.length} advertencia${warnings.length > 1 ? 's' : ''} antes de asignar.`)
        }
        if (individualDrafts.length > 1) {
            toast.success(`Se dividió el plan en ${individualDrafts.length} rutinas individuales (una por día).`)
        }
    }

    const getPresetReviewDate = (weeks: number) => {
        const baseDate = new Date()
        baseDate.setHours(12, 0, 0, 0)
        return addWeeks(baseDate, weeks)
    }

    const handleSelectReviewDatePreset = (weeks: number) => {
        setValidUntil(getPresetReviewDate(weeks))
        setReviewDatePopoverOpen(false)
    }

    const isReviewDatePresetSelected = (weeks: number) => {
        if (!validUntil) return false
        return isSameDay(validUntil, getPresetReviewDate(weeks))
    }

    const applyExerciseChange = (exerciseData: any) => {
        let newExercise = { ...exerciseData }

        // Only calculate sets summary for strength exercises
        if (exerciseData.sets_detail) {
            const summary = {
                sets: exerciseData.sets_detail.length.toString(),
                reps: exerciseData.sets_detail[0]?.reps || '0',
                weight: exerciseData.sets_detail[0]?.weight || '0',
                rest: exerciseData.sets_detail[0]?.rest || '0'
            }
            newExercise = { ...newExercise, ...summary }
        }

        if (editingExerciseIndex !== null) {
            const updated = [...exercises]
            updated[editingExerciseIndex] = newExercise
            setExercises(updated)
        } else {
            setExercises([...exercises, newExercise])
        }

        // Close form
        setEditingExerciseIndex(null)
        setIsAddingNewExercise(false)
    }

    const handleSaveExercise = (exerciseData: any) => {
        const message = formatInjuryWarningMessage(exerciseData, clientInjuries)

        if (!message) {
            applyExerciseChange(exerciseData)
            return
        }

        setInjuryWarningMessage(message)
        setPendingWarningAction(() => () => applyExerciseChange(exerciseData))
        setInjuryWarningOpen(true)
    }

    const handleRemoveExercise = (index: number) => {
        setExercises(exercises.filter((_, i) => i !== index))
    }

    const handleSave = async (bypassInjuryWarning = false) => {
        if (!validUntil) {
            toast.error('La fecha de revisión es obligatoria')
            return
        }

        if (scheduledDays.length === 0) {
            toast.error('Debes seleccionar al menos un día para asignar la rutina')
            return
        }

        if (!bypassInjuryWarning) {
            const firstConflictExercise = exercises.find(ex => formatInjuryWarningMessage(ex, clientInjuries))
            if (firstConflictExercise) {
                const message = formatInjuryWarningMessage(firstConflictExercise, clientInjuries)
                if (message) {
                    setInjuryWarningMessage(`${message} Si querés, podés guardar igual.`)
                    setPendingWarningAction(() => () => {
                        handleSave(true)
                    })
                    setInjuryWarningOpen(true)
                    return
                }
            }
        }

        setLoading(true)
        const payload = {
            clientId,
            name: workoutName,
            exercises,
            validUntil: format(validUntil, 'yyyy-MM-dd'),
            scheduledDays,
            notes: notes.trim() || undefined,
            isPresential,
            startTime: isPresential && startTime ? startTime : undefined,
            endTime: isPresential && endTime ? endTime : undefined
        }

        let result
        if (existingWorkout) {
            result = await updateAssignedWorkoutAction({
                id: existingWorkout.id,
                ...payload
            })
        } else {
            result = await assignWorkoutAction({
                ...payload,
                originTemplateId: selectedTemplateId || undefined
            })
        }

        if (result?.error) {
            toast.error(result.error)
        } else {
            if (!existingWorkout && aiDraftQueue.length > 1 && aiDraftIndex < aiDraftQueue.length - 1) {
                const nextIndex = aiDraftIndex + 1
                setAiDraftIndex(nextIndex)
                applyDraftToEditor(aiDraftQueue[nextIndex])
                toast.success(`Rutina ${nextIndex} de ${aiDraftQueue.length} lista. Completá y guardá la siguiente.`)
                setLoading(false)
                return
            }

            setOpen(false)
        }
        setLoading(false)
    }

    // Determine current view
    const isEditingExercise = editingExerciseIndex !== null || isAddingNewExercise

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button className="bg-primary hover:bg-primary/90 text-white">
                        <PlusSignIcon className="mr-2 h-4 w-4" /> Asignar Rutina
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className={cn(
                "max-h-[95vh] overflow-y-auto",
                step === 'select' && !existingWorkout ? "sm:max-w-[500px]" : "sm:max-w-[850px]",
                // Bottom-sheet effect on mobile
                "max-sm:fixed max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:w-screen max-sm:max-w-none max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:rounded-none max-sm:border-0 max-sm:p-4 max-sm:pt-5"
            )}>
                <DialogHeader className={step === 'select' && !existingWorkout ? "text-center pb-2" : ""}>
                    <div className={cn("flex items-center gap-2", step === 'select' && !existingWorkout ? "justify-center" : "justify-start")}>
                        {!existingWorkout && step === 'edit' && !isEditingExercise && (
                            <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2 shrink-0" onClick={() => setStep('select')}>
                                <ArrowLeft01Icon className="h-5 w-5" />
                            </Button>
                        )}
                        <DialogTitle className={cn(
                            step === 'select' && !existingWorkout ? "text-2xl font-bold" : "text-xl font-bold"
                        )}>
                            {isEditingExercise
                                ? (editingExerciseIndex !== null ? 'Editar ejercicio' : 'Agregar Ejercicio')
                                : (existingWorkout
                                    ? `Asignar rutina para ${clientName || 'Cliente'}`
                                    : (step === 'select' ? 'Elegir plantilla' : `Asignar rutina para ${clientName || 'Cliente'}`)
                                )
                            }
                        </DialogTitle>
                    </div>
                    {step === 'select' && !existingWorkout && !isEditingExercise && (
                        <p className="text-muted-foreground mt-1 text-center">
                            Partí de una rutina existente o creá una nueva
                        </p>
                    )}
                </DialogHeader>

                <div className="pr-1 max-sm:-mr-1 pb-4">
                {isEditingExercise ? (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
                        <ExerciseForm
                            initialData={editingExerciseIndex !== null ? exercises[editingExerciseIndex] : undefined}
                            onSave={handleSaveExercise}
                            onCancel={() => {
                                setEditingExerciseIndex(null)
                                setIsAddingNewExercise(false)
                            }}
                        />
                    </div>
                ) : (
                    <>
                        {step === 'select' && !existingWorkout ? (
                            <div className="space-y-6 py-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {templates.map(t => {
                                        const isSelected = selectedTemplateId === t.id;
                                        return (
                                            <div
                                                key={t.id}
                                                onClick={() => setSelectedTemplateId(t.id)}
                                                className={cn(
                                                    "group relative flex flex-col p-4 rounded-xl border-2 transition-all cursor-pointer hover:border-primary/50",
                                                    isSelected
                                                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                                        : "border-muted bg-card hover:bg-muted/30"
                                                )}
                                            >
                                                <div className="flex items-center gap-3 mb-1">
                                                    <div className={cn(
                                                        "p-2 rounded-lg transition-colors",
                                                        isSelected ? "bg-primary/10" : "bg-muted group-hover:bg-muted-foreground/10"
                                                    )}>
                                                        {getRoutineIcon(t.name)}
                                                    </div>
                                                    <span className="font-semibold text-foreground line-clamp-1">
                                                        {toTitleCase(t.name)}
                                                    </span>
                                                </div>

                                                {isSelected && (
                                                    <div className="absolute top-2 right-2">
                                                        <div className="bg-primary text-white rounded-full p-0.5">
                                                            <Tick01Icon className="h-3 w-3" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {selectedTemplateId && (
                                    <div className="flex justify-center animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
                                            <Tick01Icon className="h-3 w-3" />
                                            Plantilla seleccionada: {toTitleCase(templates.find(t => t.id === selectedTemplateId)?.name || '')}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col gap-4 mt-2">
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            onClick={handleSelectTemplate}
                                            disabled={!selectedTemplateId}
                                            className="w-full py-6 text-lg font-semibold rounded-2xl shadow-sm transition-all active:scale-[0.98]"
                                        >
                                            Usar esta plantilla
                                        </Button>
                                        <p className="text-center text-[11px] text-muted-foreground">
                                            Podrás editar ejercicios, series y cargas luego.
                                        </p>
                                    </div>

                                    <div className="flex justify-center">
                                        <Button
                                            variant="ghost"
                                            onClick={handleCreateEmpty}
                                            className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                                        >
                                            <PlusSignIcon className="h-4 w-4" />
                                            O crear rutina desde cero
                                        </Button>
                                    </div>

                                    <div className="flex justify-center">
                                        <Button
                                            variant="outline"
                                            onClick={() => setAiDialogOpen(true)}
                                            className="w-full border-dashed border-2 text-primary hover:text-primary flex items-center gap-2"
                                        >
                                            <Sparkles className="h-4 w-4" />
                                            Generar con IA
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row items-end gap-4">
                                    <div className="flex-1 space-y-2 w-full">
                                        <Label>Nombre de la Rutina</Label>
                                        <Input
                                            value={workoutName}
                                            onChange={(e) => setWorkoutName(e.target.value)}
                                            placeholder="Ej: Empuje, Piernas, etc."
                                        />
                                    </div>

                                    <div className="flex-1 space-y-2 w-full">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <Label>Fecha de revisión *</Label>
                                            <div className="flex shrink-0 gap-1 rounded-lg bg-muted/50 p-1">
                                                {[4, 8, 12].map((weeks) => (
                                                    <Button
                                                        key={weeks}
                                                        type="button"
                                                        variant={isReviewDatePresetSelected(weeks) ? "secondary" : "ghost"}
                                                        size="sm"
                                                        className="h-7 px-2 text-[11px] font-medium"
                                                        onClick={() => handleSelectReviewDatePreset(weeks)}
                                                    >
                                                        {weeks} sem
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                        <Popover open={reviewDatePopoverOpen} onOpenChange={setReviewDatePopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !validUntil && "text-muted-foreground")}>
                                                    <Calendar03Icon className="mr-2 h-4 w-4 shrink-0" />
                                                    <span className="truncate">{validUntil ? format(validUntil, "d 'de' MMMM, yyyy", { locale: es }) : "Seleccionar *"}</span>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={validUntil}
                                                    defaultMonth={validUntil}
                                                    fromDate={new Date()}
                                                    onSelect={(date) => {
                                                        if (!date) return
                                                        setValidUntil(date)
                                                        setReviewDatePopoverOpen(false)
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div className="flex items-center gap-2 pb-2.5 shrink-0">
                                        <Switch
                                            id="presential-mode"
                                            checked={isPresential}
                                            onCheckedChange={setIsPresential}
                                        />
                                        <Label htmlFor="presential-mode" className="text-sm cursor-pointer whitespace-nowrap">Presencial</Label>
                                    </div>
                                </div>

                                {aiDraftQueue.length > 1 && (
                                    <div className="rounded-lg border bg-primary/5 text-primary px-3 py-2 text-sm font-medium">
                                        Rutina {aiDraftIndex + 1} de {aiDraftQueue.length}. Se guardarán como rutinas separadas.
                                    </div>
                                )}

                                {isPresential && (
                                    <div className="flex gap-4 animate-in slide-in-from-top-2">
                                        <div className="flex-1 space-y-2">
                                            <Label>Hora Inicio</Label>
                                            <Input
                                                type="time"
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <Label>Hora Fin</Label>
                                            <Input
                                                type="time"
                                                value={endTime}
                                                onChange={(e) => setEndTime(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Day Selector */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label>Días asignados</Label>
                                        <span className="text-xs text-muted-foreground font-normal">(Un solo día por rutina)</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                                        {DAYS.map(day => (
                                            <Button
                                                key={day}
                                                type="button"
                                                variant={scheduledDays.includes(day) ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => toggleDay(day)}
                                                className={cn(
                                                    "w-full sm:w-auto",
                                                    scheduledDays.includes(day) ? "bg-primary hover:bg-primary/90 text-white" : ""
                                                )}
                                            >
                                                {day}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="border rounded-lg overflow-x-auto bg-background custom-scrollbar">
                                        <Table className="min-w-[640px] sm:min-w-0">
                                            <TableHeader>
                                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                    <TableHead className="w-[40%] font-bold text-foreground">Ejercicio</TableHead>
                                                    <TableHead className="text-center font-bold text-foreground">Series</TableHead>
                                                    <TableHead className="text-center font-bold text-foreground">Repeticiones</TableHead>
                                                    <TableHead className="text-center font-bold text-foreground">Peso</TableHead>
                                                    <TableHead className="text-center font-bold text-foreground">Descanso</TableHead>
                                                    <TableHead className="w-[80px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {exercises.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                            No hay ejercicios agregados
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    exercises.map((ex, index) => (
                                                        <TableRow key={index} className="group hover:bg-muted/30">
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium">{ex.name}</span>
                                                                    {ex.category === 'Cardio' ? (
                                                                        <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">
                                                                            Cardio
                                                                        </span>
                                                                    ) : ex.muscle_group && (
                                                                        <span className={`px-2 py-0.5 text-xs rounded-full ${getMuscleGroupColor(ex.muscle_group)}`}>
                                                                            {ex.muscle_group}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            {ex.category === 'Cardio' ? (
                                                                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                                                                    {ex.cardio_config?.type === 'continuous' ? (
                                                                        <span>{ex.cardio_config?.duration} min • Intensidad {
                                                                            ex.cardio_config?.intensity === 'low' ? 'Baja' :
                                                                                ex.cardio_config?.intensity === 'medium' ? 'Media' :
                                                                                    ex.cardio_config?.intensity === 'high' ? 'Alta' : 'HIIT'
                                                                        }</span>
                                                                    ) : (
                                                                        <span>{ex.cardio_config?.work_time}s / {ex.cardio_config?.rest_time}s × {ex.cardio_config?.rounds} rondas</span>
                                                                    )}
                                                                </TableCell>
                                                            ) : (
                                                                <>
                                                                    <TableCell className="text-center font-semibold">{ex.sets}</TableCell>
                                                                    <TableCell className="text-center">{ex.reps}</TableCell>
                                                                    <TableCell className="text-center">{ex.weight}kg</TableCell>
                                                                    <TableCell className="text-center">{ex.rest} min</TableCell>
                                                                </>
                                                            )}
                                                            <TableCell>
                                                                <div className="flex justify-end gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-primary hover:text-primary hover:bg-muted"
                                                                        onClick={() => setEditingExerciseIndex(index)}
                                                                    >
                                                                        <PencilEdit01Icon className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-destructive hover:bg-red-50"
                                                                        onClick={() => handleRemoveExercise(index)}
                                                                    >
                                                                        <Delete02Icon className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <Button
                                        variant="outline"
                                        className="w-full py-6 border-dashed border-2 flex gap-2 text-muted-foreground hover:text-foreground"
                                        onClick={() => setIsAddingNewExercise(true)}
                                    >
                                        <PlusSignIcon className="h-5 w-5" /> Agregar nuevo ejercicio
                                    </Button>
                                </div>

                                {/* Notes field */}
                                <div className="space-y-2">
                                    <Label>Notas (Opcional)</Label>
                                    <Textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Agregar notas o instrucciones especiales..."
                                        rows={5}
                                        className="min-h-[180px]"
                                    />
                                </div>

                                <div className="max-sm:sticky max-sm:bottom-0 z-10 flex flex-col-reverse gap-2 border-t bg-background/95 pt-4 pb-3 backdrop-blur sm:static sm:flex-row sm:justify-end sm:bg-transparent sm:pb-0 sm:backdrop-blur-0">
                                    <Button className="w-full sm:w-auto" variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
                                    <Button
                                        className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white"
                                        onClick={() => {
                                            void handleSave()
                                        }}
                                        disabled={loading || !workoutName || !validUntil || scheduledDays.length === 0}
                                    >
                                        {loading ? 'Asignando...' : (aiDraftQueue.length > 1 ? `Guardar y seguir (${aiDraftIndex + 1}/${aiDraftQueue.length})` : 'Asignar rutina')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
                </div>
            </DialogContent>
            </Dialog>

            <AlertDialog open={injuryWarningOpen} onOpenChange={setInjuryWarningOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="h-5 w-5" />
                            Advertencia por lesión
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-base pt-2">
                            {injuryWarningMessage}
                            <br /><br />
                            ¿Querés continuar de todos modos?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setInjuryWarningOpen(false)
                            setPendingWarningAction(null)
                        }}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-amber-600 text-white hover:bg-amber-700"
                            onClick={() => {
                                const action = pendingWarningAction
                                setInjuryWarningOpen(false)
                                setPendingWarningAction(null)
                                if (action) action()
                            }}
                        >
                            Continuar igual
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AIWorkoutBriefDialog
                mode="client"
                open={aiDialogOpen}
                onOpenChange={setAiDialogOpen}
                clientId={clientId}
                defaults={aiDefaults}
                injuries={clientInjuries}
                onGenerated={handleAIDraftGenerated}
            />
        </>
    )
}

function ExerciseForm({
    initialData,
    onSave,
    onCancel
}: {
    initialData?: any,
    onSave: (data: any) => void,
    onCancel: () => void
}) {
    const [name, setName] = useState(initialData?.name || '')
    const [exerciseId, setExerciseId] = useState(initialData?.exercise_id || '')
    const [muscleGroup, setMuscleGroup] = useState(initialData?.muscle_group || '')
    const [category, setCategory] = useState(initialData?.category || '')
    const [gifUrl, setGifUrl] = useState(initialData?.gif_url || '')
    const [instructions, setInstructions] = useState<string[]>(initialData?.instructions || [])
    const [sets, setSets] = useState<any[]>(
        initialData?.sets_detail || [{ reps: '10', weight: '40', rest: '1' }]
    )

    // Cardio config state
    const [cardioType, setCardioType] = useState<'continuous' | 'intervals'>(
        initialData?.cardio_config?.type || 'continuous'
    )
    const [duration, setDuration] = useState(initialData?.cardio_config?.duration || 30)
    const [intensity, setIntensity] = useState<'low' | 'medium' | 'high' | 'hiit'>(
        initialData?.cardio_config?.intensity || 'medium'
    )
    const [workTime, setWorkTime] = useState(initialData?.cardio_config?.work_time || 30)
    const [restTime, setRestTime] = useState(initialData?.cardio_config?.rest_time || 60)
    const [rounds, setRounds] = useState(initialData?.cardio_config?.rounds || 10)

    // Autocomplete state
    const [exercisesList, setExercisesList] = useState<any[]>([])
    const [openCombobox, setOpenCombobox] = useState(false)

    const isCardio = normalizeText(category || '').includes('cardio')

    const fetchExercises = async () => {
        try {
            const { exercises } = await searchExercises('', 2000, 0)
            setExercisesList(exercises || [])
        } catch (error) {
            console.error('Error loading exercises', error)
            setExercisesList([])
        }
    }

    useEffect(() => {
        fetchExercises()
    }, [])

    const handleAddSet = () => {
        const lastSet = sets[sets.length - 1]
        setSets([...sets, { ...lastSet }])
    }

    const handleRemoveSet = (index: number) => {
        if (sets.length > 1) {
            setSets(sets.filter((_, i) => i !== index))
        }
    }

    const updateSet = (index: number, field: string, value: string) => {
        const newSets = [...sets]
        newSets[index] = { ...newSets[index], [field]: value }
        setSets(newSets)
    }

    const handleSubmit = () => {
        if (!name) return

        if (isCardio) {
            onSave({
                exercise_id: exerciseId || undefined,
                name: name,
                category: 'Cardio',
                gif_url: gifUrl || undefined,
                instructions: instructions.length > 0 ? instructions : undefined,
                cardio_config: {
                    type: cardioType,
                    duration: cardioType === 'continuous' ? duration : undefined,
                    intensity,
                    work_time: cardioType === 'intervals' ? workTime : undefined,
                    rest_time: cardioType === 'intervals' ? restTime : undefined,
                    rounds: cardioType === 'intervals' ? rounds : undefined
                }
            })
        } else {
            onSave({
                exercise_id: exerciseId || undefined,
                name: name,
                muscle_group: muscleGroup || undefined,
                gif_url: gifUrl || undefined,
                instructions: instructions.length > 0 ? instructions : undefined,
                sets_detail: sets
            })
        }
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Popover open={openCombobox} onOpenChange={setOpenCombobox} modal={false}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCombobox}
                            className={`w-full justify-between font-normal text-left ${!name ? 'text-muted-foreground' : ''}`}
                        >
                            {name || "Buscar ejercicio..."}
                            <ArrowUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[600px] p-0" align="start">
                        <Command filter={(value, search) => {
                            const normalizedValue = normalizeText(value)
                            const normalizedSearch = normalizeText(search)
                            return normalizedValue.includes(normalizedSearch) ? 1 : 0
                        }}>
                            <CommandInput placeholder="Buscar por nombre o grupo muscular..." />
                            <CommandList
                                className="max-h-[300px] overflow-y-auto custom-scrollbar"
                                onWheel={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <CommandEmpty className="py-2 px-4 text-sm text-gray-500">
                                    <p>No encontrado.</p>
                                    <Button
                                        variant="ghost"
                                        className="h-auto p-0 text-primary font-medium hover:text-primary hover:bg-transparent"
                                        onClick={() => {
                                        }}
                                    >
                                        No hay ejercicios con ese nombre
                                    </Button>
                                </CommandEmpty>
                                <CommandGroup>
                                    {exercisesList.map((ex) => (
                                        <CommandItem
                                            key={ex.id}
                                            value={`${ex.name} ${ex.main_muscle_group || ''}`}
                                            onSelect={() => {
                                                setName(ex.name)
                                                setExerciseId(ex.id)
                                                setMuscleGroup(ex.main_muscle_group || '')
                                                setCategory(ex.category || '')
                                                setGifUrl(ex.gif_url || '')
                                                setInstructions(ex.instructions || [])
                                                setOpenCombobox(false)
                                            }}
                                        >
                                            <Tick01Icon
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    exerciseId === ex.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <div className="flex items-center justify-between w-full">
                                                <span>{ex.name}</span>
                                                {ex.main_muscle_group && (
                                                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getMuscleGroupColor(ex.main_muscle_group)}`}>
                                                        {ex.main_muscle_group}
                                                    </span>
                                                )}
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {isCardio ? (
                /* Cardio Form */
                <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                        <span className="text-sm font-medium text-orange-700">🏃 Ejercicio de Cardio</span>
                    </div>

                    <div className="space-y-2">
                        <Label>Tipo de Cardio</Label>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={cardioType === 'continuous' ? 'default' : 'outline'}
                                className={cardioType === 'continuous' ? 'bg-primary text-white' : ''}
                                onClick={() => setCardioType('continuous')}
                            >
                                Continuo
                            </Button>
                            <Button
                                type="button"
                                variant={cardioType === 'intervals' ? 'default' : 'outline'}
                                className={cardioType === 'intervals' ? 'bg-primary text-white' : ''}
                                onClick={() => setCardioType('intervals')}
                            >
                                Intervalos
                            </Button>
                        </div>
                    </div>

                    {cardioType === 'continuous' ? (
                        <div className="space-y-2">
                            <Label>Duración (minutos)</Label>
                            <Input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                                min={1}
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Trabajo (seg)</Label>
                                    <Input
                                        type="number"
                                        value={workTime}
                                        onChange={(e) => setWorkTime(parseInt(e.target.value) || 0)}
                                        min={1}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Descanso (seg)</Label>
                                    <Input
                                        type="number"
                                        value={restTime}
                                        onChange={(e) => setRestTime(parseInt(e.target.value) || 0)}
                                        min={1}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Rondas</Label>
                                    <Input
                                        type="number"
                                        value={rounds}
                                        onChange={(e) => setRounds(parseInt(e.target.value) || 0)}
                                        min={1}
                                    />
                                </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Tiempo total: {Math.floor((workTime + restTime) * rounds / 60)} min {((workTime + restTime) * rounds) % 60} seg
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Intensidad</Label>
                        <div className="flex gap-2 flex-wrap">
                            {(['low', 'medium', 'high', 'hiit'] as const).map((level) => (
                                <Button
                                    key={level}
                                    type="button"
                                    variant={intensity === level ? 'default' : 'outline'}
                                    size="sm"
                                    className={intensity === level ? 'bg-primary text-white' : ''}
                                    onClick={() => setIntensity(level)}
                                >
                                    {level === 'low' && 'Baja'}
                                    {level === 'medium' && 'Media'}
                                    {level === 'high' && 'Alta'}
                                    {level === 'hiit' && 'HIIT'}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* Strength Form - Original */
                <div className="space-y-4">
                    <Label className="block mb-1">Series y Cargas</Label>
                    <div className="border rounded-md overflow-y-auto bg-background max-h-[300px] custom-scrollbar">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead className="w-[60px]">Series</TableHead>
                                    <TableHead className="text-center">Repeticiones</TableHead>
                                    <TableHead className="text-center">Peso</TableHead>
                                    <TableHead className="text-center">Descanso</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sets.map((set, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium text-center">{index + 1}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center">
                                                <Input
                                                    className="h-8 w-16 text-center border rounded-md bg-muted/30"
                                                    value={set.reps}
                                                    onChange={(e) => updateSet(index, 'reps', e.target.value)}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Input
                                                    className="h-8 w-16 text-center border rounded-md bg-muted/30"
                                                    value={set.weight}
                                                    onChange={(e) => updateSet(index, 'weight', e.target.value)}
                                                />
                                                <span className="text-sm text-muted-foreground">kg</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Input
                                                    className="h-8 w-16 text-center border rounded-md bg-muted/30"
                                                    value={set.rest}
                                                    onChange={(e) => updateSet(index, 'rest', e.target.value)}
                                                />
                                                <span className="text-sm text-muted-foreground">min</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:bg-red-50"
                                                    onClick={() => handleRemoveSet(index)}
                                                    disabled={sets.length === 1}
                                                >
                                                    <Delete02Icon className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <Button variant="outline" className="w-full mt-2" onClick={handleAddSet}>
                        <PlusSignIcon className="h-4 w-4 mr-2" /> Agregar serie
                    </Button>
                </div>
            )}

            <div className="flex justify-between items-center pt-4">
                <Button
                    variant="outline"
                    onClick={onCancel}
                >
                    Atras
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={!name}
                    className="bg-primary hover:bg-primary/90 text-white"
                >
                    {initialData ? 'Guardar cambios' : 'Agregar ejercicio'}
                </Button>
            </div>
        </div>
    )
}
