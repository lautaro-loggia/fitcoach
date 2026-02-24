'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Utensils, Copy, Clock, Users, Flame, Loader2 } from 'lucide-react'
import { duplicateRecipeAction } from '@/app/(dashboard)/recipes/actions'
import { AssignRecipeDialog } from './assign-recipe-dialog'
import { toast } from 'sonner'

interface RecipeIngredient {
    ingredient_code: string
    ingredient_name: string
    grams: number
    kcal_100g?: number
    protein_100g?: number
    carbs_100g?: number
    fat_100g?: number
    fiber_100g?: number
}

interface RecipeCardProps {
    recipe: {
        id: string
        name: string
        meal_type: string | null
        servings: number | null
        prep_time_min: number | null
        image_url: string | null
        ingredients: RecipeIngredient[] | null
        ingredients_data?: RecipeIngredient[] | null // Legacy field
        macros_calories?: number | null
        macros_protein_g?: number | null
        macros_carbs_g?: number | null
        macros_fat_g?: number | null
    }
    isAdmin?: boolean
    onSelect?: () => void
    isSelected?: boolean
}

const mealTypeLabels: Record<string, string> = {
    desayuno: 'Desayuno',
    almuerzo: 'Almuerzo',
    cena: 'Cena',
    snack: 'Snack',
    postre: 'Postre',
    breakfast: 'Desayuno',
    lunch: 'Almuerzo',
    dinner: 'Cena',
}

const mealTypeColors: Record<string, string> = {
    // Custom colors to match the badge style in screenshot
    desayuno: 'bg-[#EAD8B2] text-[#4A3B29]', // Beige/Gold like screenshot
    almuerzo: 'bg-blue-100 text-blue-800',
    cena: 'bg-purple-100 text-purple-800',
    snack: 'bg-green-100 text-green-800',
    postre: 'bg-pink-100 text-pink-800',
    breakfast: 'bg-[#EAD8B2] text-[#4A3B29]',
    lunch: 'bg-blue-100 text-blue-800',
    dinner: 'bg-purple-100 text-purple-800',
}

export function RecipeCard({ recipe, isAdmin, onSelect, isSelected }: RecipeCardProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition() // For navigation if needed
    const [isDuplicating, startDuplicating] = useTransition()
    const [showAssignDialog, setShowAssignDialog] = useState(false)

    // Use ingredients or fallback
    const ingredientsList = recipe.ingredients || recipe.ingredients_data || []

    const calculateMacrosPerServing = () => {
        // If stored macros exist, verify if they need per-serving division
        // Assuming stored macros are TOTAL? Or per serving?
        // Usually apps store per 100g or per serving. Let's assume per serving if it matches simple entries.
        // But the previous code divided by serving if it was using stored macros. 
        // Let's stick to previous logic:

        const hasNutritionalData = ingredientsList.some(
            ing => (ing.kcal_100g || 0) > 0
        )

        // If explicitly stored macros exist and ingredients don't have enough data
        if (!hasNutritionalData && recipe.macros_calories) {
            const servings = recipe.servings || 1
            // If stored macros defined, previous logic was dividing by servings... 
            // "return { kcal: (recipe.macros_calories || 0) / servings, ... }"
            return {
                kcal: (recipe.macros_calories || 0) / servings,
                protein: (recipe.macros_protein_g || 0) / servings,
                carbs: (recipe.macros_carbs_g || 0) / servings,
                fat: (recipe.macros_fat_g || 0) / servings,
            }
        }

        // Calculate from ingredients
        if (!ingredientsList || ingredientsList.length === 0) {
            return { kcal: 0, protein: 0, carbs: 0, fat: 0 }
        }

        const totals = ingredientsList.reduce((acc, ing) => {
            const factor = (ing.grams || 0) / 100
            return {
                kcal: acc.kcal + (ing.kcal_100g || 0) * factor,
                protein: acc.protein + (ing.protein_100g || 0) * factor,
                carbs: acc.carbs + (ing.carbs_100g || 0) * factor,
                fat: acc.fat + (ing.fat_100g || 0) * factor,
            }
        }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })

        const servings = recipe.servings || 1
        return {
            kcal: totals.kcal / servings,
            protein: totals.protein / servings,
            carbs: totals.carbs / servings,
            fat: totals.fat / servings,
        }
    }

    const macros = calculateMacrosPerServing()

    const handleDuplicate = async (e: React.MouseEvent) => {
        e.stopPropagation()
        startDuplicating(async () => {
            const result = await duplicateRecipeAction(recipe.id)
            if (result.error) {
                toast.error(result.error)
            } else if (result.recipe) {
                router.push(`/recipes/${result.recipe.id}`)
            }
        })
    }

    const handleCardClick = () => {
        if (onSelect) {
            onSelect()
        } else {
            router.push(`/recipes/${recipe.id}`)
        }
    }

    return (
        <>
            <Card
                className={`group flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground transition-all cursor-pointer p-0 ${isSelected
                    ? 'border-primary ring-2 ring-primary ring-offset-2'
                    : 'hover:border-border'
                    }`}
                onClick={handleCardClick}
            >
                {/* Image Section */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/50 shrink-0">
                    {recipe.image_url ? (
                        <Image
                            src={recipe.image_url}
                            alt={recipe.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center bg-muted/50">
                            <Utensils className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                    )}

                    {/* Badge Overlay */}
                    {recipe.meal_type && (
                        <Badge
                            className={`absolute top-3 left-3 border-0 px-2.5 py-0.5 text-xs font-semibold shadow-sm ${mealTypeColors[recipe.meal_type] || 'bg-white/90 text-zinc-800'}`}
                        >
                            {mealTypeLabels[recipe.meal_type] || recipe.meal_type}
                        </Badge>
                    )}
                </div>

                {/* Content Container */}
                <div className="flex flex-col flex-1 p-4 gap-3">
                    {/* Info */}
                    <div className="space-y-1">
                        <h3 className="line-clamp-1 text-base font-semibold leading-tight tracking-tight text-foreground" title={recipe.name}>
                            {recipe.name}
                        </h3>
                        <div className="text-[13px] text-muted-foreground">
                            {recipe.servings ? `${recipe.servings} ${recipe.servings === 1 ? 'porción' : 'porciones'}` : '1 porción'}
                        </div>
                    </div>

                    {/* Macros */}
                    <div className="grid grid-cols-4 gap-2">
                        <div className={`flex flex-col items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-900 h-[44px] ${Math.round(macros.kcal) === 0 ? 'opacity-60' : ''}`}>
                            <span className="text-[13px] font-bold leading-none mb-1 text-zinc-900 dark:text-zinc-50">{Math.round(macros.kcal)}</span>
                            <span className="text-[10px] font-semibold leading-none uppercase text-zinc-500">Kcal</span>
                        </div>
                        <div className={`flex flex-col items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20 h-[44px] ${Math.round(macros.protein) === 0 ? 'opacity-60' : ''}`}>
                            <span className="text-[13px] font-bold leading-none mb-1 text-blue-600 dark:text-blue-400">{Math.round(macros.protein)}g</span>
                            <span className="text-[10px] font-semibold leading-none uppercase text-blue-600/70">Prot</span>
                        </div>
                        <div className={`flex flex-col items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20 h-[44px] ${Math.round(macros.carbs) === 0 ? 'opacity-60' : ''}`}>
                            <span className="text-[13px] font-bold leading-none mb-1 text-amber-600 dark:text-amber-400">{Math.round(macros.carbs)}g</span>
                            <span className="text-[10px] font-semibold leading-none uppercase text-amber-600/70">Carbs</span>
                        </div>
                        <div className={`flex flex-col items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-900/20 h-[44px] ${Math.round(macros.fat) === 0 ? 'opacity-60' : ''}`}>
                            <span className="text-[13px] font-bold leading-none mb-1 text-rose-600 dark:text-rose-400">{Math.round(macros.fat)}g</span>
                            <span className="text-[10px] font-semibold leading-none uppercase text-rose-600/70">Grasas</span>
                        </div>
                    </div>

                    {/* Actions Footer */}
                    {!onSelect && (
                        <div className="flex items-center gap-2 mt-auto pt-1">
                            <Button
                                className="flex-1 h-[44px] rounded-xl bg-primary hover:bg-primary/90 text-white gap-2 font-medium"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setShowAssignDialog(true)
                                }}
                            >
                                <Users className="h-4 w-4" />
                                Asignar
                            </Button>

                            <Button
                                variant="outline"
                                className="h-[44px] w-[44px] rounded-xl border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 p-0 shrink-0"
                                onClick={handleDuplicate}
                                disabled={isDuplicating}
                                title="Duplicar"
                            >
                                {isDuplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                            </Button>

                            {isAdmin && (
                                <Button
                                    variant="outline"
                                    className="h-[44px] w-[44px] rounded-xl border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 p-0 shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        router.push(`/recipes/${recipe.id}`)
                                    }}
                                    title="Configurar"
                                >
                                    <Utensils className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </Card>

            <AssignRecipeDialog
                open={showAssignDialog}
                onOpenChange={setShowAssignDialog}
                recipeId={recipe.id}
                recipeName={recipe.name}
            />
        </>
    )
}
