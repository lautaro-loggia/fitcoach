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
            <Card className="w-full">
                <CardHeader className="flex flex-row items-center justify-between pb-4 border-b mb-6">
                    <div>
                        <CardTitle className="text-xl">Planes de Suscripción</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">Configura los planes que ofreces a tus asesorados</p>
                    </div>
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Crear Plan
                    </Button>
                </CardHeader>
                <CardContent>
                    {plans.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="bg-primary/10 p-4 rounded-full mb-4">
                                <Users className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No tienes planes creados</h3>
                            <p className="text-muted-foreground mb-6 max-w-sm">
                                Crea planes de suscripción para automatizar los cobros y seguimientos de tus asesorados.
                            </p>
                            <Button onClick={handleCreate} variant="outline">
                                <Plus className="mr-2 h-4 w-4" />
                                Crear tu primer plan
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                            {plans.map((plan) => (
                                <div key={plan.id} className="border rounded-xl p-4 hover:border-primary/50 transition-colors bg-card relative group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-semibold text-lg">{plan.name}</h4>
                                            <div className="text-2xl font-bold mt-1 text-primary">
                                                {formatCurrency(plan.price_monthly)}
                                                <span className="text-xs font-normal text-muted-foreground ml-1">/mes</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleEdit(plan)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
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
                                    </div>

                                    {plan.description && (
                                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 h-10">
                                            {plan.description}
                                        </p>
                                    )}

                                    <div className="space-y-2 pt-4 border-t">
                                        <div className="text-xs flex items-center justify-between">
                                            <span className="text-muted-foreground">Rutina</span>
                                            <span className="font-medium bg-secondary px-2 py-0.5 rounded">
                                                {plan.routine_frequency === 'quarterly' ? 'Trimestral' :
                                                    plan.routine_frequency === 'biannual' ? 'Semestral' :
                                                        plan.routine_frequency === 'weekly' ? 'Semanal' :
                                                            plan.routine_frequency === 'biweekly' ? 'Quincenal' : 'Mensual'}
                                            </span>
                                        </div>
                                        <div className="text-xs flex items-center justify-between">
                                            <span className="text-muted-foreground">Llamadas</span>
                                            <span className="font-medium bg-secondary px-2 py-0.5 rounded">
                                                {plan.calls_frequency === 'weekly' ? 'Semanal' :
                                                    plan.calls_frequency === 'monthly' ? 'Mensual' : '-'}
                                            </span>
                                        </div>
                                        <div className="text-xs flex items-center justify-between">
                                            <span className="text-muted-foreground">Nutrición</span>
                                            <span className={`font-medium px-2 py-0.5 rounded ${plan.includes_nutrition ? 'bg-green-100 text-green-700' : 'bg-secondary text-muted-foreground'}`}>
                                                {plan.includes_nutrition ? 'Incluida' : 'No'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 flex items-center text-xs text-muted-foreground">
                                        <Users className="h-3 w-3 mr-1.5" />
                                        {clientCounts[plan.id] || 0} asesorados activos
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <PlanDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                plan={selectedPlan}
                onSuccess={loadData}
            />
        </div>
    )

}
