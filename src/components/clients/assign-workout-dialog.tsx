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
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

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

    // Exercise Form State
    const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null)
    const [isAddingNewExercise, setIsAddingNewExercise] = useState(false)

    useEffect(() => {
        if (isOpen) {
            if (existingWorkout) {
                setWorkoutName(existingWorkout.name)
                setExercises(Array.isArray(existingWorkout.structure) ? JSON.parse(JSON.stringify(existingWorkout.structure)) : [])
                setValidUntil(existingWorkout.valid_until ? new Date(existingWorkout.valid_until) : undefined)
                setScheduledDays(existingWorkout.scheduled_days || [])
                setNotes(existingWorkout.notes || '')
                setStep('edit')
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
        setNotes('')
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
        // Calculate summaries
        const summary = {
            sets: exerciseData.sets_detail.length.toString(),
            reps: exerciseData.sets_detail[0]?.reps || '0',
            weight: exerciseData.sets_detail[0]?.weight || '0',
            rest: exerciseData.sets_detail[0]?.rest || '0'
        }

        const newExercise = {
            ...exerciseData,
            ...summary
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
            notes: notes.trim() || undefined
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

                                    <div className="space-y-2 flex flex-col">
                                        <Label>Fecha de revisión *</Label>
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
                                                                    {ex.muscle_group && (
                                                                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                                                                            {ex.muscle_group}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center font-semibold">{ex.sets}</TableCell>
                                                            <TableCell className="text-center">{ex.reps}</TableCell>
                                                            <TableCell className="text-center">{ex.weight}kg</TableCell>
                                                            <TableCell className="text-center">{ex.rest} min</TableCell>
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
    const [sets, setSets] = useState<any[]>(
        initialData?.sets_detail || [{ reps: '10', weight: '40', rest: '1' }]
    )

    // Autocomplete state
    const [exercisesList, setExercisesList] = useState<any[]>([])
    const [openCombobox, setOpenCombobox] = useState(false)

    useEffect(() => {
        fetchExercises()
    }, [])

    const fetchExercises = async () => {
        const supabase = createClient()
        const { data } = await supabase
            .from('exercises')
            .select('id, name, main_muscle_group')
            .order('name')

        if (data) setExercisesList(data)
    }

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

        onSave({
            exercise_id: exerciseId || undefined,
            name: name,
            muscle_group: muscleGroup || undefined,
            sets_detail: sets
        })
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
                    <PopoverContent className="w-[600px] p-0" align="start" style={{ maxHeight: '350px' }}>
                        <Command className="flex flex-col overflow-hidden">
                            <CommandInput placeholder="Buscar por nombre o grupo muscular..." />
                            <CommandList className="flex-1 overflow-y-auto" style={{ maxHeight: '280px' }}>
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
                                                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
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

            <div className="space-y-2">
                <Label className="block mb-2">Ejercicios</Label>
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
