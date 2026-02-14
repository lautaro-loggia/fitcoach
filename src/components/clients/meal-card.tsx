'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Utensils, Clock, X, ChefHat, Loader2 } from 'lucide-react'

interface Ingredient {
    ingredient_name?: string
    grams: number
    unit?: string
    quantity?: number
    kcal_100g?: number
    protein_100g?: number
    carbs_100g?: number
    fat_100g?: number
}

interface Recipe {
    id: string
    name: string
    prep_time_min?: number | null
    image_url?: string | null
    servings?: number | null
    macros_calories?: number | null
    macros_protein_g?: number | null
    macros_carbs_g?: number | null
    macros_fat_g?: number | null
    ingredients?: Ingredient[] | null
    ingredients_data?: Ingredient[] | null
    instructions?: string | null
}

interface MealItemProps {
    item: {
        id: string
        portions: number
        custom_name?: string | null
        recipe?: Recipe | null
    }
    mealName?: string
}

export function MealCard({ item, mealName }: MealItemProps) {
    const [isOpen, setIsOpen] = useState(false)
    const recipe = item.recipe

    // If there's no recipe, we can't show much detail, but we handle it gracefully
    if (!recipe) {
        return (
            <div className="flex gap-3 items-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <Utensils className="h-5 w-5 text-gray-400" />
                </div>
                <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.custom_name || "Comida personalizada"}</p>
                    <p className="text-xs text-gray-500">Sin receta vinculada</p>
                </div>
            </div>
        )
    }

    const ingredientsList = (recipe.ingredients || recipe.ingredients_data || []) as Ingredient[]

    // Calculate Macros
    const getUnitMacros = () => {
        const hasNutritionalData = ingredientsList.some(ing => (ing.kcal_100g || 0) > 0)

        // 1. Use manual macros if no ingredient data
        if (!hasNutritionalData && recipe.macros_calories) {
            const servings = recipe.servings || 1
            return {
                kcal: (recipe.macros_calories || 0) / servings,
                protein: (recipe.macros_protein_g || 0) / servings,
                carbs: (recipe.macros_carbs_g || 0) / servings,
                fat: (recipe.macros_fat_g || 0) / servings,
            }
        }

        // 2. Calculate from ingredients
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

    const unitMacros = getUnitMacros()
    const portions = item.portions || 1
    const totalMacros = {
        kcal: Math.round(unitMacros.kcal * portions),
        protein: Math.round(unitMacros.protein * portions),
        carbs: Math.round(unitMacros.carbs * portions),
        fat: Math.round(unitMacros.fat * portions),
    }

    const title = item.custom_name || recipe.name

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <div className="group flex gap-3 items-center p-3 bg-white rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-blue-200 transition-colors">
                    {/* Icon / Image - Summary Card */}
                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden relative">
                        {recipe.image_url ? (
                            <Image
                                src={recipe.image_url}
                                alt={title}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <Utensils className="h-5 w-5 text-gray-400" />
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate leading-tight mb-1">{title}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                            <span className="font-medium text-gray-700">{totalMacros.kcal} kcal</span>
                            <span className="text-gray-300">|</span>
                            <span className="text-blue-600 font-medium">P: {totalMacros.protein}g</span>
                            <span className="text-amber-600 font-medium">C: {totalMacros.carbs}g</span>
                            <span className="text-rose-600 font-medium">G: {totalMacros.fat}g</span>
                        </div>
                    </div>
                </div>
            </DialogTrigger>

            <DialogContent className="max-w-[1200px] w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden bg-white border-0 shadow-xl rounded-3xl flex flex-col" showCloseButton={false}>
                {/* Header Image */}
                <div className="relative w-full aspect-[16/9] bg-gray-100 flex items-center justify-center shrink-0">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-300 absolute z-0" />
                    {recipe.image_url ? (
                        <Image
                            src={recipe.image_url}
                            alt={title}
                            fill
                            className="object-cover relative z-10"
                            onLoadingComplete={(img) => {
                                img.parentElement?.querySelector('.animate-spin')?.classList.add('hidden')
                            }}
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                            <Utensils className="h-16 w-16 opacity-20" />
                        </div>
                    )}

                    {/* Badge Overlay - Meal Name (Top Left) */}
                    {mealName && (
                        <div className="absolute top-4 left-4 z-10">
                            <div className="px-3 py-1 bg-[#EAD8B2] text-[#4A3B29] text-xs font-bold rounded-full shadow-sm">
                                {mealName}
                            </div>
                        </div>
                    )}

                    {/* Close Button (Top Right) */}
                    <DialogClose className="absolute top-4 right-4 z-20 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition-colors ring-0 focus:ring-0 outline-none border-none">
                        <X className="h-4 w-4" />
                    </DialogClose>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-8 pb-24">
                        {/* Title & Meta */}
                        <div className="space-y-2">
                            <DialogTitle className="text-2xl font-bold text-gray-900 leading-tight">
                                {title}
                            </DialogTitle>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                {recipe.prep_time_min && (
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="h-4 w-4" />
                                        <span>{recipe.prep_time_min} min</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                    <ChefHat className="h-4 w-4" />
                                    <span>{portions} {portions === 1 ? 'porción' : 'porciones'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Macros Grid */}
                        <div className="grid grid-cols-4 gap-2">
                            <MacroCard value={totalMacros.kcal} label="KCAL" color="bg-gray-50 text-gray-900" subColor="text-gray-500" />
                            <MacroCard value={`${totalMacros.protein}g`} label="PROT" color="bg-blue-50 text-blue-600" subColor="text-blue-600/60" />
                            <MacroCard value={`${totalMacros.carbs}g`} label="CARBS" color="bg-amber-50 text-amber-600" subColor="text-amber-600/60" />
                            <MacroCard value={`${totalMacros.fat}g`} label="GRASAS" color="bg-rose-50 text-rose-600" subColor="text-rose-600/60" />
                        </div>

                        {/* Ingredients Section */}
                        {ingredientsList.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-lg font-bold text-gray-900">Ingredientes</h4>
                                <div className="grid gap-2">
                                    {ingredientsList.map((ing, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                                            <span className="font-medium text-gray-800">{ing.ingredient_name || 'Ingrediente'}</span>
                                            <span className="text-sm font-semibold text-gray-500 bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm">
                                                {ing.quantity && ing.unit ? `${ing.quantity} ${ing.unit}` : `${Math.round(ing.grams * portions)}g`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Instructions Section */}
                        {recipe.instructions && (
                            <div className="space-y-3">
                                <h4 className="text-lg font-bold text-gray-900">Preparación</h4>
                                <div className="p-4 rounded-xl border border-blue-50 bg-blue-50/20">
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                        {recipe.instructions}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sticky Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
                    <DialogClose asChild className="pointer-events-auto">
                        <Button
                            className="w-full h-12 rounded-xl text-base font-semibold shadow-lg"
                            variant="default"
                        >
                            Cerrar
                        </Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function MacroCard({ value, label, color, subColor }: { value: string | number, label: string, color: string, subColor: string }) {
    return (
        <div className={`flex flex-col items-center justify-center p-3 rounded-2xl ${color}`}>
            <span className="text-lg font-bold">{value}</span>
            <span className={`text-[10px] uppercase font-bold ${subColor}`}>{label}</span>
        </div>
    )
}
