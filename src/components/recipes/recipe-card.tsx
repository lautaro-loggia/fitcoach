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
                className={`group flex flex-col justify-between overflow-hidden rounded-[20px] border bg-card text-card-foreground transition-all cursor-pointer p-0 ${isSelected
                    ? 'border-primary ring-2 ring-primary ring-offset-2'
                    : 'hover:border-zinc-300 hover:shadow-md'
                    }`}
                onClick={handleCardClick}
            >
                {/* Image Section - Adjusting height dynamically if no image */}
                <div className={`relative w-full overflow-hidden bg-muted/30 shrink-0 ${recipe.image_url ? 'aspect-[4/3]' : 'h-32'}`}>
                    {recipe.image_url ? (
                        <Image
                            src={recipe.image_url}
                            alt={recipe.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center opacity-30">
                            {/* Un ícono más grande o un texto faint para el placeholder */}
                            <Utensils className="h-10 w-10 text-muted-foreground stroke-[1.5]" />
                        </div>
                    )}

                    {/* Badge Overlay */}
                    {recipe.meal_type && (
                        <Badge
                            className={`absolute top-3 left-3 border-0 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase shadow-sm ${mealTypeColors[recipe.meal_type] || 'bg-white/90 text-zinc-800'}`}
                        >
                            {mealTypeLabels[recipe.meal_type] || recipe.meal_type}
                        </Badge>
                    )}
                </div>

                <div className="flex flex-col flex-1 p-4">
                    {/* Header Group */}
                    <div className="flex flex-col space-y-4 mb-4">
                        <div className="space-y-1">
                            <h3 className="text-base font-bold leading-tight text-zinc-900 dark:text-zinc-50 line-clamp-2" title={recipe.name}>
                                {recipe.name}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium pt-0.5">
                                <span>{recipe.servings ? `${recipe.servings} ${recipe.servings === 1 ? 'porción' : 'porciones'}` : '1 porción'}</span>
                                {!!recipe.prep_time_min && (
                                    <>
                                        <span className="text-zinc-300 dark:text-zinc-700">•</span>
                                        <div className="flex items-center gap-1 text-zinc-500">
                                            <Clock className="w-3 h-3" />
                                            <span>{recipe.prep_time_min} min</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 2x2 Grid Macros - Prevents horizontal squeezing */}
                        <div className="grid grid-cols-2 gap-1.5">
                            <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-md bg-zinc-50 dark:bg-zinc-800/50 ${Math.round(macros.kcal) === 0 ? 'opacity-50' : ''}`}>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Kcal</span>
                                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{Math.round(macros.kcal)}</span>
                            </div>
                            <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-md bg-blue-50/50 dark:bg-blue-900/20 ${Math.round(macros.protein) === 0 ? 'opacity-50' : ''}`}>
                                <span className="text-[10px] font-bold text-blue-600/70 uppercase tracking-wider">Prot</span>
                                <span className="text-sm font-bold text-blue-700 dark:text-blue-400">{Math.round(macros.protein)}g</span>
                            </div>
                            <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-md bg-amber-50/50 dark:bg-amber-900/20 ${Math.round(macros.carbs) === 0 ? 'opacity-50' : ''}`}>
                                <span className="text-[10px] font-bold text-amber-600/70 uppercase tracking-wider">Carbs</span>
                                <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{Math.round(macros.carbs)}g</span>
                            </div>
                            <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-md bg-rose-50/50 dark:bg-rose-900/20 ${Math.round(macros.fat) === 0 ? 'opacity-50' : ''}`}>
                                <span className="text-[10px] font-bold text-rose-600/70 uppercase tracking-wider">Grasas</span>
                                <span className="text-sm font-bold text-rose-700 dark:text-rose-400">{Math.round(macros.fat)}g</span>
                            </div>
                        </div>
                    </div>

                    {/* Subtle Actions Footer */}
                    {!onSelect && (
                        <div className="flex items-center justify-between gap-2 pt-3 mt-auto border-t border-zinc-100 dark:border-zinc-800/50">
                            {/* Primary action gets full visual weight but remains elegant */}
                            <Button
                                className="flex-1 h-9 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white gap-2 text-sm font-semibold shadow-none dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setShowAssignDialog(true)
                                }}
                            >
                                <Users className="h-4 w-4" />
                                Asignar
                            </Button>

                            <div className="flex items-center gap-1">
                                {/* Secondary actions are grouped and de-emphasized */}
                                <Button
                                    variant="ghost"
                                    className="h-9 w-9 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 p-0 shrink-0"
                                    onClick={handleDuplicate}
                                    disabled={isDuplicating}
                                    title="Duplicar"
                                >
                                    {isDuplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                                </Button>

                                {/* Admin Edit Button */}
                                {isAdmin && (
                                    <Button
                                        variant="ghost"
                                        className="h-9 w-9 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 p-0 shrink-0"
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
