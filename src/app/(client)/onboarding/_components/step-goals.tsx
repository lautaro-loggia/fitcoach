'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateGoals } from '@/actions/client-onboarding'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function StepGoals({ client, onNext, onPrev }: { client: any, onNext: () => void, onPrev: () => void }) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        main_goal: client.main_goal || '',
        goal_specific: client.goal_text || '', // mapped from goal_text
        timeframe: client.goals?.timeframe || '1-3 months',
        target_weight: client.target_weight || '',
        target_fat: client.target_fat || ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await updateGoals({
                main_goal: formData.main_goal,
                goal_specific: formData.goal_specific,
                timeframe: formData.timeframe,
                target_weight: formData.target_weight ? Number(formData.target_weight) : undefined,
                target_fat: formData.target_fat ? Number(formData.target_fat) : undefined
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
                <h2 className="text-2xl font-bold">Tus Objetivos</h2>
                <p className="text-gray-500 text-sm">Contanos a dónde querés llegar.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label>Objetivo Principal</Label>
                    <Select
                        value={formData.main_goal}
                        onValueChange={(val) => setFormData({ ...formData, main_goal: val })}
                        required
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccioná un objetivo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="fat_loss">Pérdida de grasa</SelectItem>
                            <SelectItem value="muscle_gain">Ganancia muscular</SelectItem>
                            <SelectItem value="recomp">Recomposición corporal</SelectItem>
                            <SelectItem value="performance">Rendimiento</SelectItem>
                            <SelectItem value="health">Salud general</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Plazo estimado</Label>
                    <Select
                        value={formData.timeframe}
                        onValueChange={(val) => setFormData({ ...formData, timeframe: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccioná plazo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1-3 months">1 - 3 Meses</SelectItem>
                            <SelectItem value="3-6 months">3 - 6 Meses</SelectItem>
                            <SelectItem value="6+ months">Más de 6 Meses</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Objetivo personal (Opcional)</Label>
                    <Textarea
                        placeholder="Ej: Quiero entrar en mi vestido para el casamiento..."
                        value={formData.goal_specific}
                        onChange={e => setFormData({ ...formData, goal_specific: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Peso Meta (kg) (Opcional)</Label>
                        <Input
                            type="number"
                            step="0.1"
                            value={formData.target_weight}
                            onChange={e => setFormData({ ...formData, target_weight: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>% Grasa Meta (Opcional)</Label>
                        <Input
                            type="number"
                            step="0.1"
                            value={formData.target_fat}
                            onChange={e => setFormData({ ...formData, target_fat: e.target.value })}
                        />
                    </div>
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
