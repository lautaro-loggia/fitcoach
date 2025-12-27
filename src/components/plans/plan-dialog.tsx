'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createPlan, updatePlan, type Plan } from '@/app/(dashboard)/pagos/actions'

interface PlanDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    plan?: Plan | null
    onSuccess: () => void
}

export function PlanDialog({ open, onOpenChange, plan, onSuccess }: PlanDialogProps) {
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState(plan?.name || '')
    const [priceMonthly, setPriceMonthly] = useState(plan?.price_monthly?.toString() || '')
    const [description, setDescription] = useState(plan?.description || '')

    const isEdit = !!plan

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!name || !priceMonthly) {
            toast.error('Por favor completa todos los campos requeridos')
            return
        }

        const price = parseFloat(priceMonthly)
        if (price <= 0) {
            toast.error('El precio debe ser mayor a 0')
            return
        }

        try {
            setLoading(true)

            const result = isEdit
                ? await updatePlan(plan.id, {
                    name,
                    price_monthly: price,
                    description: description || undefined
                })
                : await createPlan({
                    name,
                    price_monthly: price,
                    description: description || undefined
                })

            if (result.error) {
                toast.error(result.error)
                return
            }

            toast.success(`Plan ${isEdit ? 'actualizado' : 'creado'} exitosamente`)
            onOpenChange(false)
            onSuccess()

            // Reset form
            if (!isEdit) {
                setName('')
                setPriceMonthly('')
                setDescription('')
            }
        } catch (error) {
            console.error('Unexpected error:', error)
            toast.error('No se pudo guardar el plan')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Editar Plan' : 'Crear Nuevo Plan'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">Nombre del plan *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Plan Premium"
                                maxLength={50}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="price">Precio mensual *</Label>
                            <Input
                                id="price"
                                type="number"
                                value={priceMonthly}
                                onChange={(e) => setPriceMonthly(e.target.value)}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="description">Descripción (opcional)</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Rutina personalizada + dieta + check-ins semanales"
                                rows={3}
                                maxLength={500}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                {description.length}/500 caracteres
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEdit ? 'Guardar cambios' : 'Crear plan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
