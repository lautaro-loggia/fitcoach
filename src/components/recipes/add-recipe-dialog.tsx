'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Plus, X, Clock, Users } from 'lucide-react'
import { IngredientSelector } from './ingredient-selector'
import { createRecipeAction, RecipeIngredient } from '@/app/(dashboard)/recipes/actions'

interface SelectedIngredient {
    id: string
    name: string
    kcal_100g: number
    protein_100g: number
    carbs_100g: number
    fat_100g: number
    fiber_100g: number
    quantity_grams: number
}

export function AddRecipeDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([])
    const [recipeName, setRecipeName] = useState('')
    const [mealType, setMealType] = useState('')
    const [servings, setServings] = useState(1)
    const [prepTime, setPrepTime] = useState(0)
    const router = useRouter()

    const handleAddIngredient = (ingredient: any, quantity: number) => {
        setSelectedIngredients([...selectedIngredients, {
            id: ingredient.id,
            name: ingredient.name,
            kcal_100g: ingredient.kcal_100g,
            protein_100g: ingredient.protein_100g,
            carbs_100g: ingredient.carbs_100g,
            fat_100g: ingredient.fat_100g,
            fiber_100g: ingredient.fiber_100g,
            quantity_grams: quantity,
        }])
    }

    const handleRemoveIngredient = (index: number) => {
        setSelectedIngredients(selectedIngredients.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        // Transform SelectedIngredient to RecipeIngredient format
        const recipeIngredients: RecipeIngredient[] = selectedIngredients.map(ing => ({
            ingredient_code: ing.id,
            ingredient_name: ing.name,
            grams: ing.quantity_grams,
            kcal_100g: ing.kcal_100g,
            protein_100g: ing.protein_100g,
            carbs_100g: ing.carbs_100g,
            fat_100g: ing.fat_100g,
            fiber_100g: ing.fiber_100g,
        }))

        const result = await createRecipeAction({
            name: recipeName,
            meal_type: mealType,
            servings: servings,
            prep_time_min: prepTime,
            instructions: '',
            ingredients: recipeIngredients,
        })

        if (result?.error) {
            alert(result.error)
        } else if (result.recipe) {
            setOpen(false)
            resetForm()
            // Navigate to the new recipe for editing
            router.push(`/recipes/${result.recipe.id}`)
        }
        setLoading(false)
    }

    const resetForm = () => {
        setSelectedIngredients([])
        setRecipeName('')
        setMealType('')
        setServings(1)
        setPrepTime(0)
    }

    // Calculate total macros
    const totalMacros = selectedIngredients.reduce((totals, ing) => {
        const factor = ing.quantity_grams / 100
        return {
            kcal: totals.kcal + (ing.kcal_100g || 0) * factor,
            protein: totals.protein + (ing.protein_100g || 0) * factor,
            carbs: totals.carbs + (ing.carbs_100g || 0) * factor,
            fat: totals.fat + (ing.fat_100g || 0) * factor,
        }
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })

    const macrosPerServing = {
        kcal: totalMacros.kcal / servings,
        protein: totalMacros.protein / servings,
        carbs: totalMacros.carbs / servings,
        fat: totalMacros.fat / servings,
    }

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            setOpen(newOpen)
            if (!newOpen) resetForm()
        }}>
            <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white">
                    <Plus className="mr-2 h-4 w-4" /> Nueva receta
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Crear nueva receta</DialogTitle>
                    <DialogDescription>
                        Agregá los ingredientes y la información básica de la receta
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="recipeName">Nombre de la receta *</Label>
                            <Input
                                id="recipeName"
                                value={recipeName}
                                onChange={(e) => setRecipeName(e.target.value)}
                                placeholder="Ej: Pollo con arroz integral"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo de comida</Label>
                            <Select value={mealType} onValueChange={setMealType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="desayuno">Desayuno</SelectItem>
                                    <SelectItem value="almuerzo">Almuerzo</SelectItem>
                                    <SelectItem value="cena">Cena</SelectItem>
                                    <SelectItem value="snack">Snack</SelectItem>
                                    <SelectItem value="postre">Postre</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="servings">
                                <Users className="h-3.5 w-3.5 inline mr-1" />
                                Porciones
                            </Label>
                            <Input
                                id="servings"
                                type="number"
                                min="1"
                                value={servings}
                                onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="prepTime">
                                <Clock className="h-3.5 w-3.5 inline mr-1" />
                                Tiempo de preparación (min)
                            </Label>
                            <Input
                                id="prepTime"
                                type="number"
                                min="0"
                                value={prepTime}
                                onChange={(e) => setPrepTime(parseInt(e.target.value) || 0)}
                            />
                        </div>
                    </div>

                    {/* Ingredient Selector */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3">Ingredientes</h3>
                        <IngredientSelector onAdd={handleAddIngredient} />
                    </div>

                    {selectedIngredients.length > 0 && (
                        <div className="border rounded-lg p-4 bg-muted/20">
                            <div className="space-y-2">
                                {selectedIngredients.map((ing, index) => {
                                    const factor = ing.quantity_grams / 100
                                    const ingKcal = (ing.kcal_100g || 0) * factor
                                    return (
                                        <div key={index} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                                            <div className="flex-1">
                                                <p className="font-medium">{ing.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {ing.quantity_grams}g · {Math.round(ingKcal)} kcal
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveIngredient(index)}
                                                className="hover:bg-destructive/10 text-destructive"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Macros Summary */}
                    <div className="border-t pt-4">
                        <p className="text-sm text-muted-foreground mb-2">Por porción ({servings} {servings === 1 ? 'porción' : 'porciones'})</p>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-muted dark:bg-muted/20 rounded-lg">
                                <p className="text-xl font-bold text-primary dark:text-primary">{Math.round(macrosPerServing.kcal)}</p>
                                <p className="text-xs text-muted-foreground">kcal</p>
                            </div>
                            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{Math.round(macrosPerServing.protein)}g</p>
                                <p className="text-xs text-muted-foreground">Proteínas</p>
                            </div>
                            <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{Math.round(macrosPerServing.carbs)}g</p>
                                <p className="text-xs text-muted-foreground">Carbos</p>
                            </div>
                            <div className="text-center p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                                <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{Math.round(macrosPerServing.fat)}g</p>
                                <p className="text-xs text-muted-foreground">Grasas</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || selectedIngredients.length === 0 || !recipeName.trim()}
                            className="bg-primary text-white hover:bg-primary/90"
                        >
                            {loading ? 'Creando...' : 'Crear receta'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
