'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AssignDietDialog } from '../assign-diet-dialog'
import { deleteAssignedDietAction } from '@/app/(dashboard)/clients/[id]/diet-actions'
import { DietCard } from '../diet-card'

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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Plan de Alimentación</h3>
                <AssignDietDialog clientId={client.id} />
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
