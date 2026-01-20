'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createCheckin } from '../actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, UploadCloud } from 'lucide-react'
import Link from 'next/link'

export function CheckinForm({ initialWeight }: { initialWeight?: number }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        weight: initialWeight || '',
        body_fat: '',
        observations: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.weight) {
            toast.error('El peso es obligatorio')
            return
        }

        setLoading(true)
        try {
            const res = await createCheckin({
                weight: Number(formData.weight),
                body_fat: formData.body_fat ? Number(formData.body_fat) : undefined,
                observations: formData.observations
            })

            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Check-in guardado exitosamente')
                router.push('/dashboard')
            }
        } catch (error) {
            toast.error('Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="weight">Peso Actual (kg) *</Label>
                    <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        placeholder="Ej: 75.5"
                        required
                        value={formData.weight}
                        onChange={e => setFormData({ ...formData, weight: e.target.value })}
                        className="text-lg"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="fat">Porcentaje de Grasa (%)</Label>
                    <Input
                        id="fat"
                        type="number"
                        step="0.1"
                        placeholder="Ej: 18.5 (Opcional)"
                        value={formData.body_fat}
                        onChange={e => setFormData({ ...formData, body_fat: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="obs">Notas / Sensaciones</Label>
                    <Textarea
                        id="obs"
                        placeholder="¿Cómo te sentiste esta semana? ¿Cumpliste la dieta?"
                        value={formData.observations}
                        onChange={e => setFormData({ ...formData, observations: e.target.value })}
                        className="min-h-[100px]"
                    />
                </div>

                <div className="p-4 border-2 border-dashed rounded-lg bg-gray-50 flex flex-col items-center justify-center text-gray-400 gap-2">
                    <UploadCloud className="h-8 w-8" />
                    <span className="text-sm font-medium">Fotos (Próximamente)</span>
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <Link href="/dashboard" className="w-1/3">
                    <Button type="button" variant="outline" className="w-full">
                        Cancelar
                    </Button>
                </Link>
                <Button type="submit" className="w-2/3" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Guardar Check-in
                </Button>
            </div>
        </form>
    )
}
