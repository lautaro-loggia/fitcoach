'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
    ArrowLeft,
    Save,
    Copy,
    Trash2,
    Plus,
    X,
    Loader2,
    Camera,
    Utensils,
    Clock,
    Users,
    AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import {
    updateRecipeAction,
    duplicateRecipeAction,
    deleteRecipeAction,
    getIngredientsAction,
    RecipeIngredient,
} from '@/app/(dashboard)/recipes/actions'
import { createClient } from '@/lib/supabase/client'

interface Ingredient {
    id: string
    name: string
    kcal_100g: number
    protein_100g: number
    carbs_100g: number
    fat_100g: number
    fiber_100g: number
}

interface RecipeEditorProps {
    recipe: {
        id: string
        name: string
        meal_type: string | null
        servings: number | null
        prep_time_min: number | null
        instructions: string | null
        image_url: string | null
        ingredients: RecipeIngredient[] | null
        ingredients_data?: RecipeIngredient[] | null
        macros_calories?: number | null
        macros_protein_g?: number | null
        macros_carbs_g?: number | null
        macros_fat_g?: number | null
        trainer_id?: string
    }
    userId?: string
    isAdmin?: boolean
}

export function RecipeEditor({ recipe, userId, isAdmin = false }: RecipeEditorProps) {
    const router = useRouter()
    const [isSaving, setIsSaving] = useState(false)
    const [isDuplicating, setIsDuplicating] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    // Check ownership or admin status
    const isOwner = recipe.trainer_id === userId
    const canEdit = isOwner || isAdmin

    // Form state
    const [name, setName] = useState(recipe.name)
    const [mealType, setMealType] = useState(recipe.meal_type || '')
    const [servings, setServings] = useState(recipe.servings || 1)
    const [prepTime, setPrepTime] = useState(recipe.prep_time_min || 0)
    const [instructions, setInstructions] = useState(recipe.instructions || '')
    const [imageUrl, setImageUrl] = useState(recipe.image_url || '')

    // Ingredients state
    const initialIngredients = Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : (Array.isArray(recipe.ingredients_data) ? recipe.ingredients_data : [])

    const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>(initialIngredients)

    // Available ingredients from DB
    const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([])
    const [loadingIngredients, setLoadingIngredients] = useState(true)

    // Load available ingredients
    useEffect(() => {
        async function loadIngredients() {
            const result = await getIngredientsAction()
            if (result.ingredients) {
                setAvailableIngredients(result.ingredients)
            }
            setLoadingIngredients(false)
        }
        loadIngredients()
    }, [])

    // Calculate total macros
    const calculateTotalMacros = useCallback(() => {
        // Check if ingredients have nutritional data
        const hasNutritionalData = recipeIngredients.some(
            ing => (ing.kcal_100g || 0) > 0
        )

        // If ingredients don't have nutritional data, use the recipe's stored macros
        if (!hasNutritionalData && recipe.macros_calories) {
            return {
                kcal: recipe.macros_calories || 0,
                protein: recipe.macros_protein_g || 0,
                carbs: recipe.macros_carbs_g || 0,
                fat: recipe.macros_fat_g || 0,
                fiber: 0,
            }
        }

        // Otherwise calculate from ingredients
        return recipeIngredients.reduce(
            (acc, ing) => {
                const factor = (ing.grams || 0) / 100
                return {
                    kcal: acc.kcal + (ing.kcal_100g || 0) * factor,
                    protein: acc.protein + (ing.protein_100g || 0) * factor,
                    carbs: acc.carbs + (ing.carbs_100g || 0) * factor,
                    fat: acc.fat + (ing.fat_100g || 0) * factor,
                    fiber: acc.fiber + (ing.fiber_100g || 0) * factor,
                }
            },
            { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
        )
    }, [recipeIngredients, recipe.macros_calories, recipe.macros_protein_g, recipe.macros_carbs_g, recipe.macros_fat_g])

    const totalMacros = calculateTotalMacros()
    const macrosPerServing = {
        kcal: totalMacros.kcal / servings,
        protein: totalMacros.protein / servings,
        carbs: totalMacros.carbs / servings,
        fat: totalMacros.fat / servings,
        fiber: totalMacros.fiber / servings,
    }

    // Add ingredient
    const handleAddIngredient = () => {
        setRecipeIngredients([
            ...recipeIngredients,
            {
                ingredient_code: '',
                ingredient_name: '',
                grams: 100,
                kcal_100g: 0,
                protein_100g: 0,
                carbs_100g: 0,
                fat_100g: 0,
                fiber_100g: 0,
            },
        ])
    }

    // Remove ingredient
    const handleRemoveIngredient = (index: number) => {
        setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index))
    }

    // Update ingredient selection
    const handleIngredientChange = (index: number, ingredientId: string) => {
        const selected = availableIngredients.find((ing) => ing.id === ingredientId)
        if (!selected) return

        const updated = [...recipeIngredients]
        updated[index] = {
            ...updated[index],
            ingredient_code: ingredientId,
            ingredient_name: selected.name,
            kcal_100g: selected.kcal_100g || 0,
            protein_100g: selected.protein_100g || 0,
            carbs_100g: selected.carbs_100g || 0,
            fat_100g: selected.fat_100g || 0,
            fiber_100g: selected.fiber_100g || 0,
        }
        setRecipeIngredients(updated)
    }

    // Update ingredient grams
    const handleGramsChange = (index: number, grams: number) => {
        const updated = [...recipeIngredients]
        updated[index] = { ...updated[index], grams }
        setRecipeIngredients(updated)
    }

    // Save recipe
    const handleSave = async () => {
        setIsSaving(true)
        const result = await updateRecipeAction(recipe.id, {
            name,
            meal_type: mealType,
            servings,
            prep_time_min: prepTime,
            instructions,
            ingredients: recipeIngredients,
            image_url: imageUrl || null,
        })

        if (result.error) {
            alert(result.error)
        } else {
            router.push('/recipes')
        }
        setIsSaving(false)
    }

    // Duplicate recipe
    const handleDuplicate = async () => {
        setIsDuplicating(true)
        const result = await duplicateRecipeAction(recipe.id)
        if (result.error) {
            alert(result.error)
        } else if (result.recipe) {
            router.push(`/recipes/${result.recipe.id}`)
        }
        setIsDuplicating(false)
    }

    // Delete recipe
    const handleDelete = async () => {
        setIsDeleting(true)
        const result = await deleteRecipeAction(recipe.id)
        if (result.error) {
            alert(result.error)
        } else {
            router.push('/recipes')
        }
        setIsDeleting(false)
    }

    // Image upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return
        setIsUploading(true)
        const file = e.target.files[0]

        const supabase = createClient()
        const fileExt = file.name.split('.').pop()
        const fileName = `recipes/${recipe.id}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('recipe-images')
            .upload(fileName, file)

        if (uploadError) {
            console.error('Upload error:', uploadError)
            alert(`Error al subir la imagen: ${uploadError.message}`)
            setIsUploading(false)
            return
        }

        const { data: { publicUrl } } = supabase.storage
            .from('recipe-images')
            .getPublicUrl(fileName)

        setImageUrl(publicUrl)
        setIsUploading(false)
    }

    return (
        <div className="space-y-6">
            {!canEdit && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                Estás viendo una receta base o de otro usuario.<br />
                                Para editarla, debés <strong>duplicarla</strong> primero.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/recipes">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold">Editar Receta</h2>
                        <p className="text-muted-foreground text-sm">
                            Modificá los ingredientes y la información de la receta
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleDuplicate}
                        disabled={isDuplicating}
                    >
                        {isDuplicating ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Copy className="h-4 w-4 mr-2" />
                        )}
                        Duplicar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || isUploading || !canEdit}
                        className="bg-primary"
                    >
                        {isSaving || isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        {isUploading ? 'Subiendo...' : 'Guardar cambios'}
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left Column: Basic Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Image & Basic Info Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Utensils className="h-5 w-5" />
                                Información básica
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Image */}
                            <div className="space-y-2">
                                <Label>Imagen de la receta</Label>
                                <div className="flex items-start gap-4">
                                    <div className="relative h-32 w-32 rounded-lg overflow-hidden bg-muted flex items-center justify-center border-2 border-dashed">
                                        {imageUrl ? (
                                            <Image
                                                src={imageUrl}
                                                alt="Recipe"
                                                fill
                                                sizes="128px"
                                                className="object-cover"
                                            />
                                        ) : isUploading ? (
                                            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                                        ) : (
                                            <Camera className="h-8 w-8 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                            id="recipe-image"
                                            disabled={!canEdit}
                                        />
                                        {canEdit && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => document.getElementById('recipe-image')?.click()}
                                                >
                                                    <Camera className="h-4 w-4 mr-2" />
                                                    {imageUrl ? 'Cambiar' : 'Subir imagen'}
                                                </Button>
                                                {imageUrl && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setImageUrl('')}
                                                    >
                                                        <X className="h-4 w-4 mr-2" />
                                                        Quitar
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre de la receta *</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej: Pollo con arroz integral"
                                />
                            </div>

                            {/* Row: Meal Type, Servings, Prep Time */}
                            <div className="grid grid-cols-3 gap-4">
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
                                    <Label htmlFor="prep_time">
                                        <Clock className="h-3.5 w-3.5 inline mr-1" />
                                        Tiempo (min)
                                    </Label>
                                    <Input
                                        id="prep_time"
                                        type="number"
                                        min="0"
                                        value={prepTime}
                                        onChange={(e) => setPrepTime(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="space-y-2">
                                <Label htmlFor="instructions">Instrucciones de preparación</Label>
                                <Textarea
                                    id="instructions"
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                    placeholder="Describí los pasos para preparar la receta..."
                                    rows={4}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Ingredients Card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Ingredientes ({recipeIngredients.length})</CardTitle>
                            <Button size="sm" onClick={handleAddIngredient}>
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {loadingIngredients ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : recipeIngredients.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No hay ingredientes. Agregá uno para empezar.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Header */}
                                    <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-2">
                                        <div className="col-span-5">Ingrediente</div>
                                        <div className="col-span-2">Gramos</div>
                                        <div className="col-span-4 text-right">Macros</div>
                                        <div className="col-span-1"></div>
                                    </div>

                                    {recipeIngredients.map((ing, index) => {
                                        const factor = (ing.grams || 0) / 100
                                        const hasNutritionalData = (ing.kcal_100g || 0) > 0
                                        const ingMacros = hasNutritionalData ? {
                                            kcal: (ing.kcal_100g || 0) * factor,
                                            protein: (ing.protein_100g || 0) * factor,
                                            carbs: (ing.carbs_100g || 0) * factor,
                                            fat: (ing.fat_100g || 0) * factor,
                                        } : null

                                        // Check if ingredient_code exists in database
                                        const existsInDB = ing.ingredient_code && availableIngredients.some(
                                            avail => avail.id === ing.ingredient_code
                                        )

                                        // Ingredient from CSV (no valid ingredient_code, readonly)
                                        if (!existsInDB) {
                                            return (
                                                <div
                                                    key={index}
                                                    className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border bg-muted/30"
                                                >
                                                    <div className="col-span-5 text-sm">
                                                        {ing.ingredient_name || 'Ingrediente sin nombre'}
                                                    </div>
                                                    <div className="col-span-2 text-sm text-muted-foreground">
                                                        {ing.grams}g
                                                    </div>
                                                    <div className="col-span-4 text-right text-xs text-muted-foreground">
                                                        -
                                                    </div>
                                                    <div className="col-span-1 flex justify-end">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                                            onClick={() => handleRemoveIngredient(index)}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )
                                        }

                                        // Editable ingredient from database
                                        return (
                                            <div
                                                key={index}
                                                className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="col-span-5">
                                                    <Select
                                                        value={ing.ingredient_code}
                                                        onValueChange={(val) => handleIngredientChange(index, val)}
                                                    >
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Seleccionar ingrediente" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {availableIngredients.map((option) => (
                                                                <SelectItem key={option.id} value={option.id}>
                                                                    {option.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="col-span-2">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        className="h-9"
                                                        value={ing.grams}
                                                        onChange={(e) =>
                                                            handleGramsChange(index, parseFloat(e.target.value) || 0)
                                                        }
                                                    />
                                                </div>
                                                <div className="col-span-4 text-right text-xs text-muted-foreground">
                                                    {ingMacros ? (
                                                        <>
                                                            <span className="font-medium text-foreground">{Math.round(ingMacros.kcal)}</span> kcal |{' '}
                                                            P: {Math.round(ingMacros.protein)}g |{' '}
                                                            C: {Math.round(ingMacros.carbs)}g |{' '}
                                                            G: {Math.round(ingMacros.fat)}g
                                                        </>
                                                    ) : (
                                                        <span className="italic">Sin datos nutricionales</span>
                                                    )}
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={() => handleRemoveIngredient(index)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Macros Summary & Actions */}
                <div className="space-y-6">
                    {/* Macros Summary Card */}
                    <Card className="sticky top-4">
                        <CardHeader>
                            <CardTitle>Información nutricional</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Por porción ({servings} {servings === 1 ? 'porción' : 'porciones'})
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Big calories */}
                            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                                    {Math.round(macrosPerServing.kcal)}
                                </p>
                                <p className="text-sm text-muted-foreground">kcal por porción</p>
                            </div>

                            {/* Macro grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        {Math.round(macrosPerServing.protein)}g
                                    </p>
                                    <p className="text-xs text-muted-foreground">Proteínas</p>
                                </div>
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                        {Math.round(macrosPerServing.carbs)}g
                                    </p>
                                    <p className="text-xs text-muted-foreground">Carbohidratos</p>
                                </div>
                                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                                        {Math.round(macrosPerServing.fat)}g
                                    </p>
                                    <p className="text-xs text-muted-foreground">Grasas</p>
                                </div>
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {Math.round(macrosPerServing.fiber)}g
                                    </p>
                                    <p className="text-xs text-muted-foreground">Fibra</p>
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="pt-3 border-t">
                                <p className="text-sm font-medium mb-2">Totales (receta completa)</p>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <div className="flex justify-between">
                                        <span>Calorías:</span>
                                        <span className="font-medium text-foreground">{Math.round(totalMacros.kcal)} kcal</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Proteínas:</span>
                                        <span>{Math.round(totalMacros.protein)}g</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Carbos:</span>
                                        <span>{Math.round(totalMacros.carbs)}g</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Grasas:</span>
                                        <span>{Math.round(totalMacros.fat)}g</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Danger Zone */}
                    {canEdit && (
                        <Card className="border-destructive/50">
                            <CardHeader>
                                <CardTitle className="text-destructive">Zona de peligro</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="destructive"
                                            className="w-full"
                                            disabled={isDeleting}
                                        >
                                            {isDeleting ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : (
                                                <Trash2 className="h-4 w-4 mr-2" />
                                            )}
                                            Eliminar receta
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Eliminar esta receta?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta acción no se puede deshacer. La receta será eliminada permanentemente.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleDelete}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                Eliminar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
