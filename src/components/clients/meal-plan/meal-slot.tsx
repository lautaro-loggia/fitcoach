'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Plus, Eye, EyeOff } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AddDishDialog } from './add-dish-dialog'
import { DishCard } from './dish-card'
import { addDishToMeal, removeDish, toggleMealSkip, deleteMealFromDay } from '@/app/(dashboard)/clients/[id]/meal-plan-actions'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useState } from 'react'

interface MealSlotProps {
    meal: any
    dayName: string
    clientId: string
    clientAllergens?: string[]
    clientPreference?: string
    onUpdate: () => void
}

export function MealSlot({ meal, dayName, clientId, clientAllergens, clientPreference, onUpdate }: MealSlotProps) {
    const isSkipped = meal.is_skipped
    const [addDialogOpen, setAddDialogOpen] = useState(false)

    const handleAddDish = async (data: any) => {
        const result = await addDishToMeal(meal.id, clientId, data)
        if (result?.error) {
            toast.error('Error al agregar receta')
        } else {
            toast.success('Receta agregada')
            onUpdate()
            setAddDialogOpen(false)
        }
    }

    const handleDeleteDish = async (itemId: string) => {
        if (confirm('¿Eliminar receta?')) {
            await removeDish(itemId, clientId)
            onUpdate()
            toast.success('Receta eliminada')
        }
    }

    const handleToggleSkip = async () => {
        await toggleMealSkip(meal.id, isSkipped, clientId)
        onUpdate()
    }

    const handleDeleteMeal = async () => {
        if (confirm(`¿Estás seguro que deseas eliminar toda la comida "${meal.name}"?`)) {
            const result = await deleteMealFromDay(meal.id, clientId)
            if (result?.error) {
                toast.error('Error al eliminar comida')
            } else {
                toast.success('Comida eliminada')
                onUpdate()
            }
        }
    }

    return (
        <Card className={cn(
            "flex flex-col h-[320px] transition-all overflow-hidden border-border/60", // Fixed height or min-height to match mockup uniformity
            isSkipped && "opacity-50 bg-muted/40"
        )}>
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-bold">
                    {meal.name}
                    {isSkipped && <span className="ml-2 text-xs font-normal text-muted-foreground">(Omitido)</span>}
                </CardTitle>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <MoreHorizontal className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleToggleSkip}>
                            {isSkipped ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                            {isSkipped ? "Restaurar" : "Omitir"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDeleteMeal} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                            Eliminar comida
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>

            <CardContent className="p-4 pt-2 flex-1 flex flex-col justify-between">
                <div className="space-y-3 overflow-y-auto max-h-[200px] pr-1 scrollbar-hide">
                    {meal.items && meal.items.map((item: any) => (
                        <DishCard key={item.id} item={item} onDelete={handleDeleteDish} />
                    ))}
                </div>

                {!isSkipped && (
                    <Button
                        variant="secondary"
                        className="w-full mt-4 bg-muted/50 hover:bg-muted text-foreground"
                        onClick={() => setAddDialogOpen(true)}
                    >
                        <Plus className="mr-2 h-4 w-4" /> Agregar receta
                    </Button>
                )}

                <AddDishDialog
                    open={addDialogOpen}
                    onOpenChange={setAddDialogOpen}
                    mealId={meal.id}
                    contextLabel={`${dayName} · ${meal.name}`}
                    clientAllergens={clientAllergens}
                    clientPreference={clientPreference}
                    onConfirm={handleAddDish}
                />
            </CardContent>
        </Card >
    )
}
