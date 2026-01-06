'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check, ChevronsUpDown, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface ExerciseSelectorProps {
    onAdd: (exercise: any, details: any) => void
}

interface SetDetail {
    reps: string
    weight: string
    rest: string
}

export function ExerciseSelector({ onAdd }: ExerciseSelectorProps) {
    const [exercises, setExercises] = useState<any[]>([])
    const [open, setOpen] = useState(false)
    const [selectedExercise, setSelectedExercise] = useState<any>(null)

    // List of sets for the currently selected exercise
    const [sets, setSets] = useState<SetDetail[]>([
        { reps: '10-12', weight: '0', rest: '90' } // Default first set
    ])

    useEffect(() => {
        fetchExercises()
    }, [])

    const fetchExercises = async () => {
        const supabase = createClient()
        const { data } = await supabase
            .from('exercises')
            .select('id, name, main_muscle_group, category')
            .order('name')

        if (data) {
            setExercises(data)
        }
    }

    const handleAddSet = () => {
        // Copy last set values for convenience
        const lastSet = sets[sets.length - 1]
        setSets([...sets, { ...lastSet }])
    }

    const handleRemoveSet = (index: number) => {
        if (sets.length > 1) {
            setSets(sets.filter((_, i) => i !== index))
        }
    }

    const updateSet = (index: number, field: keyof SetDetail, value: string) => {
        const newSets = [...sets]
        newSets[index] = { ...newSets[index], [field]: value }
        setSets(newSets)
    }

    const handleAddToRoutine = () => {
        if (selectedExercise) {
            onAdd(selectedExercise, {
                sets: sets.length.toString(), // Store total count for summary
                reps: sets[0].reps, // Store first set reps as 'general' representation
                weight: sets[0].weight, // Store first set weight as 'general'
                rest: sets[0].rest, // Store first set rest as 'general'
                sets_detail: sets // Store full detail
            })

            // Reset fields
            setSelectedExercise(null)
            setSets([{ reps: '10-12', weight: '0', rest: '90' }])
        }
    }

    return (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <div className="space-y-2">
                <Label>Seleccionar Ejercicio</Label>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between"
                        >
                            {selectedExercise ? selectedExercise.name : "Buscar ejercicio..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" style={{ maxHeight: '350px' }}>
                        <Command className="flex flex-col overflow-hidden">
                            <CommandInput placeholder="Buscar por nombre o grupo muscular..." />
                            <CommandList className="flex-1 overflow-y-auto" style={{ maxHeight: '280px' }}>
                                <CommandEmpty>No se encontraron ejercicios.</CommandEmpty>
                                <CommandGroup>
                                    {exercises.map((ex) => (
                                        <CommandItem
                                            key={ex.id}
                                            value={`${ex.name} ${ex.main_muscle_group || ''}`}
                                            onSelect={() => {
                                                setSelectedExercise(ex)
                                                setOpen(false)
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedExercise?.id === ex.id ? "opacity-100" : "opacity-0"
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

            {selectedExercise && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label>Configuración de Series</Label>
                        <span className="text-xs text-muted-foreground">Define cada serie individualmente</span>
                    </div>

                    <div className="border rounded-md overflow-hidden bg-background">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead className="w-[60px] text-center">Set</TableHead>
                                    <TableHead className="text-center">Repes</TableHead>
                                    <TableHead className="text-center">Peso (kg)</TableHead>
                                    <TableHead className="text-center">Desc (s)</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sets.map((set, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="text-center font-medium">{index + 1}</TableCell>
                                        <TableCell>
                                            <Input
                                                className="h-8 text-center"
                                                value={set.reps}
                                                onChange={(e) => updateSet(index, 'reps', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                className="h-8 text-center"
                                                value={set.weight}
                                                onChange={(e) => updateSet(index, 'weight', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                className="h-8 text-center"
                                                value={set.rest}
                                                onChange={(e) => updateSet(index, 'rest', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveSet(index)}
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                disabled={sets.length === 1}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddSet}
                            className="w-full dashed border-primary/20 text-primary hover:bg-primary/5"
                        >
                            <Plus className="mr-2 h-3 w-3" /> Agregar Serie
                        </Button>
                    </div>
                </div>
            )}

            <Button
                type="button"
                onClick={handleAddToRoutine}
                disabled={!selectedExercise}
                className="w-full bg-primary hover:bg-primary/90 text-white mt-4"
            >
                <Plus className="mr-2 h-4 w-4" /> Agregar a la rutina
            </Button>
        </div>
    )
}
