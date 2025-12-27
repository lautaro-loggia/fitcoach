'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { Utensils, Copy, ExternalLink, Loader2, Clock, Users } from 'lucide-react'
import { duplicateRecipeAction } from '@/app/(dashboard)/recipes/actions'

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
}

const mealTypeLabels: Record<string, string> = {
    desayuno: 'Desayuno',
    almuerzo: 'Almuerzo',
    cena: 'Cena',
    snack: 'Snack',
    postre: 'Postre',
    // Legacy English values
    breakfast: 'Desayuno',
    lunch: 'Almuerzo',
    dinner: 'Cena',
}

const mealTypeColors: Record<string, string> = {
    desayuno: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    almuerzo: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    cena: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    snack: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    postre: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
    // Legacy
    breakfast: 'bg-amber-100 text-amber-800',
    lunch: 'bg-blue-100 text-blue-800',
    dinner: 'bg-purple-100 text-purple-800',
}

export function RecipeCard({ recipe }: RecipeCardProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isDuplicating, startDuplicating] = useTransition()

    // Use ingredients or fallback to ingredients_data (legacy)
    const ingredientsList = recipe.ingredients || recipe.ingredients_data || []

    // Calculate macros per serving
    const calculateMacrosPerServing = () => {
        // Check if ingredients have nutritional data
        const hasNutritionalData = ingredientsList.some(
            ing => (ing.kcal_100g || 0) > 0
        )

        // If ingredients don't have nutritional data, use the recipe's stored macros
        if (!hasNutritionalData && recipe.macros_calories) {
            const servings = recipe.servings || 1
            return {
                kcal: (recipe.macros_calories || 0) / servings,
                protein: (recipe.macros_protein_g || 0) / servings,
                carbs: (recipe.macros_carbs_g || 0) / servings,
                fat: (recipe.macros_fat_g || 0) / servings,
            }
        }

        // Otherwise calculate from ingredients
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

    const handleViewEdit = () => {
        startTransition(() => {
            router.push(`/recipes/${recipe.id}`)
        })
    }

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

    return (
        <Card className="group overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col">
            {/* Image Section */}
            <div className="relative h-40 bg-gradient-to-br from-orange-100 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/10">
                {recipe.image_url ? (
                    <Image
                        src={recipe.image_url}
                        alt={recipe.name}
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Utensils className="h-16 w-16 text-orange-300 dark:text-orange-700" />
                    </div>
                )}
                {/* Meal type badge overlay */}
                {recipe.meal_type && (
                    <Badge
                        className={`absolute top-3 right-3 ${mealTypeColors[recipe.meal_type] || 'bg-gray-100 text-gray-800'}`}
                    >
                        {mealTypeLabels[recipe.meal_type] || recipe.meal_type}
                    </Badge>
                )}
            </div>

            <CardHeader className="pb-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <h3 className="font-semibold text-lg line-clamp-2 cursor-default">{recipe.name}</h3>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                            <p>{recipe.name}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {recipe.prep_time_min && (
                        <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {recipe.prep_time_min} min
                        </span>
                    )}
                    {recipe.servings && (
                        <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {recipe.servings} {recipe.servings === 1 ? 'porción' : 'porciones'}
                        </span>
                    )}
                </div>
            </CardHeader>

            <CardContent className="flex-1">
                {/* Macros Grid (per serving) */}
                <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2">
                        <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{Math.round(macros.kcal)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">kcal</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{Math.round(macros.protein)}g</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Prot</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
                        <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{Math.round(macros.carbs)}g</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Carbs</p>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-2">
                        <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{Math.round(macros.fat)}g</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Grasas</p>
                    </div>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-1">por porción</p>
            </CardContent>

            <CardFooter className="flex gap-2 pt-2">
                <Button
                    onClick={handleViewEdit}
                    className="flex-1 bg-primary hover:bg-primary/90"
                    disabled={isPending}
                >
                    {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ver / Editar
                        </>
                    )}
                </Button>
                <Button
                    variant="outline"
                    onClick={handleDuplicate}
                    disabled={isDuplicating}
                    title="Duplicar receta"
                >
                    {isDuplicating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Copy className="h-4 w-4" />
                    )}
                </Button>
            </CardFooter>
        </Card>
    )
}
