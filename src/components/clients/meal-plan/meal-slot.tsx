'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, EyeOff, Eye, Plus } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AddDishDialog } from './add-dish-dialog'
import { DishCard } from './dish-card'
import { addDishToMeal, removeDish, toggleMealSkip } from '@/app/(dashboard)/clients/[id]/meal-plan-actions'
import { cn } from '@/lib/utils'

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

    const handleAddDish = async (data: any) => {
        await addDishToMeal(meal.id, clientId, data)
        onUpdate()
    }

    const handleDeleteDish = async (itemId: string) => {
        if (confirm('¿Eliminar plato?')) {
            await removeDish(itemId, clientId)
            onUpdate()
        }
    }

    const handleToggleSkip = async () => {
        await toggleMealSkip(meal.id, isSkipped, clientId)
        onUpdate()
    }

    return (
        <Card className={cn("transition-colors", isSkipped && "opacity-60 bg-muted/50 border-dashed")}>
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    {meal.name}
                    {isSkipped && <span className="text-xs font-normal text-muted-foreground">(Omitido)</span>}
                </CardTitle>
                <div className="flex items-center gap-1">
                    {!isSkipped && (
                        <AddDishDialog
                            mealId={meal.id}
                            contextLabel={`${dayName} · ${meal.name}`}
                            clientAllergens={clientAllergens}
                            clientPreference={clientPreference}
                            onConfirm={handleAddDish}
                        />
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleToggleSkip}>
                                {isSkipped ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                                {isSkipped ? "Restaurar comida" : "Omitir comida"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>

            {!isSkipped && (
                <CardContent className="p-4 pt-2 space-y-3">
                    {meal.items && meal.items.length > 0 ? (
                        meal.items.map((item: any) => (
                            <DishCard
                                key={item.id}
                                item={item}
                                onDelete={handleDeleteDish}
                            />
                        ))
                    ) : (
                        <div className="text-sm text-muted-foreground italic py-2 text-center border border-dashed rounded-md bg-muted/20">
                            Sin platos asignados
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    )
}
