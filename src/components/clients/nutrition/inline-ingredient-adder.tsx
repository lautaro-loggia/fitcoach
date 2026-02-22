'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { cn, normalizeText } from '@/lib/utils'

interface InlineIngredientAdderProps {
    onAdd: (ingredient: any, grams: number) => void
}

export function InlineIngredientAdder({ onAdd }: InlineIngredientAdderProps) {
    const [ingredients, setIngredients] = useState<any[]>([])
    const [open, setOpen] = useState(false)
    const [selectedIngredient, setSelectedIngredient] = useState<any>(null)
    const [quantity, setQuantity] = useState('')

    useEffect(() => {
        const fetchIngredients = async () => {
            const supabase = createClient()
            const { data } = await supabase.from('ingredients').select('*').order('name')
            if (data) setIngredients(data)
        }
        fetchIngredients()
    }, [])

    const handleAdd = () => {
        if (selectedIngredient && quantity && Number(quantity) > 0) {
            onAdd(selectedIngredient, Number(quantity))
            setSelectedIngredient(null)
            setQuantity('')
        }
    }

    return (
        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-100">
            <span className="text-sm font-bold text-gray-900">Añadir otro ingrediente</span>
            <div className="flex items-center gap-2">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <button className="flex-1 min-w-[120px] flex items-center justify-between text-[14px] font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200 outline-none focus:ring-2 focus:ring-[#4139CF] rounded-lg px-3 py-2.5 text-left h-[44px]">
                            <span className="truncate">{selectedIngredient ? selectedIngredient.name : "Buscar ingrediente..."}</span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[85vw] sm:w-[350px] p-0 z-[100]" align="start">
                        <Command filter={(value, search) => {
                            const normalizedValue = normalizeText(value)
                            const normalizedSearch = normalizeText(search)
                            return normalizedValue.includes(normalizedSearch) ? 1 : 0
                        }}>
                            <CommandInput placeholder="Buscar..." className="h-11" />
                            <CommandEmpty className="p-4 text-sm text-center text-gray-500">No se encontraron ingredientes.</CommandEmpty>
                            <CommandGroup className="max-h-[250px] overflow-y-auto custom-scrollbar">
                                {ingredients.map((ing) => (
                                    <CommandItem
                                        key={ing.id}
                                        value={`${ing.name} ${ing.state || ''}`}
                                        onSelect={() => {
                                            setSelectedIngredient(ing)
                                            setOpen(false)
                                        }}
                                        className="py-3 cursor-pointer"
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4 shrink-0",
                                                selectedIngredient?.id === ing.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <span className="truncate">{ing.name} {ing.state && <span className="text-gray-400">({ing.state})</span>}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>

                <div className="flex items-center gap-1 shrink-0 bg-white border border-gray-200 rounded-lg px-2 h-[44px] focus-within:ring-2 focus-within:ring-[#4139CF] focus-within:border-transparent transition-all">
                    <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="0"
                        className="w-12 text-right bg-transparent text-[15px] font-bold text-gray-900 outline-none p-0 border-none tabular-nums hide-arrows"
                    />
                    <span className="text-[14px] font-bold text-gray-500 mr-1">g</span>
                </div>

                <button
                    onClick={handleAdd}
                    disabled={!selectedIngredient || !quantity || Number(quantity) <= 0}
                    className="bg-[#111827] text-white outline-none focus:ring-2 focus:ring-offset-1 focus:ring-black h-[44px] w-[44px] rounded-lg flex items-center justify-center hover:bg-black disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-400 transition-colors shrink-0 shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>
        </div>
    )
}
