'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search } from 'lucide-react'

interface IngredientSelectorProps {
    onAdd: (ingredient: any, quantity: number) => void
}

export function IngredientSelector({ onAdd }: IngredientSelectorProps) {
    const [ingredients, setIngredients] = useState<any[]>([])
    const [filteredIngredients, setFilteredIngredients] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [selectedIngredient, setSelectedIngredient] = useState<any>(null)
    const [quantity, setQuantity] = useState('')

    useEffect(() => {
        fetchIngredients()
    }, [])

    useEffect(() => {
        filterIngredients()
    }, [searchTerm, selectedCategory, ingredients])

    const fetchIngredients = async () => {
        const supabase = createClient()
        const { data } = await supabase
            .from('ingredients')
            .select('*')
            .order('name')

        if (data) {
            setIngredients(data)
            setFilteredIngredients(data)
        }
    }

    const filterIngredients = () => {
        let filtered = ingredients

        if (selectedCategory !== 'all') {
            filtered = filtered.filter(ing => ing.category === selectedCategory)
        }

        if (searchTerm) {
            filtered = filtered.filter(ing =>
                ing.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        setFilteredIngredients(filtered)
    }

    const handleAdd = () => {
        if (selectedIngredient && quantity && parseFloat(quantity) > 0) {
            onAdd(selectedIngredient, parseFloat(quantity))
            setSelectedIngredient(null)
            setQuantity('')
            setSearchTerm('')
        }
    }

    const categories = Array.from(new Set(ingredients.map(ing => ing.category).filter(Boolean)))

    return (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                            <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las categorías</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Buscar ingrediente</Label>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Ingrediente</Label>
                <Select
                    value={selectedIngredient?.id || ''}
                    onValueChange={(value) => {
                        const ing = filteredIngredients.find(i => i.id === value)
                        setSelectedIngredient(ing)
                    }}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar ingrediente" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {filteredIngredients.map(ing => (
                            <SelectItem key={ing.id} value={ing.id}>
                                {ing.name} {ing.state && `(${ing.state})`} - {ing.kcal_100g} kcal
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedIngredient && (
                <div className="space-y-4">
                    <div className="p-3 bg-background rounded border">
                        <p className="text-sm font-medium">{selectedIngredient.name}</p>
                        <p className="text-xs text-muted-foreground">
                            Por 100g: {selectedIngredient.kcal_100g} kcal | P: {selectedIngredient.protein_100g}g | C: {selectedIngredient.carbs_100g}g | G: {selectedIngredient.fat_100g}g
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="quantity">Cantidad (gramos) *</Label>
                            <Input
                                id="quantity"
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="100"
                                min="1"
                            />
                        </div>
                        <div className="flex items-end">
                            <Button
                                type="button"
                                onClick={handleAdd}
                                className="w-full"
                                disabled={!quantity || parseFloat(quantity) <= 0}
                            >
                                Agregar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
