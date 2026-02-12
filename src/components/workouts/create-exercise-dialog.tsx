'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { createExerciseAction } from '@/app/(dashboard)/workouts/actions'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PlusSignIcon } from 'hugeicons-react'

const MUSCLE_GROUPS = [
    'Pecho',
    'Espalda',
    'Hombros',
    'Brazos',
    'Piernas',
    'Abdominales',
    'Cardio',
    'Cuerpo Completo',
    'Otro'
]

interface CreateExerciseDialogProps {
    onSuccess?: (exerciseName: string) => void
    defaultName?: string
}

export function CreateExerciseDialog({ onSuccess, defaultName = '' }: CreateExerciseDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState(defaultName)
    const [muscleGroup, setMuscleGroup] = useState('')
    const [videoUrl, setVideoUrl] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const formData = {
                name,
                muscle_group: muscleGroup,
                video_url: videoUrl || undefined
            }

            const result = await createExerciseAction(formData)

            if (result.error) {
                toast.error("Error", {
                    description: result.error,
                })
            } else {
                toast.success("Ejercicio creado", {
                    description: "El ejercicio se ha agregado correctamente a la base de datos."
                })
                setOpen(false)
                setName('')
                setMuscleGroup('')
                setVideoUrl('')
                if (onSuccess) onSuccess(name)
            }
        } catch (error) {
            console.error(error)
            toast.error("Error", {
                description: "Ocurrió un error inesperado",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start text-muted-foreground">
                    <PlusSignIcon className="mr-2 h-4 w-4" />
                    ¿No encuentras el ejercicio? Créalo aquí
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Crear Nuevo Ejercicio</DialogTitle>
                    <DialogDescription>
                        Agrega un ejercicio personalizado a la base de datos.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre del Ejercicio</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej. Press de Banca Inclinado"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="muscle-group">Grupo Muscular</Label>
                        <Select value={muscleGroup} onValueChange={setMuscleGroup} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un grupo" />
                            </SelectTrigger>
                            <SelectContent>
                                {MUSCLE_GROUPS.map((group) => (
                                    <SelectItem key={group} value={group}>
                                        {group}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="video-url">URL del Video/GIF (Opcional)</Label>
                        <Input
                            id="video-url"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://..."
                            type="url"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Crear Ejercicio
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
