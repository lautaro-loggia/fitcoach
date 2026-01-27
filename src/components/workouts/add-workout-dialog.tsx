'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PlusSignIcon, Cancel01Icon, DragDropVerticalIcon, PencilEdit02Icon, Delete02Icon, Tick01Icon, ArrowUpDownIcon, ArrowLeft01Icon, Search01Icon } from 'hugeicons-react'
import { ExerciseSelector } from './exercise-selector'
import { createWorkoutAction, updateWorkoutAction } from '@/app/(dashboard)/workouts/actions'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

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

interface WorkoutDialogProps {
    existingWorkout?: any
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function WorkoutDialog({
    existingWorkout,
    trigger,
    open: controlledOpen,
    onOpenChange: setControlledOpen
}: WorkoutDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        if (searchParams.get('new') === 'true' && !existingWorkout) {
            setInternalOpen(true)
        }
    }, [searchParams, existingWorkout])

    // Derived state for open status
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
    const setOpen = (val: boolean) => {
        setInternalOpen(val)
        if (setControlledOpen) setControlledOpen(val)
        if (!val) {
            // Reset on close if needed, but usually useEffect handles it when reopening with different props
        }
    }

    const [loading, setLoading] = useState(false)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [exercises, setExercises] = useState<any[]>([])

    // Exercise Form State
    const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null)
    const [isAddingNewExercise, setIsAddingNewExercise] = useState(false)

    useEffect(() => {
        if (isOpen) {
            if (existingWorkout) {
                setName(existingWorkout.name)
                setDescription(existingWorkout.description || '')
                setExercises(Array.isArray(existingWorkout.structure) ? JSON.parse(JSON.stringify(existingWorkout.structure)) : [])
            } else {
                resetForm()
            }
        }
    }, [isOpen, existingWorkout])

    const resetForm = () => {
        setName('')
        setDescription('')
        setExercises([])
        setEditingExerciseIndex(null)
        setIsAddingNewExercise(false)
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

    const handleSubmit = async () => {
        setLoading(true)

        let result
        if (existingWorkout) {
            result = await updateWorkoutAction(existingWorkout.id, name, description, exercises)
        } else {
            result = await createWorkoutAction({
                name,
                description,
                exercises
            })
        }

        if (result?.error) {
            alert(result.error)
        } else {
            setOpen(false)
            resetForm()
            router.refresh()
        }
        setLoading(false)
    }

    const isEditingExercise = editingExerciseIndex !== null || isAddingNewExercise

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button className="bg-primary hover:bg-primary/90 text-white">
                        <PlusSignIcon className="mr-2 h-4 w-4" /> Nuevo Entrenamiento
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditingExercise
                            ? (editingExerciseIndex !== null ? 'Editar ejercicio' : 'Agregar Ejercicio')
                            : (existingWorkout ? 'Editar Rutina de Entrenamiento' : 'Crear Rutina de Entrenamiento')
                        }
                    </DialogTitle>
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
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre de la Rutina</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej: Pierna Hipertrofia A"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Descripción (Opcional)</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Breve descripción del entrenamiento..."
                                    rows={2}
                                />
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
                                                                <PencilEdit02Icon className="h-4 w-4" />
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

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={loading || !name}
                                className="bg-primary text-white hover:bg-primary/90"
                            >
                                {loading ? 'Guardando...' : 'Guardar Rutina'}
                            </Button>
                        </div>
                    </div>
                )
                }
            </DialogContent >
        </Dialog >
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
    const [searchQuery, setSearchQuery] = useState('')

    const isCardio = category === 'Cardio'

    // Filter exercises based on search query (accent-insensitive)
    const filteredExercises = exercisesList.filter((ex) => {
        const query = normalizeText(searchQuery)
        return normalizeText(ex.name).includes(query) ||
            (normalizeText(ex.main_muscle_group || '').includes(query))
    })

    useEffect(() => {
        fetchExercises()
    }, [])

    const fetchExercises = async () => {
        const supabase = createClient()
        const { data } = await supabase
            .from('exercises')
            .select('id, name, main_muscle_group, category')
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
            <div className="space-y-2 relative">
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className={`w-full justify-between font-normal text-left ${!name ? 'text-muted-foreground' : ''}`}
                    onClick={() => setOpenCombobox(!openCombobox)}
                >
                    {name || "Buscar ejercicio..."}
                    <ArrowUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>

                {openCombobox && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg">
                        <div className="flex items-center gap-2 border-b px-3 py-2">
                            <Search01Icon className="h-4 w-4 shrink-0 opacity-50" />
                            <input
                                className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                placeholder="Buscar por nombre o grupo muscular..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div
                            style={{
                                maxHeight: '250px',
                                overflowY: 'auto',
                                overflowX: 'hidden'
                            }}
                        >
                            <div className="p-1">
                                {filteredExercises.length === 0 ? (
                                    <div className="py-6 text-center text-sm text-muted-foreground">
                                        No se encontraron ejercicios.
                                    </div>
                                ) : (
                                    filteredExercises.map((ex) => (
                                        <div
                                            key={ex.id}
                                            className={cn(
                                                "relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                                exerciseId === ex.id && "bg-accent"
                                            )}
                                            onClick={() => {
                                                setName(ex.name)
                                                setExerciseId(ex.id)
                                                setMuscleGroup(ex.main_muscle_group || '')
                                                setCategory(ex.category || '')
                                                setOpenCombobox(false)
                                                setSearchQuery('')
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
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
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
                                            <div className="flex justify-end gap-1">
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
