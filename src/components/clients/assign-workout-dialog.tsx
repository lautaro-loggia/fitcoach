'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, X, GripVertical, Save, ArrowLeft, Pencil, CalendarIcon, Trash2, Check, ChevronsUpDown, ChevronLeft, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { assignWorkoutAction, updateAssignedWorkoutAction } from '@/app/(dashboard)/clients/[id]/training-actions'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { format, parse, addWeeks } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'

// Normalize text to remove accents for search
const normalizeText = (text: string) => {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// Color mapping for muscle groups
const getMuscleGroupColor = (muscleGroup: string) => {
    const colors: Record<string, string> = {
        'Pecho': 'bg-red-100 text-red-700',
        'Espalda': 'bg-blue-100 text-blue-700',
        'Hombros': 'bg-purple-100 text-purple-700',
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
    const [scheduledDays, setScheduledDays] = useState<string[]>([])
    const [notes, setNotes] = useState('')
    const [isPresential, setIsPresential] = useState(false)
    const [startTime, setStartTime] = useState<string>('')
    const [endTime, setEndTime] = useState<string>('')

    // Exercise Form State
    const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null)
    const [isAddingNewExercise, setIsAddingNewExercise] = useState(false)

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
            }
        }
    }, [isOpen, existingWorkout])

    const fetchTemplates = async () => {
        const supabase = createClient()
        const { data } = await supabase.from('workouts').select('*').order('name')
        if (data) setTemplates(data)
    }

    const resetEditor = () => {
        setWorkoutName('')
        setExercises([])
        setSelectedTemplateId('')
        setValidUntil(undefined)
        setScheduledDays([])
        setScheduledDays([])
        setNotes('')
        setIsPresential(false)
        setStartTime('')
        setEndTime('')
    }

    const toggleDay = (day: string) => {
        setScheduledDays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day]
        )
    }

    const handleSelectTemplate = () => {
        if (!selectedTemplateId) return
        const template = templates.find(t => t.id === selectedTemplateId)
        if (template) {
            setWorkoutName(template.name)
            const exList = Array.isArray(template.structure) ? template.structure : []
            setExercises(JSON.parse(JSON.stringify(exList)))
            setStep('edit')
        }
    }

    const handleCreateEmpty = () => {
        setWorkoutName('Nuevo Entrenamiento')
        setExercises([])
        setSelectedTemplateId('')
        setStep('edit')
    }

    const handleSaveExercise = (exerciseData: any) => {
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

    const handleRemoveExercise = (index: number) => {
        setExercises(exercises.filter((_, i) => i !== index))
    }

    const handleSave = async () => {
        if (!validUntil) {
            alert('La fecha de revisión es obligatoria')
            return
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
            alert(result.error)
        } else {
            setOpen(false)
        }
        setLoading(false)
    }

    // Determine current view
    const isEditingExercise = editingExerciseIndex !== null || isAddingNewExercise

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button className="bg-primary hover:bg-primary/90 text-white">
                        <Plus className="mr-2 h-4 w-4" /> Asignar Rutina
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditingExercise
                            ? (editingExerciseIndex !== null ? 'Editar ejercicio' : 'Agregar Ejercicio')
                            : (existingWorkout
                                ? 'Editar Rutina del Cliente'
                                : (step === 'select' ? 'Seleccionar Plantilla' : 'Nueva Rutina para Cliente')
                            )
                        }
                    </DialogTitle>
                    {clientName && (existingWorkout || step === 'edit') && !isEditingExercise && (
                        <div className="flex items-center gap-2 px-3 py-2 mt-2 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-sm">
                            <Info className="h-4 w-4 flex-shrink-0" />
                            <span>Los cambios en esta rutina solo se aplicarán al perfil de <strong>{clientName}</strong>.</span>
                        </div>
                    )}
                </DialogHeader>

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
                            <div className="space-y-6 py-4">
                                <div className="space-y-2">
                                    <Label>Elegir una plantilla existente</Label>
                                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar rutina..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {templates.map(t => (
                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <Button onClick={handleSelectTemplate} disabled={!selectedTemplateId} className="w-full">
                                        Continuar con plantilla seleccionada
                                    </Button>
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">O</span></div>
                                    </div>
                                    <Button variant="outline" onClick={handleCreateEmpty} className="w-full">
                                        Crear desde cero (Vacío)
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {!existingWorkout && (
                                    <div className="flex items-center gap-2 mb-4">
                                        <Button variant="ghost" size="sm" onClick={() => setStep('select')}>
                                            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
                                        </Button>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nombre de la Rutina</Label>
                                        <Input value={workoutName} onChange={(e) => setWorkoutName(e.target.value)} />
                                    </div>

                                    <div className="flex items-center space-x-2 pt-8">
                                        <Switch
                                            id="presential-mode"
                                            checked={isPresential}
                                            onCheckedChange={setIsPresential}
                                        />
                                        <Label htmlFor="presential-mode">Entrenamiento Presencial</Label>
                                    </div>

                                    {isPresential && (
                                        <div className="col-span-1 md:col-span-2 flex gap-4 animate-in slide-in-from-top-2">
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
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2 flex flex-col">
                                        <div className="flex justify-between items-center">
                                            <Label>Fecha de revisión *</Label>
                                            <div className="flex gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                                                    onClick={() => setValidUntil(addWeeks(new Date(), 4))}
                                                >
                                                    4 sem
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                                                    onClick={() => setValidUntil(addWeeks(new Date(), 8))}
                                                >
                                                    8 sem
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                                                    onClick={() => setValidUntil(addWeeks(new Date(), 12))}
                                                >
                                                    12 sem
                                                </Button>
                                            </div>
                                        </div>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !validUntil && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {validUntil ? format(validUntil, "PPP", { locale: es }) : <span>Seleccionar fecha *</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={validUntil} onSelect={setValidUntil} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                {/* Day Selector */}
                                <div className="space-y-2">
                                    <Label>Días asignados</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {DAYS.map(day => (
                                            <Button
                                                key={day}
                                                type="button"
                                                variant={scheduledDays.includes(day) ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => toggleDay(day)}
                                                className={cn(
                                                    scheduledDays.includes(day) ? "bg-primary hover:bg-primary/90 text-white" : ""
                                                )}
                                            >
                                                {day}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="border rounded-lg overflow-hidden bg-background">
                                        <Table>
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
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-destructive hover:bg-red-50"
                                                                        onClick={() => handleRemoveExercise(index)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
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
                                        <Plus className="h-5 w-5" /> Agregar nuevo ejercicio
                                    </Button>
                                </div>

                                {/* Notes field */}
                                <div className="space-y-2">
                                    <Label>Notas (Opcional)</Label>
                                    <Textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Agregar notas o instrucciones especiales..."
                                        rows={3}
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t">
                                    <Button variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
                                    <Button onClick={handleSave} disabled={loading || !workoutName || !validUntil} className="bg-primary hover:bg-primary/90 text-white">
                                        {loading ? 'Guardando...' : (existingWorkout ? 'Guardar rutina' : 'Guardar rutina')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
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

    const isCardio = category === 'Cardio'

    const fetchExercises = async () => {
        const supabase = createClient()
        const { data } = await supabase
            .from('exercises')
            .select('id, name, main_muscle_group, category')
            .order('name')

        if (data) setExercisesList(data)
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
                sets_detail: sets
            })
        }
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCombobox}
                            className={`w-full justify-between font-normal text-left ${!name ? 'text-muted-foreground' : ''}`}
                        >
                            {name || "Buscar ejercicio..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[600px] p-0" align="start">
                        <Command>
                            <CommandInput placeholder="Buscar por nombre o grupo muscular..." />
                            <CommandList style={{ maxHeight: '300px', overflowY: 'auto' }}>
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
                                                setOpenCombobox(false)
                                            }}
                                        >
                                            <Check
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
                <div className="space-y-2">
                    <Label className="block mb-2">Series</Label>
                    <div className="border rounded-md overflow-hidden bg-background">
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
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <Button variant="outline" className="w-full mt-2" onClick={handleAddSet}>
                        <Plus className="h-4 w-4 mr-2" /> Agregar serie
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
