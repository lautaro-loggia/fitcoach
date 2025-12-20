'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { createClient } from '@/lib/supabase/client'
import { Plus } from 'lucide-react'

// MVP: We'll put the server action logic here or reuse a general one.
// Better to use Client Side Supabase for this simple insert or a server action.
// The Plan said "Preferir Server Actions".
// I'll create `app/(dashboard)/clients/actions.ts` for this.

export function AddClientDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)

        // We can call a server action here. 
        // For now, I'll inline the supabase client call for speed if I haven't made the action yet, 
        // but I should stick to Server Actions as requested.
        // I'll assume I have `createClientAction` in `actions.ts`.
        // Let's create the action file next.

        // TEMPORARY: using client-side insert for immediate feedback loop, then refactor to server action if needed strictly.
        // Actually, "Preferir Server Actions" is a strong hint. I should do it.
        // I will mock the call here and implement the action in the next step.

        const { createClientAction } = await import('@/app/(dashboard)/clients/actions')
        const result = await createClientAction(formData)

        if (result?.error) {
            alert(result.error) // MVP Error handling
        } else {
            setOpen(false)
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
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

                    {/* Datos corporales iniciales */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="initial_weight">Peso inicial (kg) *</Label>
                            <Input id="initial_weight" name="initial_weight" type="number" step="0.1" required />
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
                            <Select name="goal_specific">
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
                            <Select name="activity_level">
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
                        <Select name="work_type">
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
                        <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading} className="bg-primary text-white hover:bg-primary/90">
                            {loading ? 'Guardando...' : 'Crear asesorado'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
