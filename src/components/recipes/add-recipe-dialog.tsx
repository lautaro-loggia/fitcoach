'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Plus, X, Clock, Users, Camera, Loader2, ChevronRight, ChevronLeft, Check, PieChart, Utensils, Trash2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
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
    valid_units?: Record<string, number>
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
    const [step, setStep] = useState(1)
    const totalSteps = 3
    const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([])
    const [recipeName, setRecipeName] = useState('')
    const [mealType, setMealType] = useState(defaultMealType || '')
    const [servings, setServings] = useState(1)
    const [prepTime, setPrepTime] = useState(0)
    const [imageUrl, setImageUrl] = useState('')
    const [isUploading, setIsUploading] = useState(false)

    // New state for Bebidas
    const [manualMacros, setManualMacros] = useState({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
    const [servingUnit, setServingUnit] = useState('') // e.g., "1 taza", "300ml"

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
            valid_units: ingredient.valid_units
        }])
    }

    const handleQuantityChange = (index: number, newQuantity: number) => {
        const updated = [...selectedIngredients]
        const ing = updated[index]

        let grams = newQuantity
        if (ing.unit !== 'g' && ing.valid_units && ing.valid_units[ing.unit]) {
            grams = newQuantity * ing.valid_units[ing.unit]
        }

        updated[index] = { ...ing, quantity: newQuantity, quantity_grams: grams }
        setSelectedIngredients(updated)
    }

    const handleUnitChange = (index: number, newUnit: string) => {
        const updated = [...selectedIngredients]
        const ing = updated[index]

        let grams = ing.quantity
        if (newUnit !== 'g' && ing.valid_units && ing.valid_units[newUnit]) {
            grams = ing.quantity * ing.valid_units[newUnit]
        } else {
            // If switching to 'g', the quantity is the grams? Or should we keep the numeric value?
            // Usually if I have "1 cup" (200g) and switch to 'g', it should probably stay "1" or convert?
            // Simple approach: keep the number, recalc the grams. 
            // If I have 1 cup and switch to grams, it becomes 1 gram. That's usually annoying.
            // But if I have 200g and switch to cup, it becomes 200 cups.
            // Let's stick to: keep number, recalc grams based on new unit definition.
            grams = ing.quantity
        }

        updated[index] = { ...ing, unit: newUnit, quantity_grams: grams }
        setSelectedIngredients(updated)
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

        let finalName = recipeName
        if (mealType === 'bebida' && servingUnit?.trim()) {
            finalName = `${recipeName} (${servingUnit.trim()})`
        }

        const result = await createRecipeAction({
            name: finalName,
            meal_type: mealType,
            servings: servings,
            prep_time_min: prepTime,
            instructions: '',
            ingredients: recipeIngredients,
            image_url: imageUrl || null,
            manual_macros: (mealType === 'bebida' && selectedIngredients.length === 0) ? manualMacros : undefined
        })

        if (result?.error) {
            alert(result.error)
        } else if (result.recipe) {
            resetForm()
            if (onSuccess) {
                onSuccess(result.recipe)
                setOpen(false)
                router.refresh()
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
        setManualMacros({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
        setServingUnit('')
        setStep(1)
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

    // Use manual macros if it's a drink with no ingredients
    const activeMacros = (mealType === 'bebida' && selectedIngredients.length === 0)
        ? manualMacros
        : totalMacros

    const macrosPerServing = {
        kcal: activeMacros.kcal / servings,
        protein: activeMacros.protein / servings,
        carbs: activeMacros.carbs / servings,
        fat: activeMacros.fat / servings,
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
            <DialogContent className="w-full sm:max-w-[800px] h-[95vh] sm:h-[90vh] flex flex-col p-0 overflow-hidden">
                <div className="p-4 sm:p-6 pb-2">
                    <DialogHeader className="mb-4">
                        <DialogTitle>Crear nueva receta</DialogTitle>
                        <div className="pt-4">
                            <div className="flex justify-between text-xs font-medium text-muted-foreground mb-2">
                                <span>Paso {step} de {totalSteps}</span>
                                <span>{Math.round((step / totalSteps) * 100)}%</span>
                            </div>
                            <Progress value={(step / totalSteps) * 100} className="h-2" />
                        </div>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

                        {/* STEP 1: BASIC INFO */}
                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex flex-col md:flex-row gap-6">
                                    {/* Image Upload - Enhanced Visuals */}
                                    <div className="space-y-3 flex-shrink-0">
                                        <Label className="text-base font-semibold">Foto del plato</Label>
                                        <div className="relative h-40 md:h-48 w-full md:w-48 rounded-2xl overflow-hidden bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-all cursor-pointer group shadow-sm hover:shadow-md hover:bg-muted/50"
                                            onClick={() => document.getElementById('recipe-image-upload')?.click()}>
                                            {imageUrl ? (
                                                <Image
                                                    src={imageUrl}
                                                    alt="Recipe"
                                                    fill
                                                    className="object-cover transition-transform group-hover:scale-105"
                                                />
                                            ) : isUploading ? (
                                                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                                                    <Camera className="h-10 w-10" />
                                                    <span className="text-xs font-medium">Subir foto</span>
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
                                                className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => setImageUrl('')}
                                            >
                                                Quitar foto
                                            </Button>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-5">
                                        <div className="space-y-2">
                                            <Label htmlFor="recipeName" className="text-base font-semibold">Nombre de la receta</Label>
                                            <Input
                                                id="recipeName"
                                                value={recipeName}
                                                onChange={(e) => setRecipeName(e.target.value)}
                                                placeholder="Ej: Pollo al limón con papas"
                                                className="text-lg h-12"
                                                required
                                                autoFocus
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="mealType" className="text-base font-semibold">Tipo de comida</Label>
                                            <Select value={mealType} onValueChange={setMealType}>
                                                <SelectTrigger className="h-12">
                                                    <SelectValue placeholder="Seleccionar categoría" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="desayuno">Desayuno</SelectItem>
                                                    <SelectItem value="almuerzo">Almuerzo</SelectItem>
                                                    <SelectItem value="cena">Cena</SelectItem>
                                                    <SelectItem value="snack">Snack</SelectItem>
                                                    <SelectItem value="postre">Postre</SelectItem>
                                                    <SelectItem value="bebida">Bebidas</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}



                        {/* STEP 2: INGREDIENTS */}
                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            <Utensils className="h-5 w-5 text-primary" />
                                            Ingredientes
                                        </h3>
                                        <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                            {selectedIngredients.length} agregados
                                        </span>
                                    </div>

                                    <div className="p-1">
                                        <IngredientSelector onAdd={handleAddIngredient} />
                                    </div>

                                    {/* Editable Ingredient List */}
                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                                        {selectedIngredients.length === 0 ? (
                                            <div className="text-center py-10 border-2 border-dashed rounded-xl text-muted-foreground bg-muted/20">
                                                <p>No hay ingredientes agregados aún.</p>
                                                <p className="text-xs mt-1">Buscá y agregá arriba para empezar.</p>
                                            </div>
                                        ) : (
                                            selectedIngredients.map((ing, index) => {
                                                const factor = ing.quantity_grams / 100
                                                const ingKcal = (ing.kcal_100g || 0) * factor
                                                return (
                                                    <div key={index} className="flex gap-2 sm:gap-3 items-center p-3 bg-card border rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium truncate text-sm sm:text-base" title={ing.name}>{ing.name}</p>
                                                            <p className="text-xs text-muted-foreground">{Math.round(ingKcal)} kcal</p>
                                                        </div>

                                                        {/* Editable Quantity */}
                                                        <div className="flex gap-1 sm:gap-2 items-center">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                className="h-8 w-16 sm:w-20 text-center px-1 text-sm"
                                                                value={ing.quantity || 0}
                                                                onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value) || 0)}
                                                            />
                                                            <Select
                                                                value={ing.unit || 'g'}
                                                                onValueChange={(val) => handleUnitChange(index, val)}
                                                            >
                                                                <SelectTrigger className="h-8 w-[65px] sm:w-[70px] px-1 sm:px-2 text-xs">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="g">g</SelectItem>
                                                                    {ing.valid_units && Object.keys(ing.valid_units).map(u => (
                                                                        <SelectItem key={u} value={u}>{u}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRemoveIngredient(index)}
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                    {mealType === 'bebida' && selectedIngredients.length === 0 && (
                                        <div className="grid grid-cols-4 gap-3 p-4 bg-muted/30 rounded-lg border border-dashed">
                                            <div className="col-span-4 text-xs font-medium text-muted-foreground mb-1">
                                                Macros manuales (si no usás ingredientes)
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Kcal</Label>
                                                <Input
                                                    type="number" min="0" value={manualMacros.kcal}
                                                    onChange={(e) => setManualMacros({ ...manualMacros, kcal: parseFloat(e.target.value) || 0 })}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Prot</Label>
                                                <Input
                                                    type="number" min="0" value={manualMacros.protein}
                                                    onChange={(e) => setManualMacros({ ...manualMacros, protein: parseFloat(e.target.value) || 0 })}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Carb</Label>
                                                <Input
                                                    type="number" min="0" value={manualMacros.carbs}
                                                    onChange={(e) => setManualMacros({ ...manualMacros, carbs: parseFloat(e.target.value) || 0 })}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Grasa</Label>
                                                <Input
                                                    type="number" min="0" value={manualMacros.fat}
                                                    onChange={(e) => setManualMacros({ ...manualMacros, fat: parseFloat(e.target.value) || 0 })}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* STEP 3: REVIEW & CONFIRM */}
                        {step === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

                                <div className="flex gap-4 items-center mb-6">
                                    <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-muted border flex-shrink-0">
                                        {imageUrl ? (
                                            <Image src={imageUrl} alt="Recipe" fill className="object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full w-full text-muted-foreground">
                                                <Utensils className="h-8 w-8 opacity-20" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-bold">{recipeName}</h3>
                                        <p className="text-sm text-muted-foreground capitalize flex items-center gap-2">
                                            {mealType || 'Sin categoría'}
                                            <span className="w-1 h-1 rounded-full bg-muted-foreground/40"></span>
                                            {servings} porciones
                                            {prepTime > 0 && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40"></span>
                                                    <Clock className="h-3 w-3 inline" /> {prepTime} min
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <Card className="border-none shadow-md bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <PieChart className="h-5 w-5 text-primary" />
                                            Información Nutricional
                                            <span className="text-xs font-normal text-muted-foreground ml-auto">Por porción</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                            <div className="flex flex-col items-center p-3 bg-background rounded-xl shadow-sm border">
                                                <span className="text-2xl font-bold text-foreground">{Math.round(macrosPerServing.kcal)}</span>
                                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Kcal</span>
                                            </div>
                                            <div className="flex flex-col items-center p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/50">
                                                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{Math.round(macrosPerServing.protein)}g</span>
                                                <span className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium">Prot</span>
                                            </div>
                                            <div className="flex flex-col items-center p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/50">
                                                <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{Math.round(macrosPerServing.carbs)}g</span>
                                                <span className="text-xs text-amber-600/70 dark:text-amber-400/70 font-medium">Carb</span>
                                            </div>
                                            <div className="flex flex-col items-center p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/50">
                                                <span className="text-xl font-bold text-rose-600 dark:text-rose-400">{Math.round(macrosPerServing.fat)}g</span>
                                                <span className="text-xs text-rose-600/70 dark:text-rose-400/70 font-medium">Grasa</span>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground flex justify-between">
                                            <span>Total receta: {Math.round(activeMacros.kcal)} kcal</span>
                                            <span>{selectedIngredients.length} ingredientes</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="bg-muted/20 p-4 rounded-xl border">
                                    <h4 className="text-sm font-semibold mb-3">Resumen de ingredientes</h4>
                                    <ul className="space-y-2 max-h-[150px] overflow-y-auto text-sm text-muted-foreground">
                                        {selectedIngredients.length > 0 ? selectedIngredients.map((ing, i) => (
                                            <li key={i} className="flex justify-between">
                                                <span className="truncate pr-2">{ing.quantity} {ing.unit} {ing.name}</span>
                                                <span className="flex-shrink-0">{Math.round((ing.kcal_100g || 0) * (ing.quantity_grams / 100))} kcal</span>
                                            </li>
                                        )) : (
                                            <li className="italic">Sin ingredientes (macros manuales)</li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        )}

                    </div>

                    <div className="p-4 sm:p-6 pt-4 border-t bg-background mt-auto flex justify-between">
                        {step > 1 ? (
                            <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>
                                <ChevronLeft className="mr-2 h-4 w-4" />
                                Atrás
                            </Button>
                        ) : (
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                        )}

                        {step < totalSteps ? (
                            <Button
                                type="button"
                                onClick={() => setStep(step + 1)}
                                className="bg-primary hover:bg-primary/90 text-white min-w-[120px]"
                                disabled={
                                    (step === 1 && (!recipeName.trim() || !mealType)) ||
                                    (step === 2 && (mealType !== 'bebida' && selectedIngredients.length === 0))
                                }
                            >
                                Siguiente
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                disabled={loading || isUploading}
                                className="bg-primary text-white hover:bg-primary/90 min-w-[140px]"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creando...
                                    </>
                                ) : (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Crear Receta
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </form>
            </DialogContent>
        </Dialog >
    )
}
