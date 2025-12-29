'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AssignDietDialog } from '../assign-diet-dialog'
import { updateClientAction } from '@/app/(dashboard)/clients/actions'
import { deleteAssignedDietAction } from '@/app/(dashboard)/clients/[id]/diet-actions'
import { DietCard } from '../diet-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function DietTab({ client }: { client: any }) {
    const [diets, setDiets] = useState<any[]>([])

    useEffect(() => {
        fetchDiets()
    }, [client.id])

    const fetchDiets = async () => {
        try {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('assigned_diets')
                .select('*')
                .eq('client_id', client.id)
                .order('created_at', { ascending: true })

            if (error) {
                console.error("Error fetching diets:", error)
            } else if (data) {
                setDiets(data)
            }
        } catch (err) {
            console.error("UNEXPECTED ERROR in DietTab fetchDiets:", err)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm("¿Eliminar esta comida?")) {
            await deleteAssignedDietAction(id, client.id)
            fetchDiets()
        }
    }

    // Prepare read-only data
    const preferenceLabel = client.dietary_preference
        ? client.dietary_preference.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
        : "Sin restricciones"

    const allergensLabel = (client.allergens && client.allergens.length > 0)
        ? client.allergens.map((a: string) => a.charAt(0).toUpperCase() + a.slice(1)).join(", ")
        : "Ninguno"

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold">Preferencia de dieta</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{preferenceLabel}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold">Alergenos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{allergensLabel}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
                <h3 className="font-bold text-lg">Plan de Alimentación</h3>
                <AssignDietDialog client={client} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {diets.map(diet => (
                    <DietCard
                        key={diet.id}
                        diet={diet}
                        onEdit={() => { /* TODO: Implement Edit Dialog */ alert("Edición completa pendiente de implementar (Dialog detalle)") }}
                        onDelete={() => handleDelete(diet.id)}
                    />
                ))}
                {diets.length === 0 && (
                    <div className="col-span-full border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground">
                        No hay comidas asignadas. Comienza agregando una.
                    </div>
                )}
            </div>

            {/* Summary Totals Footer? */}
            {diets.length > 0 && (
                <div className="bg-muted p-4 rounded-lg flex justify-between items-center text-sm">
                    <span className="font-semibold">Total Diario Estimado:</span>
                    <div className="flex gap-4">
                        <span>
                            {diets.reduce((acc, d) => acc + (d.data?.macros?.total_calories || 0), 0)} Kcal
                        </span>
                        <span className="text-blue-600 font-bold">
                            {diets.reduce((acc, d) => acc + (d.data?.macros?.total_proteins || 0), 0)}g Prot
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}
