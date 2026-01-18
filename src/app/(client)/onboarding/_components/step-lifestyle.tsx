'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateLifestyle } from '@/actions/client-onboarding'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function StepLifestyle({ client, onNext, onPrev }: { client: any, onNext: () => void, onPrev: () => void }) {
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        activity_level: client.activity_level || 'sedentary',
        work_type: client.work_type || 'sedentary', // Default matching select values
        training_days: client.training_availability?.days_per_week?.toString() || '3'
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await updateLifestyle({
                activity_level: formData.activity_level,
                work_type: formData.work_type,
                training_days: Number(formData.training_days)
            })

            if (res.error) {
                toast.error(res.error)
            } else {
                onNext()
            }
        } catch (err) {
            toast.error('Error al guardar')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold">Estilo de Vida</h2>
                <p className="text-gray-500 text-sm">Para adaptar el plan a tu día a día.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                <div className="space-y-3">
                    <Label className="text-base">Nivel de Actividad (fuera del gym)</Label>
                    <RadioGroup
                        value={formData.activity_level}
                        onValueChange={val => setFormData({ ...formData, activity_level: val })}
                        className="flex flex-col space-y-1"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="sedentary" id="sedd" />
                            <Label htmlFor="sedd" className="font-normal">Sedentario (Poco movimiento)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="light" id="light" />
                            <Label htmlFor="light" className="font-normal">Ligero (1-3 días actividad)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="moderate" id="mod" />
                            <Label htmlFor="mod" className="font-normal">Moderado (3-5 días actividad)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="active" id="high" />
                            <Label htmlFor="high" className="font-normal">Alto (6-7 días intenso)</Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="space-y-3">
                    <Label className="text-base">Tipo de Trabajo</Label>
                    <Select
                        value={formData.work_type}
                        onValueChange={(val) => setFormData({ ...formData, work_type: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccioná..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="sedentary">Oficina / Sedentario</SelectItem>
                            <SelectItem value="mixed">Mixto (Parado/Sentado)</SelectItem>
                            <SelectItem value="physical">Físico / Activo</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label className="text-base">Días de entrenamiento disponibles</Label>
                    <Select
                        value={formData.training_days}
                        onValueChange={(val) => setFormData({ ...formData, training_days: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Días por semana" />
                        </SelectTrigger>
                        <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7].map(d => (
                                <SelectItem key={d} value={d.toString()}>{d} días</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={onPrev} disabled={loading} className="w-1/3">
                        Atrás
                    </Button>
                    <Button type="submit" className="w-2/3" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Siguiente
                    </Button>
                </div>
            </form>
        </div>
    )
}
