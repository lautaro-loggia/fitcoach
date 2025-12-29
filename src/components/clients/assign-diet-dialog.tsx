import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, AlertTriangle, Loader2 } from "lucide-react"
import { assignDietAction } from "@/app/(dashboard)/clients/[id]/diet-actions"
import { checkRecipeAllergens } from "@/lib/allergen-utils"
import { RecipeCard } from "@/components/recipes/recipe-card"

interface AssignDietDialogProps {
    client: any
}

export function AssignDietDialog({ client }: AssignDietDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [recipes, setRecipes] = useState<any[]>([])

    // Filtering
    const [searchQuery, setSearchQuery] = useState("")

    const [selectedRecipeId, setSelectedRecipeId] = useState<string>("custom")
    const [customName, setCustomName] = useState("")

    // Filtered recipes
    const filteredRecipes = useMemo(() => {
        if (!searchQuery) return recipes
        return recipes.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }, [recipes, searchQuery])

    // Warning State
    const [warningOpen, setWarningOpen] = useState(false)
    const [detectedAllergen, setDetectedAllergen] = useState<string | null>(null)
    const [pendingSubmit, setPendingSubmit] = useState<boolean>(false)

    useEffect(() => {
        if (open) {
            fetchRecipes()
        }
    }, [open])

    const fetchRecipes = async () => {
        const supabase = createClient()
        const { data } = await supabase.from('recipes').select('*').order('name')
        if (data) setRecipes(data)
    }

    const validateAndSubmit = async (force: boolean = false) => {
        if (selectedRecipeId !== 'custom') {
            const recipe = recipes.find(r => r.id === selectedRecipeId)
            if (recipe && !force) {
                const conflict = checkRecipeAllergens(recipe, client.allergens)
                if (conflict) {
                    setDetectedAllergen(conflict)
                    setWarningOpen(true)
                    return
                }
            }
        }
        await executeAssign()
    }

    const executeAssign = async () => {
        setLoading(true)
        setWarningOpen(false) // Close warning if open

        let submitData = {
            name: customName,
            ingredients: [] as any[],
            recipeId: undefined as string | undefined,
            isCustomized: false
        }

        if (selectedRecipeId === 'custom') {
            if (!customName) {
                alert("Ingresa un nombre para el plan")
                setLoading(false)
                return
            }
            submitData.isCustomized = true
            submitData.ingredients = [] // Empty start
        } else {
            const recipe = recipes.find(r => r.id === selectedRecipeId)
            if (!recipe) return

            submitData.name = customName || recipe.name
            // Fallback to ingredients_data if ingredients is empty (handling schema variations)
            const sourceIngredients = (recipe.ingredients && recipe.ingredients.length > 0)
                ? recipe.ingredients
                : (recipe.ingredients_data || [])

            submitData.ingredients = sourceIngredients
            submitData.recipeId = recipe.id
        }

        const res = await assignDietAction({
            clientId: client.id,
            ...submitData
        })

        if (res.error) {
            alert(res.error)
        } else {
            setOpen(false)
            setCustomName("")
            setSelectedRecipeId("custom")
        }
        setLoading(false)
    }

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                        <Plus className="mr-2 h-4 w-4" /> Asignar Comida
                    </Button>
                </DialogTrigger>
                <DialogContent className="w-full sm:max-w-[1100px] h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Asignar Plan de Comida</DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col gap-4 flex-1 overflow-hidden py-2">
                        {/* Search & Custom Name Row */}
                        <div className="flex gap-4 items-end">
                            <div className="flex-1 space-y-2">
                                <Label>Buscar Receta</Label>
                                <div className="relative">
                                    <Input
                                        placeholder="Buscar por nombre..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="pl-8"
                                    />
                                    <div className="absolute left-2.5 top-2.5 text-muted-foreground">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 space-y-2">
                                <Label>Nombre de la comida (Opcional)</Label>
                                <Input
                                    placeholder="Ej: Almuerzo lunes"
                                    value={customName}
                                    onChange={e => setCustomName(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Custom Recipe Option */}
                        <div className="flex items-center space-x-2 border p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRecipeId('custom')}>
                            <div className={`w-4 h-4 rounded-full border border-primary flex items-center justify-center ${selectedRecipeId === 'custom' ? 'bg-primary' : 'bg-transparent'}`}>
                                {selectedRecipeId === 'custom' && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <span className={selectedRecipeId === 'custom' ? 'font-medium' : ''}>Crear comida desde cero (sin template)</span>
                        </div>

                        {/* Recipes Grid Scrollable */}
                        <div className="flex-1 overflow-y-auto pr-2">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-40">
                                    <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                                    <p className="text-muted-foreground mt-2">Cargando recetas...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                                    {filteredRecipes.map(r => (
                                        <RecipeCard
                                            key={r.id}
                                            recipe={r}
                                            isSelected={selectedRecipeId === r.id}
                                            onSelect={() => {
                                                setSelectedRecipeId(r.id)
                                                // Auto-fill name if empty
                                                if (!customName) setCustomName(r.name)
                                            }}
                                        />
                                    ))}
                                    {filteredRecipes.length === 0 && (
                                        <div className="col-span-full text-center py-10 text-muted-foreground">
                                            No se encontraron recetas con ese nombre.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="flex justify-between items-center pt-2 border-t mt-auto">
                            <div className="text-sm text-muted-foreground">
                                {selectedRecipeId === 'custom' ? 'Creando nueva comida' : 'Receta seleccionada'}
                            </div>
                            <Button
                                onClick={() => validateAndSubmit(false)}
                                className="bg-orange-600 hover:bg-orange-700 w-32"
                                disabled={loading}
                            >
                                {loading ? 'Asignando...' : 'Asignar'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={warningOpen} onOpenChange={setWarningOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" /> Advertencia de Alérgenos
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            El asesorado es alérgico a <strong>{detectedAllergen}</strong> y esta receta podría contenerlo.
                            <br /><br />
                            ¿Deseas asignarla de todas formas?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setWarningOpen(false)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => executeAssign()}
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
