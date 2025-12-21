'use client'

import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Utensils } from 'lucide-react'

interface RecipeCardProps {
    recipe: {
        id: string
        name: string
        description: string | null
        meal_type: string | null
        ingredients_data: any
    }
}

export function RecipeCard({ recipe }: RecipeCardProps) {
    // Calculate total macros from ingredients
    const calculateMacros = () => {
        if (!recipe.ingredients_data || !Array.isArray(recipe.ingredients_data)) {
            return { kcal: 0, protein: 0, carbs: 0, fat: 0 }
        }

        return recipe.ingredients_data.reduce((totals, ing) => {
            const quantity = ing.quantity_grams || 0
            const factor = quantity / 100

            return {
                kcal: totals.kcal + (ing.kcal_100g || 0) * factor,
                protein: totals.protein + (ing.protein_100g || 0) * factor,
                carbs: totals.carbs + (ing.carbs_100g || 0) * factor,
                fat: totals.fat + (ing.fat_100g || 0) * factor,
            }
        }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })
    }

    const macros = calculateMacros()

    const mealTypeColors: Record<string, string> = {
        breakfast: 'bg-orange-100 text-orange-800',
        lunch: 'bg-blue-100 text-blue-800',
        dinner: 'bg-purple-100 text-purple-800',
        snack: 'bg-green-100 text-green-800',
    }

    return (
        <Link href={`/recipes/${recipe.id}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <Utensils className="h-8 w-8 text-primary" />
                        {recipe.meal_type && (
                            <Badge className={mealTypeColors[recipe.meal_type] || 'bg-gray-100 text-gray-800'}>
                                {recipe.meal_type === 'breakfast' && 'Desayuno'}
                                {recipe.meal_type === 'lunch' && 'Almuerzo'}
                                {recipe.meal_type === 'dinner' && 'Cena'}
                                {recipe.meal_type === 'snack' && 'Snack'}
                            </Badge>
                        )}
                    </div>
                    <CardTitle className="mt-4">{recipe.name}</CardTitle>
                    {recipe.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {recipe.description}
                        </p>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase">Calorías</p>
                            <p className="text-2xl font-bold">{Math.round(macros.kcal)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase">Proteínas</p>
                            <p className="text-2xl font-bold">{Math.round(macros.protein)}g</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase">Carbos</p>
                            <p className="text-lg font-semibold">{Math.round(macros.carbs)}g</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase">Grasas</p>
                            <p className="text-lg font-semibold">{Math.round(macros.fat)}g</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                    {recipe.ingredients_data?.length || 0} ingredientes
                </CardFooter>
            </Card>
        </Link>
    )
}
