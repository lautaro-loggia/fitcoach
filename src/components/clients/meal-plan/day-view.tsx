'use client'

import { MealSlot } from './meal-slot'
import { Button } from '@/components/ui/button'
import { Copy } from 'lucide-react'
import { copyDay, addMealToDay } from '@/app/(dashboard)/clients/[id]/meal-plan-actions'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState } from 'react'
import { AddMealDialog } from './add-meal-dialog'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

interface DayViewProps {
    day: any
    allDays: any[]
    clientId: string
    clientAllergens?: string[]
    clientPreference?: string
    onUpdate: () => void
    dailyStats?: {
        kcal: number
        prot: number
        carbs: number
        fats: number
        targets: {
            kcal: number
            prot: number
            carbs: number
            fats: number
        }
    }
}

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export function DayView({ day, allDays, clientId, clientAllergens, clientPreference, onUpdate, dailyStats }: DayViewProps) {
    const [loading, setLoading] = useState(false)
    const [addMealOpen, setAddMealOpen] = useState(false)

    if (!day) return null

    const dayLabel = WEEKDAYS[day.day_of_week - 1]

    const handleCopyDay = async (targetDayId: string) => {
        if (!confirm(`¿Copiar todo el contenido de ${dayLabel} al día seleccionado?`)) return
        setLoading(true)
        try {
            await copyDay(day.id, targetDayId, clientId)
            onUpdate()
            toast.success('Día copiado')
        } catch (error) {
            console.error(error)
            toast.error('Error al copiar')
        } finally {
            setLoading(false)
        }
    }

    const handleAddMeal = async (name: string) => {
        setLoading(true)
        try {
            const res = await addMealToDay(day.id, name, clientId)
            if (res?.error) {
                toast.error(res.error)
            } else {
                toast.success('Comida agregada')
                onUpdate()
                setAddMealOpen(false)
            }
        } catch (error) {
            toast.error('Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header: Title + Inline Stats */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="flex flex-wrap items-baseline gap-4">
                    <h2 className="text-2xl font-bold tracking-tight">Comidas <span className="capitalize">{dayLabel}</span></h2>

                    {dailyStats && (
                        <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <span className="text-foreground font-bold">{dailyStats.kcal}</span>
                                <span className="text-xs">/ {dailyStats.targets.kcal} kcal</span>
                            </div>
                            <span className="text-border">|</span>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                    <span className="text-foreground font-bold">{dailyStats.prot}g</span>
                                    <span className="text-xs">/ {dailyStats.targets.prot}g Prot</span>
                                </div>

                                <div className="flex items-center gap-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                                    <span className="text-foreground font-bold">{dailyStats.carbs}g</span>
                                    <span className="text-xs">/ {dailyStats.targets.carbs}g Carb</span>
                                </div>

                                <div className="flex items-center gap-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                    <span className="text-foreground font-bold">{dailyStats.fats}g</span>
                                    <span className="text-xs">/ {dailyStats.targets.fats}g Grasa</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="hidden sm:block"> {/* Copy only on desktop for now to save mobile space, or keep it? Keeping logic simple */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" disabled={loading} className="text-muted-foreground hover:text-foreground">
                                <Copy className="mr-2 h-3.5 w-3.5" />
                                Copiar día a...
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {allDays.filter(d => d.id !== day.id).map(d => (
                                <DropdownMenuItem key={d.id} onClick={() => handleCopyDay(d.id)}>
                                    {WEEKDAYS[d.day_of_week - 1]}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {day.meals.map((meal: any) => (
                    <MealSlot
                        key={meal.id}
                        meal={meal}
                        dayName={dayLabel}
                        clientId={clientId}
                        clientAllergens={clientAllergens}
                        clientPreference={clientPreference}
                        onUpdate={onUpdate}
                    />
                ))}

                {day.meals.length === 0 && (
                    <div className="col-span-full border border-dashed p-8 text-center text-muted-foreground rounded-lg">
                        No hay comidas configuradas.
                    </div>
                )}

                {/* Empty dashed slot for adding new meal */}
                <button
                    onClick={() => setAddMealOpen(true)}
                    className="flex flex-col items-center justify-center h-[320px] transition-all overflow-hidden border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-muted/30 rounded-xl group"
                >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors mb-3">
                        <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                        Agregar comida
                    </span>
                </button>
            </div>

            <AddMealDialog
                open={addMealOpen}
                onOpenChange={setAddMealOpen}
                dayName={dayLabel}
                onConfirm={handleAddMeal}
            />
        </div>
    )
}
