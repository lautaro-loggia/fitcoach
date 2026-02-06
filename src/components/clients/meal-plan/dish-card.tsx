'use client'

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Utensils, Info } from "lucide-react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RecipeCard } from "@/components/recipes/recipe-card"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface DishCardProps {
    item: any
    onDelete: (id: string) => void
}

export function DishCard({ item, onDelete }: DishCardProps) {
    const [detailOpen, setDetailOpen] = useState(false)
    const displayName = item.custom_name || item.recipe?.name || "Sin nombre"

    // Calculate stats
    const hasRecipe = !!item.recipe

    // Helper to safe multiply
    const calc = (val: number | undefined | null) => {
        if (!val) return 0
        return Math.round(val * item.portions)
    }

    const getMacros = () => {
        if (!hasRecipe) return { kcal: 0, protein: 0, carbs: 0, fat: 0 }

        const r = item.recipe
        // If macros are already in the recipe object, use them
        if (r.macros_calories || r.macros_protein_g) {
            return {
                kcal: calc(r.kcal_per_serving || r.macros_calories),
                protein: calc(r.protein_g_per_serving || r.macros_protein_g),
                carbs: calc(r.carbs_g_per_serving || r.macros_carbs_g),
                fat: calc(r.fat_g_per_serving || r.macros_fat_g),
            }
        }

        // Fallback: calculate from ingredients if macros are missing
        const ingredients = r.ingredients || r.ingredients_data || []
        const totalRaw = ingredients.reduce((acc: any, ing: any) => {
            const factor = (ing.grams || 0) / 100
            return {
                kcal: acc.kcal + (ing.kcal_100g || 0) * factor,
                protein: acc.protein + (ing.protein_100g || 0) * factor,
                carbs: acc.carbs + (ing.carbs_100g || 0) * factor,
                fat: acc.fat + (ing.fat_100g || 0) * factor,
            }
        }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })

        const servings = r.servings || 1
        return {
            kcal: Math.round((totalRaw.kcal / servings) * item.portions),
            protein: Math.round((totalRaw.protein / servings) * item.portions),
            carbs: Math.round((totalRaw.carbs / servings) * item.portions),
            fat: Math.round((totalRaw.fat / servings) * item.portions),
        }
    }

    const { kcal, protein, carbs, fat } = getMacros()
    const showMacros = (protein || carbs || fat) > 0

    return (
        <>
            <div
                className={cn(
                    "relative flex items-center justify-between p-3 bg-card border rounded-md group transition-all",
                    hasRecipe ? "hover:border-primary/50 cursor-pointer hover:bg-accent/5" : ""
                )}
                onClick={() => hasRecipe && setDetailOpen(true)}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center text-primary relative">
                        {item.recipe?.image_url ? (
                            <Image
                                src={item.recipe.image_url}
                                alt={displayName}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <Utensils className="h-5 w-5" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="font-medium text-sm truncate pr-2">{displayName}</p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                            {item.portions > 1 && <span className="font-medium text-foreground">{item.portions} porc.</span>}

                            {kcal !== null && !isNaN(kcal) ? (
                                <span>{kcal} kcal</span>
                            ) : null}

                            {showMacros && (
                                <div className="flex items-center gap-2 border-l pl-2">
                                    <span className="text-blue-600 font-medium">P: {protein}g</span>
                                    <span className="text-amber-600 font-medium">C: {carbs}g</span>
                                    <span className="text-rose-600 font-medium">G: {fat}g</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive z-10"
                    onClick={(e) => {
                        e.stopPropagation()
                        onDelete(item.id)
                    }}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {hasRecipe && (
                <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                    <DialogContent className="max-w-md sm:max-w-lg p-0 border-0 bg-transparent">
                        <DialogHeader className="sr-only">
                            <DialogTitle>{displayName}</DialogTitle>
                        </DialogHeader>
                        {/* Reusing RecipeCard for detail view. 
                             We might need to wrap it to look good in a loose dialog or use its native style. 
                             RecipeCard is designed as a card, so it fits well.
                         */}
                        <div className="bg-background rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <RecipeCard recipe={item.recipe} onSelect={() => { }} />
                            <div className="p-4 pt-0 flex justify-end">
                                <Button variant="outline" onClick={() => setDetailOpen(false)}>Cerrar</Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    )
}
