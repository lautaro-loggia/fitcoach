'use client'

import { useState, useMemo, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Search, Loader2, AlertTriangle } from "lucide-react"
import { RecipeCard } from "@/components/recipes/recipe-card"
import { AddRecipeDialog } from "@/components/recipes/add-recipe-dialog"
import { checkRecipeAllergens, checkDietaryCompliance } from "@/lib/allergen-utils"

interface AddDishDialogProps {
    mealId: string
    contextLabel: string // e.g. "Lunes · Almuerzo"
    onConfirm: (data: { recipeId?: string, customName?: string, portions?: number }) => Promise<void>
    clientAllergens?: string[]
    clientPreference?: string
    // Controlled props
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function AddDishDialog({ mealId, contextLabel, onConfirm, clientAllergens, clientPreference, open, onOpenChange }: AddDishDialogProps) {
    // Internal state if uncontrolled (fallback)
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = open !== undefined

    const isOpen = isControlled ? open : internalOpen
    const setOpen = isControlled ? onOpenChange! : setInternalOpen

    const [loading, setLoading] = useState(false)
    const [recipes, setRecipes] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")

    // Selection state
    const [selectedRecipeId, setSelectedRecipeId] = useState<string>("custom")
    const [customName, setCustomName] = useState("")
    const [portions, setPortions] = useState(1)

    // Warning State
    const [warningOpen, setWarningOpen] = useState(false)
    const [warningMessage, setWarningMessage] = useState<string>("")
    const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null)

    // Recipe Creation State
    const [isCreatingRecipe, setIsCreatingRecipe] = useState(false)

    const nameInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen && recipes.length === 0) {
            fetchRecipes()
        }
        if (isOpen) {
            // Reset fields on open
            setSelectedRecipeId("custom")
            setCustomName("")
            setPortions(1)
        }
    }, [isOpen])

    const fetchRecipes = async () => {
        const supabase = createClient()
        const { data } = await supabase.from('recipes').select('*').order('name')
        if (data) setRecipes(data)
    }

    const filteredRecipes = useMemo(() => {
        if (!searchQuery) return recipes
        return recipes.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }, [recipes, searchQuery])

    const executeSubmit = async () => {
        setLoading(true)
        setWarningOpen(false)
        try {
            await onConfirm({
                recipeId: selectedRecipeId === 'custom' ? undefined : selectedRecipeId,
                customName: customName || undefined,
                portions
            })
            setOpen(false)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handlePreSubmit = () => {
        if (selectedRecipeId === 'custom' && !customName) {
            nameInputRef.current?.focus()
            // Podríamos usar un toast aquí si estuviera disponible, pero el focus es un buen indicador inicial
            return
        }

        // Validation
        if (selectedRecipeId !== 'custom') {
            const recipe = recipes.find(r => r.id === selectedRecipeId)
            if (recipe) {
                // Check Allergens
                const allergen = checkRecipeAllergens(recipe, clientAllergens)
                if (allergen) {
                    setWarningMessage(`Esta receta contiene ingredientes que podrían causar alergia: ${allergen}.`)
                    setPendingAction(() => executeSubmit)
                    setWarningOpen(true)
                    return
                }

                // Check Dietary Preference
                const dietaryConflict = checkDietaryCompliance(recipe, clientPreference)
                if (dietaryConflict) {
                    setWarningMessage(`Esta receta no cumple con la preferencia dietaria (${clientPreference}): parece contener productos no ${dietaryConflict === 'vegetariano' ? 'vegetarianos' : 'veganos'}.`)
                    setPendingAction(() => executeSubmit)
                    setWarningOpen(true)
                    return
                }
            }
        }

        executeSubmit()
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setOpen}>
                {!isControlled && (
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground hover:text-primary">
                            <Plus className="h-3 w-3" /> Agregar receta
                        </Button>
                    </DialogTrigger>
                )}
                <DialogContent className="w-full sm:max-w-[1000px] h-[85vh] flex flex-col p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span>Agregar receta a</span>
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-sm">{contextLabel}</span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col gap-4 flex-1 overflow-hidden py-2">
                        {/* Top Controls */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2 md:col-span-1">
                                <Label>Buscar Receta</Label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar..."
                                        className="pl-9"
                                        value={searchQuery}
                                        onChange={e => {
                                            setSearchQuery(e.target.value)
                                            if (e.target.value) setSelectedRecipeId("")
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 md:col-span-1">
                                <Label>Nombre (Personalizado)</Label>
                                <Input
                                    ref={nameInputRef}
                                    placeholder="Ej: Pollo con arroz"
                                    value={customName}
                                    onChange={e => setCustomName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2 md:col-span-1">
                                <Label>Porciones</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={portions}
                                    onChange={e => setPortions(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div
                            className={cn(
                                "flex items-center space-x-3 border-2 p-3 rounded-xl cursor-pointer transition-all",
                                selectedRecipeId === 'custom'
                                    ? "border-primary bg-primary/5 shadow-sm"
                                    : "border-border bg-muted/30 hover:bg-muted/50"
                            )}
                            onClick={() => setIsCreatingRecipe(true)}
                        >
                            <div className={cn(
                                "w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"
                            )}>
                                <Plus className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-sm">Crear receta desde cero</span>
                                <span className="text-xs text-muted-foreground">La receta se guardará en tu catálogo para usarla siempre</span>
                            </div>
                        </div>

                        {/* Recipe Grid */}
                        <div className="flex-1 overflow-y-auto pr-2 min-h-0 border rounded-lg p-2">
                            {recipes.length === 0 && !loading ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredRecipes.map(r => (
                                        <RecipeCard
                                            key={r.id}
                                            recipe={r}
                                            isSelected={selectedRecipeId === r.id}
                                            onSelect={() => {
                                                setSelectedRecipeId(r.id)
                                                if (!customName) setCustomName(r.name)
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end pt-2 mt-auto">
                            <Button onClick={handlePreSubmit} disabled={loading} className="w-32">
                                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Guardar"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <AddRecipeDialog
                open={isCreatingRecipe}
                onOpenChange={setIsCreatingRecipe}
                defaultMealType={contextLabel.split(' · ')[1]?.toLowerCase()}
                onSuccess={async (newRecipe) => {
                    setIsCreatingRecipe(false)
                    setLoading(true)
                    try {
                        await onConfirm({
                            recipeId: newRecipe.id,
                            portions: newRecipe.servings || 1
                        })
                        setOpen(false)
                    } catch (error) {
                        console.error(error)
                    } finally {
                        setLoading(false)
                    }
                }}
            />

            <AlertDialog open={warningOpen} onOpenChange={setWarningOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" /> Advertencia Dietaria
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-base pt-2">
                            {warningMessage}
                            <br /><br />
                            ¿Estás seguro de querer asignar esto?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setWarningOpen(false)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => pendingAction && pendingAction()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Asignar de todos modos
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
