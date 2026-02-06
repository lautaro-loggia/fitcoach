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
import { Plus, X, Clock, Users, Camera, Loader2 } from 'lucide-react'
import { IngredientSelector } from './ingredient-selector'
import { createRecipeAction, RecipeIngredient } from '@/app/(dashboard)/recipes/actions'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface SelectedIngredient {
    id: string
    name: string
    kcal_100g: number
    protein_100g: number
    carbs_100g: number
    fat_100g: number
    fiber_100g: number
    quantity_grams: number
    unit: string
    quantity: number
}

interface AddRecipeDialogProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onSuccess?: (recipe: any) => void
    defaultMealType?: string
}

export function AddRecipeDialog({ open: controlledOpen, onOpenChange, onSuccess, defaultMealType }: AddRecipeDialogProps = {}) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? onOpenChange! : setInternalOpen

    const [loading, setLoading] = useState(false)
    const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([])
    const [recipeName, setRecipeName] = useState('')
    const [mealType, setMealType] = useState(defaultMealType || '')
    const [servings, setServings] = useState(1)
    const [prepTime, setPrepTime] = useState(0)
    const [imageUrl, setImageUrl] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const router = useRouter()

    const handleAddIngredient = (ingredient: any, grams: number, unit: string, quantity: number) => {
        setSelectedIngredients([...selectedIngredients, {
            id: ingredient.id,
            name: ingredient.name,
            kcal_100g: ingredient.kcal_100g,
            protein_100g: ingredient.protein_100g,
            carbs_100g: ingredient.carbs_100g,
            fat_100g: ingredient.fat_100g,
            fiber_100g: ingredient.fiber_100g,
            quantity_grams: grams,
            unit: unit,
            quantity: quantity,
        }])
    }

    const handleRemoveIngredient = (index: number) => {
        setSelectedIngredients(selectedIngredients.filter((_, i) => i !== index))
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return
        setIsUploading(true)
        const file = e.target.files[0]

        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No se encontró sesión de usuario')

            const fileExt = file.name.split('.').pop()
            const fileName = `recipes/${user.id}/${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('recipe-images')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('recipe-images')
                .getPublicUrl(fileName)

            setImageUrl(publicUrl)
        } catch (error: any) {
            console.error('Upload error:', error)
            alert(`Error al subir la imagen: ${error.message}`)
        } finally {
            setIsUploading(false)
        }
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
            unit: ing.unit,
            quantity: ing.quantity,
        }))

        const result = await createRecipeAction({
            name: recipeName,
            meal_type: mealType,
            servings: servings,
            prep_time_min: prepTime,
            instructions: '',
            ingredients: recipeIngredients,
            image_url: imageUrl || null
        })

        if (result?.error) {
            alert(result.error)
        } else if (result.recipe) {
            resetForm()
            if (onSuccess) {
                onSuccess(result.recipe)
            } else {
                setOpen(false)
                // Navigate to the new recipe for editing only if no onSuccess is provided
                router.push(`/recipes/${result.recipe.id}`)
            }
        }
        setLoading(false)
    }

    const resetForm = () => {
        setSelectedIngredients([])
        setRecipeName('')
        setMealType('')
        setServings(1)
        setPrepTime(0)
        setImageUrl('')
        setIsUploading(false)
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
            {!isControlled && (
                <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90 text-white">
                        <Plus className="mr-2 h-4 w-4" /> Nueva receta
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Crear nueva receta</DialogTitle>
                    <DialogDescription>
                        Agregá los ingredientes y la información básica de la receta
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Image & Basic Info Row */}
                    <div className="flex gap-6 items-start">
                        {/* Image Upload Area */}
                        <div className="space-y-2">
                            <Label>Imagen</Label>
                            <div className="relative h-32 w-32 rounded-xl overflow-hidden bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors group cursor-pointer"
                                onClick={() => document.getElementById('recipe-image-upload')?.click()}>
                                {imageUrl ? (
                                    <Image
                                        src={imageUrl}
                                        alt="Recipe"
                                        fill
                                        className="object-cover"
                                    />
                                ) : isUploading ? (
                                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                ) : (
                                    <div className="flex flex-col items-center gap-1 text-muted-foreground group-hover:text-primary">
                                        <Camera className="h-8 w-8" />
                                        <span className="text-[10px] font-medium">Subir</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    id="recipe-image-upload"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                            </div>
                            {imageUrl && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="w-full h-7 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => setImageUrl('')}
                                >
                                    Quitar foto
                                </Button>
                            )}
                        </div>

                        <div className="flex-1 grid grid-cols-2 gap-4">
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
                                                    {ing.unit && ing.unit !== 'g' ? `${ing.quantity} ${ing.unit} (${Math.round(ing.quantity_grams)}g)` : `${ing.quantity_grams}g`} · {Math.round(ingKcal)} kcal
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
                            disabled={loading || isUploading || selectedIngredients.length === 0 || !recipeName.trim()}
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
