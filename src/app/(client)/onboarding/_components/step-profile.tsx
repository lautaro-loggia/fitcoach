'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateBasicProfile } from '@/actions/client-onboarding'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function StepProfile({ client, onNext }: { client: any, onNext: () => void }) {
    const [loading, setLoading] = useState(false)

    // Pre-fill if exists
    const [formData, setFormData] = useState({
        birth_date: client.birth_date ? new Date(client.birth_date).toISOString().split('T')[0] : '',
        height: client.height || '',
        weight: client.current_weight || client.initial_weight || '',
        gender: client.gender || ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await updateBasicProfile({
                birth_date: formData.birth_date,
                height: Number(formData.height),
                weight: Number(formData.weight)
            })

            if (res.error) {
                toast.error(res.error)
            } else {
                onNext()
            }
        } catch (err) {
            toast.error('Ocurrió un error al guardar')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold">Perfil Básico</h2>
                <p className="text-gray-500 text-sm">Estos datos son fundamentales para calcular tus requerimientos.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="gender">Sexo Biológico</Label>
                    <Select
                        value={formData.gender}
                        onValueChange={v => setFormData({ ...formData, gender: v })}
                        required
                    >
                        <SelectTrigger id="gender">
                            <SelectValue placeholder="Seleccioná..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="male">Masculino</SelectItem>
                            <SelectItem value="female">Femenino</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">Necesario para fórmulas de grasa corporal.</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="dob">Fecha de Nacimiento</Label>
                    <Input
                        id="dob"
                        type="date"
                        required
                        value={formData.birth_date}
                        onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="height">Altura (cm)</Label>
                        <Input
                            id="height"
                            type="number"
                            placeholder="175"
                            required
                            min={100}
                            max={250}
                            value={formData.height}
                            onChange={e => setFormData({ ...formData, height: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="weight">Peso Actual (kg)</Label>
                        <Input
                            id="weight"
                            type="number"
                            placeholder="70.5"
                            required
                            step="0.1"
                            min={30}
                            max={300}
                            value={formData.weight}
                            onChange={e => setFormData({ ...formData, weight: e.target.value })}
                        />
                    </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Guardar y Continuar
                </Button>
            </form>
        </div>
    )
}
