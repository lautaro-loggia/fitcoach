'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, X, GripVertical, Save, ArrowLeft, Pencil, CalendarIcon } from 'lucide-react'
import { ExerciseSelector } from '@/components/workouts/exercise-selector'
import { createClient } from '@/lib/supabase/client'
import { assignWorkoutAction, updateAssignedWorkoutAction } from '@/app/(dashboard)/clients/[id]/training-actions'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface AssignWorkoutDialogProps {
    clientId: string
    existingWorkout?: any // If provided, it's edit mode
    trigger?: React.ReactNode // Custom trigger button
}

export function AssignWorkoutDialog({ clientId, existingWorkout, trigger }: AssignWorkoutDialogProps) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<'select' | 'edit'>('select')
    const [loading, setLoading] = useState(false)

    // Templates state
    const [templates, setTemplates] = useState<any[]>([])
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')

    // Editor state
    const [workoutName, setWorkoutName] = useState('')
    const [exercises, setExercises] = useState<any[]>([])
    const [validUntil, setValidUntil] = useState<Date | undefined>(undefined)

    useEffect(() => {
        if (open) {
            if (existingWorkout) {
                // Edit mode: Load existing data
                setWorkoutName(existingWorkout.name)
                setExercises(Array.isArray(existingWorkout.structure) ? JSON.parse(JSON.stringify(existingWorkout.structure)) : [])
                setValidUntil(existingWorkout.valid_until ? new Date(existingWorkout.valid_until) : undefined)
                setStep('edit')
            } else {
                // New mode
                fetchTemplates()
                setStep('select')
                resetEditor()
            }
        }
    }, [open, existingWorkout])

    const fetchTemplates = async () => {
        const supabase = createClient()
        const { data } = await supabase
            .from('workouts')
            .select('*')
            .order('name')
        if (data) setTemplates(data)
    }

    const resetEditor = () => {
        setWorkoutName('')
        setExercises([])
        setSelectedTemplateId('')
        setValidUntil(undefined)
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

    const handleAddExercise = (exercise: any, details: any) => {
        setExercises([...exercises, {
            exercise_id: exercise.id,
            name: exercise.name,
            ...details
        }])
    }

    const handleRemoveExercise = (index: number) => {
        setExercises(exercises.filter((_, i) => i !== index))
    }

    const handleSave = async () => {
        setLoading(true)

        const payload = {
            clientId,
            name: workoutName,
            exercises,
            validUntil: validUntil ? format(validUntil, 'yyyy-MM-dd') : undefined
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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
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
                        {existingWorkout
                            ? 'Editar Rutina del Cliente'
                            : (step === 'select' ? 'Seleccionar Plantilla' : 'Nueva Rutina para Cliente')
                        }
                    </DialogTitle>
                </DialogHeader>

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
                            <Button
                                onClick={handleSelectTemplate}
                                disabled={!selectedTemplateId}
                                className="w-full"
                            >
                                Continuar con plantilla seleccionada
                            </Button>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">O</span>
                                </div>
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
                                <Input
                                    value={workoutName}
                                    onChange={(e) => setWorkoutName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2 flex flex-col">
                                <Label>Válida hasta (Opcional)</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !validUntil && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {validUntil ? format(validUntil, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={validUntil}
                                            onSelect={setValidUntil}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="space-y-4 border rounded-md p-4 bg-muted/10">
                            <h4 className="font-semibold text-sm">Ejercicios</h4>
                            <div className="space-y-2">
                                {exercises.map((ex, index) => (
                                    <div key={index} className="flex items-center gap-3 p-3 bg-background border rounded-md shadow-sm">
                                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{ex.name}</p>
                                            <div className="flex gap-2 text-xs text-muted-foreground">
                                                <span className="bg-muted px-1 rounded">{ex.sets} set</span>
                                                <span className="bg-muted px-1 rounded">{ex.reps} reps</span>
                                                {ex.rest && <span>{ex.rest}s descanso</span>}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveExercise(index)}
                                            className="h-8 w-8 text-destructive"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {exercises.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-2">Lista vacía</p>
                                )}
                            </div>

                            <div className="pt-2">
                                <Label className="mb-2 block">Agregar ejercicio</Label>
                                <ExerciseSelector onAdd={handleAddExercise} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={loading || !workoutName}>
                                {loading ? 'Guardando...' : (existingWorkout ? 'Guardar Cambios' : 'Asignar Rutina')}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
