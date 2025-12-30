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
                alert(result.error)
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
                className={`group overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm transition-all cursor-pointer p-4 pb-4 ${isSelected
                    ? 'border-primary ring-2 ring-primary ring-offset-2'
                    : 'hover:shadow-md hover:border-border'
                    }`}
                onClick={handleCardClick}
            >
                {/* Image Section */}
                {/* User wants the image rounded inside the card, with badge on top right */}
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted/50 mb-4">
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

                    {/* Badge */}
                    {recipe.meal_type && (
                        <Badge
                            className={`absolute top-3 right-3 border-0 px-3 py-1 font-medium ${mealTypeColors[recipe.meal_type] || 'bg-white/90 text-zinc-800'}`}
                        >
                            {mealTypeLabels[recipe.meal_type] || recipe.meal_type}
                        </Badge>
                    )}
                </div>

                {/* Content */}
                <div className="space-y-4">
                    {/* Title */}
                    <div>
                        <h3 className="text-xl font-bold leading-tight tracking-tight text-foreground">
                            {recipe.name}
                        </h3>
                        {/* Meta: Time & Servings */}
                        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                            {recipe.prep_time_min && (
                                <div className="flex items-center gap-1.5">
                                    <Clock className="h-4 w-4" />
                                    <span>{recipe.prep_time_min} min</span>
                                </div>
                            )}
                            {recipe.servings && (
                                <div className="flex items-center gap-1.5">
                                    {/* Icon like users or just text */}
                                    {/* Screenshot just says "1 porcion" maybe without icon or simple dot? user icon works */}
                                    <span>{recipe.servings} {recipe.servings === 1 ? 'porcion' : 'porciones'}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Macros Grid */}
                    <div className="grid grid-cols-4 gap-2">
                        <div className="flex flex-col items-center justify-center rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900">
                            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{Math.round(macros.kcal)}</span>
                            <span className="text-[10px] font-semibold uppercase text-zinc-500">KCAL</span>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{Math.round(macros.protein)}g</span>
                            <span className="text-[10px] font-semibold uppercase text-blue-600/70">PROT</span>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-lg bg-amber-50 p-2 dark:bg-amber-900/20">
                            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{Math.round(macros.carbs)}g</span>
                            <span className="text-[10px] font-semibold uppercase text-amber-600/70">CARBS</span>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-lg bg-rose-50 p-2 dark:bg-rose-900/20">
                            <span className="text-lg font-bold text-rose-600 dark:text-rose-400">{Math.round(macros.fat)}g</span>
                            <span className="text-[10px] font-semibold uppercase text-rose-600/70">GRASAS</span>
                        </div>
                    </div>

                    {/* Actions - Only show if not in selection mode */}
                    {!onSelect && (
                        <div className="flex items-center gap-2 pt-1">
                            <Button
                                variant="outline"
                                className="flex-1 gap-2 rounded-xl h-11 border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900 font-medium"
                                onClick={handleDuplicate}
                                disabled={isDuplicating}
                            >
                                {isDuplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                                Duplicar receta
                            </Button>

                            {/* Admin Edit Button */}
                            {isAdmin && (
                                <Button
                                    variant="outline"
                                    className="h-11 w-11 rounded-xl border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900 shadow-sm p-0 shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        router.push(`/recipes/${recipe.id}`)
                                    }}
                                    title="Editar Receta"
                                >
                                    <Utensils className="h-5 w-5" />
                                </Button>
                            )}

                            <Button
                                className="h-11 w-11 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-sm p-0 shrink-0"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setShowAssignDialog(true)
                                }}
                            >
                                <Users className="h-5 w-5" />
                            </Button>
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
