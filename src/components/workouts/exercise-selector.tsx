'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

interface ExerciseSelectorProps {
    onAdd: (exercise: any, details: any) => void
}

export function ExerciseSelector({ onAdd }: ExerciseSelectorProps) {
    const [exercises, setExercises] = useState<any[]>([])
    const [open, setOpen] = useState(false)
    const [selectedExercise, setSelectedExercise] = useState<any>(null)

    // Exercise details states
    const [sets, setSets] = useState('3')
    const [reps, setReps] = useState('10-12')
    const [weight, setWeight] = useState('')
    const [rest, setRest] = useState('90')

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

    const handleAdd = () => {
        if (selectedExercise) {
            onAdd(selectedExercise, {
                sets,
                reps,
                weight, // Replaced rpe with weight
                rest,
            })
            // Reset fields but keep sets/reps as they are often reused
            setSelectedExercise(null)
            // setSets('3') 
            // setReps('10-12')
            setWeight('')
            // setRest('90')
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
                    <PopoverContent className="w-[400px] p-0">
                        <Command>
                            <CommandInput placeholder="Buscar por nombre..." />
                            <CommandEmpty>No se encontraron ejercicios.</CommandEmpty>
                            <CommandGroup className="max-h-[300px] overflow-y-auto">
                                {exercises.map((ex) => (
                                    <CommandItem
                                        key={ex.id}
                                        value={ex.name}
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
                                        <div className="flex flex-col">
                                            <span>{ex.name}</span>
                                            <span className="text-xs text-muted-foreground">{ex.main_muscle_group}</span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="sets">Series</Label>
                    <Input
                        id="sets"
                        value={sets}
                        onChange={(e) => setSets(e.target.value)}
                        placeholder="3"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="reps">Reps</Label>
                    <Input
                        id="reps"
                        value={reps}
                        onChange={(e) => setReps(e.target.value)}
                        placeholder="10-12"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="weight">Peso (kg)</Label>
                    <Input
                        id="weight"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="0"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="rest">Descanso (s)</Label>
                    <Input
                        id="rest"
                        value={rest}
                        onChange={(e) => setRest(e.target.value)}
                        placeholder="90"
                    />
                </div>
            </div>

            <Button
                type="button"
                onClick={handleAdd}
                disabled={!selectedExercise}
                className="w-full bg-primary hover:bg-primary/90 text-white"
            >
                <Plus className="mr-2 h-4 w-4" /> Agregar a la rutina
            </Button>
        </div>
    )
}
