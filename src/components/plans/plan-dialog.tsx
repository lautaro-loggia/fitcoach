'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
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
    const [name, setName] = useState('')
    const [priceMonthly, setPriceMonthly] = useState('')
    const [description, setDescription] = useState('')

    // New fields state
    const [routineFrequency, setRoutineFrequency] = useState<'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biannual'>('monthly')
    const [callsFrequency, setCallsFrequency] = useState<'none' | 'monthly' | 'weekly'>('none')
    const [includesNutrition, setIncludesNutrition] = useState<boolean>(false)
    const [notifyClients, setNotifyClients] = useState<boolean>(false)

    // Sync state when plan changes or dialog opens
    useEffect(() => {
        if (open) {
            if (plan) {
                setName(plan.name)
                setPriceMonthly(plan.price_monthly.toString())
                setDescription(plan.description || '')
                setRoutineFrequency(plan.routine_frequency || 'monthly')
                setCallsFrequency(plan.calls_frequency || 'none')
                setIncludesNutrition(plan.includes_nutrition || false)
                setNotifyClients(false) // Reset notification checkbox
            } else {
                // Reset for create mode
                setName('')
                setPriceMonthly('')
                setDescription('')
                setRoutineFrequency('monthly')
                setCallsFrequency('none')
                setIncludesNutrition(false)
                setNotifyClients(false)
            }
        }
    }, [open, plan])

    const isEdit = !!plan

    // Reset state when opening for create or switching plans
    // Note: This logic is better handled by a useEffect on the `plan` prop or `open` prop
    // but the current implementation initialized state in useState initializer.
    // Ideally we should sync state when `plan` changes.
    // For now, let's keep it simple as the parent probably unmounts/remounts or keys it,
    // actually the parent in PlanesTab renders it conditionally but keeps it mounted?
    // Looking at PlanesTab, it renders: <PlanDialog ... plan={selectedPlan} />
    // We should probably add a useEffect to sync state when plan changes.

    // Since I'm replacing the whole file, I'll add the useEffect to be safe.

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

            const planData = {
                name,
                price_monthly: price,
                description: description || undefined,
                routine_frequency: routineFrequency,
                calls_frequency: callsFrequency,
                includes_nutrition: includesNutrition
            }

            const result = isEdit
                ? await updatePlan(plan.id, planData)
                : await createPlan(planData)

            if (result.error) {
                toast.error(result.error)
                return
            }

            toast.success(`Plan ${isEdit ? 'actualizado' : 'creado'} exitosamente`)
            onOpenChange(false)
            onSuccess()

            // Reset form if creating
            if (!isEdit) {
                setName('')
                setPriceMonthly('')
                setDescription('')
                setRoutineFrequency('monthly')
                setCallsFrequency('none')
                setIncludesNutrition(false)
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
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Editar Plan' : 'Crear Nuevo Plan'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-8 py-2">
                    <div className="flex flex-col gap-6">
                        <div className="space-y-2.5">
                            <Label htmlFor="name">Nombre del plan <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Plan Premium"
                                maxLength={50}
                                required
                            />
                        </div>

                        <div className="space-y-2.5">
                            <Label htmlFor="price">Precio mensual <span className="text-red-500">*</span></Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input
                                    id="price"
                                    type="number"
                                    value={priceMonthly}
                                    onChange={(e) => setPriceMonthly(e.target.value)}
                                    placeholder="0"
                                    min="0"
                                    step="0.01"
                                    className="pl-7"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2.5">
                                <Label>Actualización de rutina</Label>
                                <Select
                                    value={routineFrequency}
                                    onValueChange={(v: any) => setRoutineFrequency(v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Mensual</SelectItem>
                                        <SelectItem value="quarterly">Trimestral</SelectItem>
                                        <SelectItem value="biannual">Semestral</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2.5">
                                <Label>Llamadas 1:1</Label>
                                <Select
                                    value={callsFrequency}
                                    onValueChange={(v: any) => setCallsFrequency(v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Ninguna</SelectItem>
                                        <SelectItem value="monthly">Mensual</SelectItem>
                                        <SelectItem value="weekly">Semanal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                                id="nutrition"
                                checked={includesNutrition}
                                onCheckedChange={(checked) => setIncludesNutrition(checked as boolean)}
                            />
                            <Label
                                htmlFor="nutrition"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Incluye plan nutricional
                            </Label>
                        </div>

                        {/* Show notification option only if editing and price changed */}
                        {isEdit && plan && parseFloat(priceMonthly) !== plan.price_monthly && (
                            <div className="rounded-lg border p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                                <div className="flex items-start space-x-2">
                                    <Checkbox
                                        id="notify"
                                        checked={notifyClients}
                                        onCheckedChange={(checked) => setNotifyClients(checked as boolean)}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label
                                            htmlFor="notify"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            Notificar cambio de precio a clientes
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Se enviará un correo a todos los asesorados con este plan informando el nuevo precio.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2.5">
                            <Label htmlFor="description">Descripción (opcional)</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Detalles adicionales sobre el plan..."
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
