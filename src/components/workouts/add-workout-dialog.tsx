'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, X, GripVertical, Pencil, Trash2, Check, ChevronsUpDown, ArrowLeft } from 'lucide-react'
import { ExerciseSelector } from './exercise-selector'
import { createWorkoutAction, updateWorkoutAction } from '@/app/(dashboard)/workouts/actions'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

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
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Entrenamiento
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditingExercise
                            ? (editingExerciseIndex !== null ? 'Editar ejercicio' : 'Nuevo ejercicio')
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
                            <Label>Ejercicios</Label>
                            <div className="border rounded-md overflow-hidden bg-background">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-[40%]">Nombre del ejercicio</TableHead>
                                            <TableHead>Series</TableHead>
                                            <TableHead>Repes</TableHead>
                                            <TableHead>Peso</TableHead>
                                            <TableHead>Descanso</TableHead>
                                            <TableHead className="text-right w-[100px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {exercises.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                                    No hay ejercicios agregados
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            exercises.map((ex, index) => (
                                                <TableRow key={index} className="group">
                                                    <TableCell className="font-medium">{ex.name}</TableCell>
                                                    <TableCell>{ex.sets}</TableCell>
                                                    <TableCell>{ex.reps}</TableCell>
                                                    <TableCell>{ex.weight}kg</TableCell>
                                                    <TableCell>{ex.rest} min</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
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
            .select('id, name')
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
            sets_detail: sets
        })
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label>Nombre del ejercicio</Label>
                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCombobox}
                            className="w-full justify-between font-normal text-left"
                        >
                            {name || "Buscar o escribir nombre..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[600px] p-0" align="start">
                        <Command>
                            <CommandInput placeholder="Buscar ejercicio..." />
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
                            <CommandGroup className="max-h-[300px] overflow-y-auto">
                                {exercisesList.map((ex) => (
                                    <CommandItem
                                        key={ex.id}
                                        value={ex.name}
                                        onSelect={() => {
                                            setName(ex.name)
                                            setExerciseId(ex.id)
                                            setOpenCombobox(false)
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                exerciseId === ex.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {ex.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
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
                                <TableHead className="text-center">Repes</TableHead>
                                <TableHead className="text-center">Peso</TableHead>
                                <TableHead className="text-center">Descanso</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sets.map((set, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium text-center">{index + 1}</TableCell>
                                    <TableCell>
                                        <Input
                                            className="h-8 border-0 bg-transparent focus-visible:ring-0 focus-visible:bg-muted/50 p-0 text-center"
                                            value={set.reps}
                                            onChange={(e) => updateSet(index, 'reps', e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-1">
                                            <Input
                                                className="h-8 w-12 border-0 bg-transparent focus-visible:ring-0 focus-visible:bg-muted/50 p-0 text-right"
                                                value={set.weight}
                                                onChange={(e) => updateSet(index, 'weight', e.target.value)}
                                            />
                                            <span className="text-sm text-muted-foreground">kg</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-1">
                                            <Input
                                                className="h-8 w-12 border-0 bg-transparent focus-visible:ring-0 focus-visible:bg-muted/50 p-0 text-right"
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
