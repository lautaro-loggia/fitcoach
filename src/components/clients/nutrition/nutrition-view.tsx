'use client'

import { useState, useMemo } from 'react'
import { DailyProgressCard } from './daily-progress-card'
import { MealAccordionItem } from './meal-accordion-item'

interface NutritionViewProps {
    client: any
    mealPlan: any
    dailyLogs: any[]
}

export function NutritionView({ client, mealPlan, dailyLogs }: NutritionViewProps) {
    const [openStep, setOpenStep] = useState<string | null>(null)

    // Calculate Consumed Macros based on LOGGED meals
    const meals = mealPlan?.meals || []

    const consumed = useMemo(() => {
        let k = 0, p = 0, c = 0, f = 0

        meals.forEach((meal: any) => {
            // Check if this meal is logged
            const isLogged = dailyLogs.some((l: any) => l.meal_type === meal.name)

            if (isLogged) {
                // Add its macros
                meal.items?.forEach((item: any) => {
                    const recipe = item.recipe
                    let portions = item.portions || 1

                    if (recipe) {
                        // Quick calc from recipe macros if available
                        // Ideally we should use the same exact logic as MealAccordionItem (ingredients based)
                        // But for the summary card, using the recipe headers is faster and usually consistent enough.
                        // If ingredients_data exists, we could use that for precision, but let's stick to headers for perf.
                        if (recipe.macros_calories) {
                            const s = recipe.servings || 1
                            k += (recipe.macros_calories / s) * portions
                            p += ((recipe.macros_protein_g || 0) / s) * portions
                            c += ((recipe.macros_carbs_g || 0) / s) * portions
                            f += ((recipe.macros_fat_g || 0) / s) * portions
                        }
                    }
                })
            }
        })
        return { k, p, c, f }
    }, [meals, dailyLogs])

    const fullProgressData = {
        currentCalories: Math.round(consumed.k),
        targetCalories: client.target_calories || 2000,
        macros: {
            protein: { current: Math.round(consumed.p), target: client.target_protein || 150 },
            carbs: { current: Math.round(consumed.c), target: client.target_carbs || 200 },
            fats: { current: Math.round(consumed.f), target: client.target_fats || 60 }
        }
    }
    const sortedMeals = [...meals].sort((a: any, b: any) => a.sort_order - b.sort_order)

    return (
        <div className="space-y-6 pb-10">
            {/* 1. Daily Progress */}
            <DailyProgressCard {...fullProgressData} />

            {/* 2. Headline */}
            <div className="space-y-1 px-1">
                <h2 className="text-[19px] font-bold text-black">Tu menu de hoy</h2>
                <p className="text-gray-400 text-[13px] leading-tight">Registra tus comidas parar completas tus objetivos</p>
            </div>

            <div className="space-y-6">
                {sortedMeals.length > 0 ? (
                    sortedMeals.map((meal: any) => {
                        // Find log for this meal
                        const log = dailyLogs.find((l: any) => l.meal_type === meal.name)

                        return (
                            <MealAccordionItem
                                key={meal.id}
                                meal={meal}
                                log={log}
                                isOpen={openStep === meal.id}
                                onToggle={() => setOpenStep(openStep === meal.id ? null : meal.id)}
                                clientId={client.id}
                            />
                        )
                    })
                ) : (
                    <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-gray-400 font-medium">No hay comidas planificadas para hoy.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
