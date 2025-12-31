'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { createClientAction } from '@/app/(dashboard)/clients/actions'

export function AddClientDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        if (searchParams.get('new') === 'true') {
            setOpen(true)
        }
    }, [searchParams])

    // State for Select fields (since Radix Select doesn't support name attribute in forms)
    const [gender, setGender] = useState('')
    const [goalSpecific, setGoalSpecific] = useState('')
    const [activityLevel, setActivityLevel] = useState('')
    const [workType, setWorkType] = useState('')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)

        // Add select values to FormData since they're not automatically included
        formData.set('gender', gender)
        formData.set('goal_specific', goalSpecific)
        formData.set('activity_level', activityLevel)
        formData.set('work_type', workType)

        const result = await createClientAction(formData)

        if (result?.error) {
            alert(result.error)
        } else {
            setOpen(false)
            // Reset form state
            setGender('')
            setGoalSpecific('')
            setActivityLevel('')
            setWorkType('')
            router.refresh()
        }
        setLoading(false)
    }

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) {
            // Reset state when closing
            setGender('')
            setGoalSpecific('')
            setActivityLevel('')
            setWorkType('')
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white">
                    <Plus className="mr-2 h-4 w-4" /> Nuevo asesorado
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nuevo asesorado</DialogTitle>
                    <DialogDescription>
                        Ingresá los datos iniciales del cliente.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="full_name">Nombre completo *</Label>
                            <Input id="full_name" name="full_name" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input id="phone" name="phone" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="birth_date">Fecha de nacimiento</Label>
                            <Input id="birth_date" name="birth_date" type="date" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="gender">Sexo</Label>
                        <Select value={gender} onValueChange={setGender}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="male">Masculino</SelectItem>
                                <SelectItem value="female">Femenino</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Datos corporales iniciales */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="initial_weight">Peso inicial (kg) *</Label>
                            <Input id="initial_weight" name="initial_weight" type="number" step="0.1" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="initial_body_fat">Grasa corporal inicial (%)</Label>
                            <Input id="initial_body_fat" name="initial_body_fat" type="number" step="0.1" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="height">Altura (cm) *</Label>
                            <Input id="height" name="height" type="number" required />
                        </div>
                    </div>

                    {/* Objetivos */}
                    <div className="space-y-2">
                        <Label htmlFor="goal_text">Objetivo personal</Label>
                        <Input id="goal_text" name="goal_text" placeholder="Ej: Quiero sentirme mejor..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="goal_specific">Objetivo estructurado</Label>
                            <Select value={goalSpecific} onValueChange={setGoalSpecific}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="lose_fat">Bajar grasa</SelectItem>
                                    <SelectItem value="gain_muscle">Ganar masa muscular</SelectItem>
                                    <SelectItem value="recomp">Recomposición</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="activity_level">Nivel de actividad</Label>
                            <Select value={activityLevel} onValueChange={setActivityLevel}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sedentary">Sedentario</SelectItem>
                                    <SelectItem value="moderate">Moderado</SelectItem>
                                    <SelectItem value="active">Activo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="work_type">Tipo de trabajo</Label>
                        <Select value={workType} onValueChange={setWorkType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="home_office">Home Office</SelectItem>
                                <SelectItem value="physical">Físico</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Targets */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="target_weight">Peso objetivo (kg) (Opcional)</Label>
                            <Input id="target_weight" name="target_weight" type="number" step="0.1" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="target_fat">Grasa objetivo (%) (Opcional)</Label>
                            <Input id="target_fat" name="target_fat" type="number" step="0.1" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" type="button" onClick={() => handleOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading} className="bg-primary text-white hover:bg-primary/90">
                            {loading ? 'Guardando...' : 'Crear asesorado'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
