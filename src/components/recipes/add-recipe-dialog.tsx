'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { IngredientSelector } from './ingredient-selector'

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

        const formData = new FormData(e.currentTarget)
        const { createRecipeAction } = await import('@/app/(dashboard)/recipes/actions')

        const result = await createRecipeAction({
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            meal_type: formData.get('meal_type') as string,
            ingredients: selectedIngredients,
        })

        if (result?.error) {
            alert(result.error)
        } else {
            setOpen(false)
            setSelectedIngredients([])
            router.refresh()
        }
        setLoading(false)
    }

    // Calculate total macros
    const totalMacros = selectedIngredients.reduce((totals, ing) => {
        const factor = ing.quantity_grams / 100
        return {
            kcal: totals.kcal + ing.kcal_100g * factor,
            protein: totals.protein + ing.protein_100g * factor,
            carbs: totals.carbs + ing.carbs_100g * factor,
            fat: totals.fat + ing.fat_100g * factor,
        }
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white">
                    <Plus className="mr-2 h-4 w-4" /> Nueva receta
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nueva receta</DialogTitle>
                    <DialogDescription>
                        Creá una plantilla de comida para reutilizar en las dietas
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre de la receta *</Label>
                        <Input id="name" name="name" placeholder="Ej: Pollo con arroz y verduras" required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción (opcional)</Label>
                        <Input id="description" name="description" placeholder="Instrucciones de preparación..." />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="meal_type">Tipo de comida</Label>
                        <Select name="meal_type">
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="breakfast">Desayuno</SelectItem>
                                <SelectItem value="lunch">Almuerzo</SelectItem>
                                <SelectItem value="dinner">Cena</SelectItem>
                                <SelectItem value="snack">Snack</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="font-semibold mb-3">Ingredientes</h4>
                        <IngredientSelector onAdd={handleAddIngredient} />

                        {selectedIngredients.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {selectedIngredients.map((ing, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                        <div className="flex-1">
                                            <p className="font-medium">{ing.name}</p>
                                            <p className="text-sm text-muted-foreground">{ing.quantity_grams}g</p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveIngredient(index)}
                                        >
                                            Eliminar
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedIngredients.length > 0 && (
                        <div className="border-t pt-4">
                            <h4 className="font-semibold mb-3">Totales</h4>
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">Calorías</p>
                                    <p className="text-xl font-bold">{Math.round(totalMacros.kcal)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Proteínas</p>
                                    <p className="text-xl font-bold">{Math.round(totalMacros.protein)}g</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Carbos</p>
                                    <p className="text-xl font-bold">{Math.round(totalMacros.carbs)}g</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Grasas</p>
                                    <p className="text-xl font-bold">{Math.round(totalMacros.fat)}g</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || selectedIngredients.length === 0}
                            className="bg-primary text-white hover:bg-primary/90"
                        >
                            {loading ? 'Guardando...' : 'Crear receta'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
