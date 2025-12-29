'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { getPlans, changeClientPlan, type Plan } from '@/app/(dashboard)/pagos/actions'
import type { ClientWithPayment } from '@/app/(dashboard)/pagos/actions'
import { formatCurrency } from '@/lib/utils'

interface ChangePlanDialogProps {
    client: ClientWithPayment
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function ChangePlanDialog({
    client,
    open,
    onOpenChange,
    onSuccess,
}: ChangePlanDialogProps) {
    const [loading, setLoading] = useState(false)
    const [plans, setPlans] = useState<Plan[]>([])
    const [selectedPlanId, setSelectedPlanId] = useState<string>('')
    const [loadingPlans, setLoadingPlans] = useState(false)

    useEffect(() => {
        if (open) {
            loadPlans()
            // Pre-select current plan if exists
            if (client.plan_id) {
                setSelectedPlanId(client.plan_id)
            } else {
                setSelectedPlanId('')
            }
        }
    }, [open, client.plan_id])

    async function loadPlans() {
        try {
            setLoadingPlans(true)
            const data = await getPlans()
            setPlans(data)
        } catch (error) {
            console.error('Error loading plans:', error)
            toast.error('Error al cargar los planes')
        } finally {
            setLoadingPlans(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!selectedPlanId) {
            toast.error('Por favor selecciona un plan')
            return
        }

        // Check if it's the same plan
        if (selectedPlanId === client.plan_id) {
            toast.info('El cliente ya tiene este plan asignado')
            return
        }

        try {
            setLoading(true)

            const result = await changeClientPlan({
                clientId: client.id,
                planId: selectedPlanId,
            })

            if (result.error) {
                toast.error(result.error)
                return
            }

            toast.success('Plan actualizado correctamente')
            onOpenChange(false)
            onSuccess()
        } catch (error) {
            console.error('Error changing plan:', error)
            toast.error('Error al cambiar el plan')
        } finally {
            setLoading(false)
        }
    }

    const selectedPlan = plans.find((p) => p.id === selectedPlanId)
    const currentPlan = plans.find((p) => p.id === client.plan_id)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Cambiar Plan</DialogTitle>
                    <DialogDescription>
                        Cambiar el plan de {client.full_name}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Current Plan Info */}
                    <div className="rounded-lg bg-muted p-4">
                        <div className="text-sm font-medium mb-1">Plan actual</div>
                        {currentPlan ? (
                            <div>
                                <div className="text-base font-semibold">{currentPlan.name}</div>
                                <div className="text-sm text-muted-foreground">
                                    {formatCurrency(currentPlan.price_monthly)}/mes
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground">
                                Plan personalizado - {formatCurrency(client.price_monthly || 0)}/mes
                            </div>
                        )}
                    </div>

                    {/* New Plan Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="plan">Nuevo plan</Label>
                        {loadingPlans ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <>
                                <Select
                                    value={selectedPlanId}
                                    onValueChange={setSelectedPlanId}
                                    disabled={loading}
                                >
                                    <SelectTrigger id="plan">
                                        <SelectValue placeholder="Selecciona un plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {plans.length === 0 ? (
                                            <div className="p-2 text-sm text-muted-foreground text-center">
                                                No hay planes disponibles
                                            </div>
                                        ) : (
                                            plans.map((plan) => (
                                                <SelectItem key={plan.id} value={plan.id}>
                                                    <div className="flex items-center justify-between gap-4">
                                                        <span>{plan.name}</span>
                                                        <span className="text-muted-foreground">
                                                            {formatCurrency(plan.price_monthly)}/mes
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>

                                {/* Show selected plan description */}
                                {selectedPlan && selectedPlan.description && (
                                    <p className="text-sm text-muted-foreground">
                                        {selectedPlan.description}
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                    {/* Price Change Indicator */}
                    {selectedPlan && currentPlan && selectedPlan.id !== currentPlan.id && (
                        <div className="rounded-lg border bg-blue-50 dark:bg-blue-950 p-4">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                        {formatCurrency(currentPlan.price_monthly)}
                                    </span>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">
                                        {formatCurrency(selectedPlan.price_monthly)}
                                    </span>
                                </div>
                                <div className="text-muted-foreground">
                                    {selectedPlan.price_monthly > currentPlan.price_monthly ? (
                                        <span className="text-green-600 dark:text-green-400">
                                            +{formatCurrency(selectedPlan.price_monthly - currentPlan.price_monthly)}
                                        </span>
                                    ) : (
                                        <span className="text-red-600 dark:text-red-400">
                                            {formatCurrency(selectedPlan.price_monthly - currentPlan.price_monthly)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading || !selectedPlanId || loadingPlans}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Cambiar Plan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
