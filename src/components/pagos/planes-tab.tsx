'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Users, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getPlans, deletePlan, getClientCountByPlan, createPlan, updatePlan, type Plan } from '@/app/(dashboard)/pagos/actions'
import { PlanDialog } from '@/components/plans/plan-dialog'

export function PlanesTab() {
    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
    const [deletingPlan, setDeletingPlan] = useState<string | null>(null)
    const [clientCounts, setClientCounts] = useState<Record<string, number>>({})

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            setLoading(true)
            const plansData = await getPlans()
            setPlans(plansData)

            // Load client counts for each plan IN PARALLEL
            const countPromises = plansData.map(plan =>
                getClientCountByPlan(plan.id).then(count => ({ id: plan.id, count }))
            )
            const countResults = await Promise.all(countPromises)

            const counts: Record<string, number> = {}
            countResults.forEach(result => {
                counts[result.id] = result.count
            })
            setClientCounts(counts)
        } catch (error) {
            console.error('Error loading plans:', error)
            toast.error('No se pudieron cargar los planes')
        } finally {
            setLoading(false)
        }
    }

    function handleCreate() {
        setSelectedPlan(null)
        setDialogOpen(true)
    }

    function handleEdit(plan: Plan) {
        setSelectedPlan(plan)
        setDialogOpen(true)
    }

    async function handleDelete(plan: Plan) {
        if (!confirm(`¿Estás seguro de eliminar el plan "${plan.name}"?`)) {
            return
        }

        try {
            setDeletingPlan(plan.id)
            const result = await deletePlan(plan.id)

            if (result.error) {
                toast.error(result.error)
                return
            }

            toast.success('Plan eliminado exitosamente')
            loadData()
        } catch (error) {
            console.error('Error deleting plan:', error)
            toast.error('No se pudo eliminar el plan')
        } finally {
            setDeletingPlan(null)
        }
    }

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0
        }).format(amount)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-start">
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Plan
                </Button>
            </div>

            {plans.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <p className="text-muted-foreground mb-4">
                            Aún no has creado ningún plan de pago
                        </p>
                        <Button onClick={handleCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            Crear tu primer plan
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {plans.map((plan) => (
                        <Card key={plan.id}>
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <CardTitle className="text-base font-semibold">
                                    {plan.name}
                                </CardTitle>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEdit(plan)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(plan)}
                                        disabled={deletingPlan === plan.id}
                                    >
                                        {deletingPlan === plan.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold mb-2">
                                    {formatCurrency(plan.price_monthly)}
                                </div>
                                <p className="text-xs text-muted-foreground mb-1">por mes</p>

                                {plan.description && (
                                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                        {plan.description}
                                    </p>
                                )}

                                <Badge variant="secondary" className="mt-2">
                                    <Users className="h-3 w-3 mr-1" />
                                    {clientCounts[plan.id] || 0} asesorado{clientCounts[plan.id] !== 1 ? 's' : ''}
                                </Badge>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <PlanDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                plan={selectedPlan}
                onSuccess={loadData}
            />
        </div>
    )
}
