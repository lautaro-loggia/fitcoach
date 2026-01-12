'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WeeklyMealPlanContainer } from '../meal-plan/weekly-meal-plan-container'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Save, X, Loader2 } from 'lucide-react'
import { updateClientAction } from '@/app/(dashboard)/clients/actions'
import { toast } from 'sonner'

export function DietTab({ client }: { client: any }) {
    const [isEditing, setIsEditing] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        target_calories: client.target_calories || 0,
        target_protein: client.target_protein || 0,
        target_carbs: client.target_carbs || 0,
        target_fats: client.target_fats || 0
    })

    // Prepare read-only data
    const preferenceLabel = client.dietary_preference
        ? client.dietary_preference.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
        : "Sin restricciones"

    const allergensLabel = (client.allergens && client.allergens.length > 0)
        ? client.allergens.map((a: string) => a.charAt(0).toUpperCase() + a.slice(1)).join(", ")
        : "Ninguno"

    const handleEdit = () => {
        setFormData({
            target_calories: client.target_calories || 0,
            target_protein: client.target_protein || 0,
            target_carbs: client.target_carbs || 0,
            target_fats: client.target_fats || 0
        })
        setIsEditing(true)
    }

    const handleSave = async () => {
        setIsLoading(true)
        try {
            const result = await updateClientAction(client.id, {
                ...formData,
                macros_is_manual: true
            })
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success("Objetivos actualizados correctamente")
                setIsEditing(false)
            }
        } catch (error) {
            toast.error("Error al guardar los cambios")
        } finally {
            setIsLoading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }))
    }

    return (
        <div className="space-y-6">
            {/* Macronutrients Summary */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            Objetivos Nutricionales
                            <span className="text-xs font-normal text-muted-foreground bg-background px-2 py-1 rounded-full border">
                                {client.macros_is_manual ? 'Personalizado' : 'Calculado automáticamente'}
                            </span>
                        </div>
                        {!isEditing ? (
                            <Button variant="ghost" size="sm" onClick={handleEdit} className="h-8 w-8 p-0">
                                <Pencil className="h-4 w-4" />
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                                    <X className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={handleSave} disabled={isLoading} className="h-8 w-8 p-0 text-primary hover:text-primary">
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                </Button>
                            </div>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                            {isEditing ? (
                                <div className="space-y-1 w-full">
                                    <Input
                                        type="number"
                                        name="target_calories"
                                        value={formData.target_calories}
                                        onChange={handleChange}
                                        className="h-8 text-center text-lg font-bold bg-white/50"
                                    />
                                    <div className="text-[10px] uppercase font-semibold text-zinc-500">KCAL</div>
                                </div>
                            ) : (
                                <>
                                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{client.target_calories || 0}</div>
                                    <div className="text-xs uppercase font-semibold text-zinc-500">KCAL</div>
                                </>
                            )}
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                            {isEditing ? (
                                <div className="space-y-1 w-full">
                                    <Input
                                        type="number"
                                        name="target_protein"
                                        value={formData.target_protein}
                                        onChange={handleChange}
                                        className="h-8 text-center text-lg font-bold bg-white/50"
                                    />
                                    <div className="text-[10px] uppercase font-semibold text-blue-600/70">PROT</div>
                                </div>
                            ) : (
                                <>
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{client.target_protein || 0}g</div>
                                    <div className="text-xs uppercase font-semibold text-blue-600/70">PROT</div>
                                </>
                            )}
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                            {isEditing ? (
                                <div className="space-y-1 w-full">
                                    <Input
                                        type="number"
                                        name="target_carbs"
                                        value={formData.target_carbs}
                                        onChange={handleChange}
                                        className="h-8 text-center text-lg font-bold bg-white/50"
                                    />
                                    <div className="text-[10px] uppercase font-semibold text-amber-600/70">CARBS</div>
                                </div>
                            ) : (
                                <>
                                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{client.target_carbs || 0}g</div>
                                    <div className="text-xs uppercase font-semibold text-amber-600/70">CARBS</div>
                                </>
                            )}
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20">
                            {isEditing ? (
                                <div className="space-y-1 w-full">
                                    <Input
                                        type="number"
                                        name="target_fats"
                                        value={formData.target_fats}
                                        onChange={handleChange}
                                        className="h-8 text-center text-lg font-bold bg-white/50"
                                    />
                                    <div className="text-[10px] uppercase font-semibold text-rose-600/70">GRASAS</div>
                                </div>
                            ) : (
                                <>
                                    <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{client.target_fats || 0}g</div>
                                    <div className="text-xs uppercase font-semibold text-rose-600/70">GRASAS</div>
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

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

            <WeeklyMealPlanContainer
                clientId={client.id}
                clientName={client.full_name}
                clientAllergens={client.allergens}
                clientPreference={client.dietary_preference} // Assuming this field exists, need to verify or use generic 'preference'
            />
        </div>
    )
}
