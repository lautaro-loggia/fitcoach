'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PlusSignIcon, Cancel01Icon, DragDropVerticalIcon, PencilEdit02Icon, Delete02Icon, Tick01Icon, ArrowUpDownIcon, ArrowLeft01Icon, Search01Icon, ArrowUp01Icon, ArrowDown01Icon, MinusSignIcon } from 'hugeicons-react'
import { ExerciseSelector } from './exercise-selector'
import { createWorkoutAction, updateWorkoutAction } from '@/app/(dashboard)/workouts/actions'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { createClient } from '@/lib/supabase/client'
import { cn, normalizeText } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '@/components/ui/drawer'



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
    const [isMobile, setIsMobile] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

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
    const [exercises, setExercises] = useState<any[]>([])

    // Exercise Form State
    const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null)
    const [isAddingNewExercise, setIsAddingNewExercise] = useState(false)

    useEffect(() => {
        if (isOpen) {
            if (existingWorkout) {
                setName(existingWorkout.name)
                setExercises(Array.isArray(existingWorkout.structure) ? JSON.parse(JSON.stringify(existingWorkout.structure)) : [])
            } else {
                resetForm()
            }
        }
    }, [isOpen, existingWorkout])

    const resetForm = () => {
        setName('')
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
            result = await updateWorkoutAction(existingWorkout.id, name, '', exercises)
        } else {
            result = await createWorkoutAction({
                name,
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

    const moveExercise = (index: number, direction: 'up' | 'down') => {
        const newExercises = [...exercises]
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= newExercises.length) return

        const [movedItem] = newExercises.splice(index, 1)
        newExercises.splice(targetIndex, 0, movedItem)
        setExercises(newExercises)
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
            <DialogContent
                showCloseButton={!isMobile}
                className={cn(
                    "sm:max-w-[800px] max-h-[90vh] overflow-y-auto",
                    isMobile && "!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !w-full !h-full !max-w-none !max-h-none rounded-none p-0 flex flex-col border-none shadow-none z-[60]"
                )}
            >
                {!isMobile && (
                    <DialogHeader>
                        <DialogTitle>
                            {isEditingExercise
                                ? (editingExerciseIndex !== null ? 'Editar ejercicio' : 'Agregar Ejercicio')
                                : (existingWorkout ? 'Editar Rutina de Entrenamiento' : 'Crear Rutina de Entrenamiento')
                            }
                        </DialogTitle>
                    </DialogHeader>
                )}

                {isMobile ? (
                    <div className="flex flex-col h-full bg-background overflow-hidden">
                        <DialogHeader className="p-4 border-b flex-row items-center justify-between space-y-0 sticky top-0 bg-background z-20">
                            <DialogTitle className="text-xl font-bold">
                                {existingWorkout ? 'Editar rutina' : 'Nueva rutina'}
                            </DialogTitle>
                            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-10 w-10">
                                <Cancel01Icon className="h-6 w-6" />
                            </Button>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
                            {/* Drawer for Exercise Form (Mobile Only) */}
                            {isMobile && (
                                <Drawer
                                    open={isEditingExercise}
                                    onOpenChange={(open) => {
                                        if (!open) {
                                            setEditingExerciseIndex(null)
                                            setIsAddingNewExercise(false)
                                        }
                                    }}
                                >
                                    <DrawerContent className="h-[90vh] flex flex-col z-[70]">
                                        <DrawerHeader className="border-b shrink-0">
                                            <DrawerTitle>
                                                {editingExerciseIndex !== null ? 'Editar ejercicio' : 'Agregar ejercicio'}
                                            </DrawerTitle>
                                        </DrawerHeader>
                                        <div className="flex-1 overflow-y-auto p-4">
                                            <ExerciseForm
                                                initialData={editingExerciseIndex !== null ? exercises[editingExerciseIndex] : undefined}
                                                onSave={handleSaveExercise}
                                                onCancel={() => {
                                                    setEditingExerciseIndex(null)
                                                    setIsAddingNewExercise(false)
                                                }}
                                                isMobile={true}
                                            />
                                        </div>
                                    </DrawerContent>
                                </Drawer>
                            )}

                            {/* Datos de la rutina */}
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="mobile-name" className="text-sm font-medium">Nombre de la rutina</Label>
                                    <Input
                                        id="mobile-name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ej: Pierna Hipertrofia A"
                                        className="h-12 text-base rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Ejercicios */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-lg">Ejercicios</h3>
                                    <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                        {exercises.length} {exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
                                    </span>
                                </div>

                                {exercises.length === 0 && !isAddingNewExercise ? (
                                    <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl gap-4 bg-muted/20">
                                        <p className="text-muted-foreground font-medium">Todavía no agregaste ejercicios</p>
                                        <Button
                                            onClick={() => {
                                                setEditingExerciseIndex(null)
                                                setIsAddingNewExercise(true)
                                            }}
                                            className="rounded-full px-6 h-12"
                                        >
                                            ➕ Agregar ejercicio
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {exercises.map((ex, index) => (
                                            <div key={index}>
                                                {/* Mobile: Exercise rendering is handled by the list below, editing via Drawer */}
                                                <div className="bg-card p-4 rounded-2xl border shadow-sm flex flex-col gap-3 active:scale-[0.98] transition-all">
                                                    <div className="flex justify-between items-start">
                                                        <div className="space-y-1 flex-1 pr-2" onClick={() => {
                                                            setIsAddingNewExercise(false)
                                                            setEditingExerciseIndex(index)
                                                        }}>
                                                            <p className="font-bold text-base leading-tight">{ex.name}</p>
                                                            <div className="flex flex-wrap gap-2 items-center">
                                                                <p className="text-sm text-muted-foreground font-medium">
                                                                    {ex.category === 'Cardio' ? (
                                                                        ex.cardio_config?.type === 'continuous' ?
                                                                            `${ex.cardio_config.duration} min · Int. ${ex.cardio_config.intensity === 'low' ? 'Baja' :
                                                                                ex.cardio_config.intensity === 'medium' ? 'Media' :
                                                                                    ex.cardio_config.intensity === 'high' ? 'Alta' : 'HIIT'
                                                                            }` :
                                                                            `${ex.cardio_config.rounds} rondas · ${ex.cardio_config.work_time}s/${ex.cardio_config.rest_time}s`
                                                                    ) : (() => {
                                                                        const setsDetail = ex.sets_detail || []
                                                                        const count = setsDetail.length || ex.sets || 0
                                                                        const reps = setsDetail.length > 0 ? setsDetail.map((s: any) => parseInt(s.reps) || 0) : [parseInt(ex.reps) || 0]
                                                                        const weights = setsDetail.length > 0 ? setsDetail.map((s: any) => parseFloat(s.weight) || 0) : [parseFloat(ex.weight) || 0]
                                                                        const rests = setsDetail.length > 0 ? setsDetail.map((s: any) => parseInt(s.rest) || 0) : [parseInt(ex.rest) || 0]

                                                                        const minReps = Math.min(...reps)
                                                                        const maxReps = Math.max(...reps)
                                                                        const minWeight = Math.min(...weights)
                                                                        const maxWeight = Math.max(...weights)
                                                                        const avgRest = Math.max(...rests)

                                                                        const repsStr = minReps === maxReps ? `${minReps} reps` : `${minReps}-${maxReps} reps`
                                                                        const weightStr = minWeight === maxWeight ? `${minWeight}kg` : `${minWeight}-${maxWeight}kg`

                                                                        return `${count} series · ${repsStr} · ${weightStr} · ${avgRest}s`
                                                                    })()}
                                                                </p>
                                                                {ex.muscle_group && (
                                                                    <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-full ${getMuscleGroupColor(ex.muscle_group)}`}>
                                                                        {ex.muscle_group}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1 shrink-0">
                                                            <div className="flex flex-col gap-0.5 mr-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => moveExercise(index, 'up')}
                                                                    disabled={index === 0}
                                                                    className="h-7 w-9 text-muted-foreground hover:bg-muted"
                                                                >
                                                                    <ArrowUp01Icon className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => moveExercise(index, 'down')}
                                                                    disabled={index === exercises.length - 1}
                                                                    className="h-7 w-9 text-muted-foreground hover:bg-muted"
                                                                >
                                                                    <ArrowDown01Icon className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => {
                                                                    setIsAddingNewExercise(false)
                                                                    setEditingExerciseIndex(index)
                                                                }}
                                                                className="h-11 w-11 text-primary hover:bg-primary/10 rounded-full"
                                                            >
                                                                <PencilEdit02Icon className="h-5 w-5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRemoveExercise(index)}
                                                                className="h-11 w-11 text-destructive hover:bg-destructive/10 rounded-full"
                                                            >
                                                                <Delete02Icon className="h-5 w-5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Mobile: Add Button triggers Drawer via state, no inline form */}
                                        <Button
                                            variant="outline"
                                            className="w-full h-14 border-dashed border-2 rounded-2xl text-base font-medium flex gap-2 hover:bg-muted/50"
                                            onClick={() => {
                                                setEditingExerciseIndex(null)
                                                setIsAddingNewExercise(true)
                                            }}
                                        >
                                            <PlusSignIcon className="h-5 w-5" /> Agregar ejercicio
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t sticky bottom-0 bg-background z-20 pb-8">
                            <Button
                                onClick={handleSubmit}
                                disabled={loading || !name || exercises.length === 0}
                                className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg active:scale-[0.99] transition-transform"
                            >
                                {loading ? 'Guardando...' : 'Guardar rutina'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    isEditingExercise ? (
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
                )}
            </DialogContent >
        </Dialog >
    )
}

function ExerciseForm({
    initialData,
    onSave,
    onCancel,
    isMobile
}: {
    initialData?: any,
    onSave: (data: any) => void,
    onCancel: () => void,
    isMobile?: boolean
}) {
    const [name, setName] = useState(initialData?.name || '')
    const [exerciseId, setExerciseId] = useState(initialData?.exercise_id || '')
    const [muscleGroup, setMuscleGroup] = useState(initialData?.muscle_group || '')
    const [category, setCategory] = useState(initialData?.category || '')
    const [sets, setSets] = useState<any[]>(
        initialData?.sets_detail || [{ reps: '10', weight: '0', rest: '60' }]
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
            if (isMobile) {
                // Validation: Ensure all sets have reps
                if (sets.some(s => !s.reps)) {
                    alert('Por favor, completa las repeticiones en todas las series.')
                    return
                }

                onSave({
                    exercise_id: exerciseId || undefined,
                    name: name,
                    muscle_group: muscleGroup || undefined,
                    sets_detail: sets,
                    // Legacy support for desktop summary (first set)
                    sets: sets.length.toString(),
                    reps: sets[0]?.reps || '0',
                    weight: sets[0]?.weight || '0',
                    rest: sets[0]?.rest || '0'
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
                                    size={isMobile ? "default" : "sm"}
                                    className={cn(
                                        intensity === level ? 'bg-primary text-white' : '',
                                        isMobile && "flex-1 min-w-[30%] h-11"
                                    )}
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
                /* Strength Form */
                isMobile ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold uppercase text-muted-foreground tracking-wider">Series</Label>
                            <span className="text-xs text-muted-foreground">{sets.length} total</span>
                        </div>

                        {!name ? (
                            <div className="py-8 px-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center gap-2 bg-muted/5">
                                <Search01Icon className="h-8 w-8 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">Elegí un ejercicio arriba para<br />empezar a cargar las series</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    {sets.map((set, index) => (
                                        <div key={index} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4 relative">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white shadow-md">
                                                        {index + 1}
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-900">Serie</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveSet(index)}
                                                    disabled={sets.length === 1}
                                                    className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                >
                                                    <Delete02Icon className="h-4.5 w-4.5" />
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-3 gap-3">
                                                {/* Reps Stepper */}
                                                <div className="flex flex-col gap-2">
                                                    <Label className="text-[10px] font-black text-gray-400 uppercase text-center tracking-wider">Reps</Label>
                                                    <div className="flex items-center bg-gray-50 rounded-2xl p-1 h-14 border border-transparent focus-within:border-primary/20 focus-within:bg-white transition-all">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.preventDefault(); updateSet(index, 'reps', String(Math.max(0, Number(set.reps) - 1))) }}
                                                            className="h-full w-10 flex items-center justify-center text-gray-400 hover:text-primary active:scale-90 transition-transform"
                                                        >
                                                            <MinusSignIcon className="h-4 w-4" />
                                                        </button>
                                                        <Input
                                                            type="number"
                                                            className="h-full flex-1 bg-transparent border-0 text-center font-black text-xl p-0 focus-visible:ring-0 text-gray-900"
                                                            value={set.reps}
                                                            onChange={(e) => updateSet(index, 'reps', e.target.value)}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.preventDefault(); updateSet(index, 'reps', String(Number(set.reps) + 1)) }}
                                                            className="h-full w-10 flex items-center justify-center text-gray-400 hover:text-primary active:scale-90 transition-transform"
                                                        >
                                                            <PlusSignIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Weight Stepper */}
                                                <div className="flex flex-col gap-2">
                                                    <Label className="text-[10px] font-black text-gray-400 uppercase text-center tracking-wider">Kilos</Label>
                                                    <div className="flex items-center bg-gray-50 rounded-2xl p-1 h-14 border border-transparent focus-within:border-primary/20 focus-within:bg-white transition-all">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.preventDefault(); updateSet(index, 'weight', String(Math.max(0, Number(set.weight) - 1.25))) }}
                                                            className="h-full w-10 flex items-center justify-center text-gray-400 hover:text-primary active:scale-90 transition-transform"
                                                        >
                                                            <MinusSignIcon className="h-4 w-4" />
                                                        </button>
                                                        <Input
                                                            type="number"
                                                            className="h-full flex-1 bg-transparent border-0 text-center font-black text-xl p-0 focus-visible:ring-0 text-gray-900"
                                                            value={set.weight}
                                                            onChange={(e) => updateSet(index, 'weight', e.target.value)}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.preventDefault(); updateSet(index, 'weight', String(Number(set.weight) + 1.25)) }}
                                                            className="h-full w-10 flex items-center justify-center text-gray-400 hover:text-primary active:scale-90 transition-transform"
                                                        >
                                                            <PlusSignIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Rest Stepper */}
                                                <div className="flex flex-col gap-2">
                                                    <Label className="text-[10px] font-black text-gray-400 uppercase text-center tracking-wider">Desc.</Label>
                                                    <div className="flex items-center bg-gray-50 rounded-2xl p-1 h-14 border border-transparent focus-within:border-primary/20 focus-within:bg-white transition-all">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.preventDefault(); updateSet(index, 'rest', String(Math.max(0, Number(set.rest) - 10))) }}
                                                            className="h-full w-10 flex items-center justify-center text-gray-400 hover:text-primary active:scale-90 transition-transform"
                                                        >
                                                            <MinusSignIcon className="h-4 w-4" />
                                                        </button>
                                                        <Input
                                                            type="number"
                                                            className="h-full flex-1 bg-transparent border-0 text-center font-black text-xl p-0 focus-visible:ring-0 text-gray-900"
                                                            value={set.rest}
                                                            onChange={(e) => updateSet(index, 'rest', e.target.value)}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.preventDefault(); updateSet(index, 'rest', String(Number(set.rest) + 10)) }}
                                                            className="h-full w-10 flex items-center justify-center text-gray-400 hover:text-primary active:scale-90 transition-transform"
                                                        >
                                                            <PlusSignIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    variant="outline"
                                    className="w-full h-12 border-dashed border-2 rounded-xl text-sm font-bold flex gap-2 hover:bg-muted/50 transition-all active:scale-[0.98]"
                                    onClick={handleAddSet}
                                >
                                    <PlusSignIcon className="h-5 w-5" /> Agregar serie
                                </Button>
                            </>
                        )}
                    </div>
                ) : (
                    /* Strength Form - Original (Desktop) */
                    <div className="space-y-2">
                        <Label className="block mb-2">Series</Label>
                        {!name && (
                            <div className="p-4 mb-2 text-center border-2 border-dashed rounded-lg bg-muted/5 text-sm text-muted-foreground">
                                Selecciona un ejercicio para gestionar las series
                            </div>
                        )}
                        <div className={cn("border rounded-md overflow-hidden bg-background", !name && "opacity-50 pointer-events-none")}>
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
                        <Button
                            variant="outline"
                            className="w-full mt-2"
                            onClick={handleAddSet}
                            disabled={!name}
                        >
                            <PlusSignIcon className="h-4 w-4 mr-2" /> Agregar serie
                        </Button>
                    </div>
                )
            )}

            <div className="flex gap-3 pt-6">
                <Button
                    variant="outline"
                    onClick={onCancel}
                    className={cn(isMobile ? "flex-1 h-12 rounded-xl" : "")}
                >
                    {isMobile ? "Cancelar" : "Atras"}
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={!name}
                    className={cn(
                        "bg-primary hover:bg-primary/90 text-white shadow-md active:scale-[0.98] transition-all",
                        isMobile ? "flex-[2] h-12 rounded-xl font-bold" : ""
                    )}
                >
                    {isMobile ? "Guardar ejercicio" : (initialData ? 'Guardar cambios' : 'Agregar ejercicio')}
                </Button>
            </div>
        </div>
    )
}
