import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Utensils } from 'lucide-react'
import Link from 'next/link'

export default async function RecipeDetailPage({ params }: { params: { id: string } }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: recipe, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !recipe) {
        notFound()
    }

    // Calculate total macros
    const ingredients = recipe.ingredients_data || []
    const totalMacros = ingredients.reduce((totals: any, ing: any) => {
        const factor = ing.quantity_grams / 100
        return {
            kcal: totals.kcal + (ing.kcal_100g || 0) * factor,
            protein: totals.protein + (ing.protein_100g || 0) * factor,
            carbs: totals.carbs + (ing.carbs_100g || 0) * factor,
            fat: totals.fat + (ing.fat_100g || 0) * factor,
            fiber: totals.fiber + (ing.fiber_100g || 0) * factor,
        }
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/recipes">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{recipe.name}</h2>
                    {recipe.description && (
                        <p className="text-muted-foreground">{recipe.description}</p>
                    )}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Macros Card */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Utensils className="h-5 w-5" />
                            Información nutricional
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Calorías totales</p>
                            <p className="text-3xl font-bold">{Math.round(totalMacros.kcal)}</p>
                            <p className="text-xs text-muted-foreground">kcal</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">Proteínas</p>
                                <p className="text-xl font-bold">{Math.round(totalMacros.protein)}g</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">Carbos</p>
                                <p className="text-xl font-bold">{Math.round(totalMacros.carbs)}g</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">Grasas</p>
                                <p className="text-xl font-bold">{Math.round(totalMacros.fat)}g</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">Fibra</p>
                                <p className="text-xl font-bold">{Math.round(totalMacros.fiber)}g</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Ingredients List */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Ingredientes ({ingredients.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {ingredients.map((ing: any, index: number) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium">{ing.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {ing.quantity_grams}g
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">
                                            {Math.round((ing.kcal_100g * ing.quantity_grams) / 100)} kcal
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            P: {Math.round((ing.protein_100g * ing.quantity_grams) / 100)}g |
                                            C: {Math.round((ing.carbs_100g * ing.quantity_grams) / 100)}g |
                                            G: {Math.round((ing.fat_100g * ing.quantity_grams) / 100)}g
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
