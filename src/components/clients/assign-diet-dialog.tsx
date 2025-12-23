"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search } from "lucide-react"
import { assignDietAction } from "@/app/(dashboard)/clients/[id]/diet-actions"

interface AssignDietDialogProps {
    clientId: string
}

export function AssignDietDialog({ clientId }: AssignDietDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [recipes, setRecipes] = useState<any[]>([])

    const [selectedRecipeId, setSelectedRecipeId] = useState<string>("custom")
    const [customName, setCustomName] = useState("")

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

    const handleAssign = async () => {
        setLoading(true)

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
            clientId,
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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                    <Plus className="mr-2 h-4 w-4" /> Asignar Comida
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Asignar Plan de Comida</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Seleccionar Template (Receta base)</Label>
                        <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="custom">-- Crear desde cero --</SelectItem>
                                {recipes.map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Nombre de la comida (Ej: Almuerzo, Pre-entreno)</Label>
                        <Input
                            placeholder="Nombre personalizado..."
                            value={customName}
                            onChange={e => setCustomName(e.target.value)}
                        />
                        {selectedRecipeId !== 'custom' && !customName && (
                            <p className="text-xs text-muted-foreground">Si lo dejas vacío, usará el nombre del template.</p>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={handleAssign}
                            className="bg-orange-600 hover:bg-orange-700"
                            disabled={loading}
                        >
                            {loading ? 'Asignando...' : 'Asignar'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
