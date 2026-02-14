'use client'

import { useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, Camera, Image as ImageIcon, Loader2, Edit2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { registerMealLog } from '@/app/(dashboard)/clients/[id]/meal-plan-actions'
import { compressImage } from '@/lib/image-utils'
import { cn } from '@/lib/utils'

interface MealAccordionItemProps {
    meal: any
    log?: any
    isOpen: boolean
    onToggle: () => void
    clientId: string
}

export function MealAccordionItem({ meal, log, isOpen, onToggle, clientId }: MealAccordionItemProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)

    // Calculate macros from meal items
    const calculateMacros = () => {
        let kcal = 0, protein = 0, carbs = 0, fats = 0

        meal.items?.forEach((item: any) => {
            const recipe = item.recipe
            const portions = item.portions || 1
            if (!recipe) return

            // Calculate unit stats first
            let unitKcal = 0, unitProtein = 0, unitCarbs = 0, unitFats = 0

            // Try to use calculated ingredient stats first
            const hasIngredients = recipe.ingredients_data && recipe.ingredients_data.length > 0
            if (hasIngredients) {
                const totals = recipe.ingredients_data.reduce((acc: any, ing: any) => {
                    const factor = (ing.grams || 0) / 100
                    return {
                        kcal: acc.kcal + (ing.kcal_100g || 0) * factor,
                        protein: acc.protein + (ing.protein_100g || 0) * factor,
                        carbs: acc.carbs + (ing.carbs_100g || 0) * factor,
                        fat: acc.fat + (ing.fat_100g || 0) * factor,
                    }
                }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })

                const servings = recipe.servings || 1
                unitKcal = totals.kcal / servings
                unitProtein = totals.protein / servings
                unitCarbs = totals.carbs / servings
                unitFats = totals.fat / servings
            } else if (recipe.macros_calories) {
                // Fallback to manual stats
                const servings = recipe.servings || 1
                unitKcal = recipe.macros_calories / servings
                unitProtein = (recipe.macros_protein_g || 0) / servings
                unitCarbs = (recipe.macros_carbs_g || 0) / servings
                unitFats = (recipe.macros_fat_g || 0) / servings
            }

            kcal += unitKcal * portions
            protein += unitProtein * portions
            carbs += unitCarbs * portions
            fats += unitFats * portions
        })

        return {
            kcal: Math.round(kcal),
            protein: Math.round(protein),
            carbs: Math.round(carbs),
            fats: Math.round(fats)
        }
    }

    const stats = calculateMacros()
    const isComplete = !!log

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        const formData = new FormData()

        try {
            const compressedFile = await compressImage(file, 0.8, 1600)
            formData.append('file', compressedFile)

            const result = await registerMealLog(clientId, meal.name, formData)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success('¡Comida registrada!')
                // Force close or stay open? Let's stay open to show result
            }
        } catch (error) {
            console.error('Upload error:', error)
            toast.error('Error al subir la imagen')
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    return (
        <Card className={cn(
            "overflow-hidden transition-all duration-300 border shadow-sm",
            isOpen ? "ring-2 ring-zinc-900 ring-offset-2" : "hover:border-gray-300"
        )}>
            {/* Header / Trigger */}
            <div
                onClick={onToggle}
                className="p-3 flex items-center justify-between cursor-pointer bg-white active:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
                        isComplete ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"
                    )}>
                        {getMealIcon(meal.name)}
                    </div>
                    <div>
                        <h3 className={cn(
                            "font-semibold text-sm transition-colors",
                            isComplete ? "text-green-700" : "text-gray-900"
                        )}>
                            {meal.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="font-medium text-gray-700">{stats.kcal} kcal</span>
                            {/* Short summary for collapsed state */}
                            {!isOpen && (
                                <span className="opacity-60 hidden sm:inline-block">
                                    • P {stats.protein}g • C {stats.carbs}g • G {stats.fats}g
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {log?.signedUrl && !isOpen && (
                        <div className="relative h-8 w-8 rounded-lg overflow-hidden border border-gray-100 shadow-sm">
                            <Image
                                src={log.signedUrl}
                                alt="Log"
                                fill
                                className="object-cover"
                            />
                        </div>
                    )}
                    <ChevronDown className={cn(
                        "h-5 w-5 text-gray-400 transition-transform duration-300",
                        isOpen && "rotate-180"
                    )} />
                </div>
            </div>

            {/* Expanded Content */}
            <div className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            )}>
                <div className="overflow-hidden">
                    <div className="p-3 pt-0 space-y-6">

                        {/* 1. Photo Area */}
                        <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden relative group">
                            <div className="aspect-video w-full relative flex items-center justify-center bg-gray-100">
                                {log?.signedUrl ? (
                                    <>
                                        <Image
                                            src={log.signedUrl}
                                            alt="Comida registrada"
                                            fill
                                            className="object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity gap-2 shadow-sm"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading}
                                            >
                                                <Edit2 className="h-3.5 w-3.5" />
                                                Cambiar foto
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                        <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                                            <Camera className="h-6 w-6 text-gray-300" />
                                        </div>
                                        <span className="text-xs font-medium opacity-60">Sin foto aún</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Ingredients */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Ingredientes</h4>
                            {meal.items?.length > 0 ? (
                                <div className="space-y-2">
                                    {meal.items.map((item: any, idx: number) => {
                                        const recipe = item.recipe
                                        const portions = item.portions || 1

                                        // Normalize ingredients data: check 'ingredients' (new schema) OR 'ingredients_data' (legacy)
                                        let ingredientsList = recipe?.ingredients || recipe?.ingredients_data || []

                                        // Ensure it's an array if it's a string
                                        if (typeof ingredientsList === 'string') {
                                            try { ingredientsList = JSON.parse(ingredientsList) } catch (e) { ingredientsList = [] }
                                        }

                                        const hasIngredients = Array.isArray(ingredientsList) && ingredientsList.length > 0
                                        const recipeName = item.custom_name || recipe?.name || "Plato sin nombre"

                                        return (
                                            <div key={idx} className="border-b border-gray-50 last:border-0 pb-3 mb-3 last:mb-0 last:pb-0">
                                                {/* Recipe Title - Always show */}
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-semibold text-gray-800">{recipeName}</span>
                                                    {!hasIngredients && (
                                                        <span className="text-xs text-gray-500">
                                                            {portions > 1 ? `${portions} porciones` : '1 porción'}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Ingredients List - If available */}
                                                {hasIngredients && (
                                                    <div className="space-y-1 pl-1">
                                                        {ingredientsList.map((ing: any, i: number) => (
                                                            <div key={i} className="flex justify-between items-center text-xs text-gray-600">
                                                                <span className="capitalize">• {ing.ingredient_name || ing.name}</span>
                                                                <span className="font-medium">
                                                                    {Math.round((ing.grams || 0) * portions)}g
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic">No hay comidas asignadas a este turno.</p>
                            )}
                        </div>

                        {/* 3. Macros Breakdown */}
                        <div className="grid grid-cols-3 gap-3">
                            <MacroTinyCard label="PROT" value={`${stats.protein}g`} color="bg-blue-50 text-blue-700" />
                            <MacroTinyCard label="CARB" value={`${stats.carbs}g`} color="bg-amber-50 text-amber-700" />
                            <MacroTinyCard label="FAT" value={`${stats.fats}g`} color="bg-rose-50 text-rose-700" />
                        </div>

                        {/* 4. Main Action */}
                        <div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileSelect}
                            />
                            {log ? (
                                <Button
                                    className="w-full h-12 text-base rounded-xl bg-green-600 hover:bg-green-700 shadow-sm text-white"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    {isUploading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                                    {isUploading ? 'Subiendo...' : '¡Comida registrada!'}
                                </Button>
                            ) : (
                                <Button
                                    className="w-full h-12 text-base rounded-xl font-bold shadow-md bg-zinc-900 text-white hover:bg-zinc-800"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Camera className="mr-2 h-5 w-5" />}
                                    {isUploading ? 'Subiendo...' : 'Subir foto del plato'}
                                </Button>
                            )}
                            {(!log && !isUploading) && (
                                <p className="text-center text-xs text-gray-400 mt-2">
                                    Tómale una foto a tu plato para registrarlo
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    )
}

function MacroTinyCard({ label, value, color }: { label: string, value: string, color: string }) {
    return (
        <div className={cn("flex flex-col items-center justify-center p-2 rounded-xl border border-transparent", color)}>
            <span className="text-[10px] uppercase font-bold opacity-70 mb-0.5">{label}</span>
            <span className="text-lg font-bold leading-none">{value}</span>
        </div>
    )
}

function getMealIcon(name: string) {
    const n = name.toLowerCase()
    if (n.includes('desayuno')) return <span className="text-lg">☀️</span>
    if (n.includes('almuerzo')) return <span className="text-lg">🥗</span>
    if (n.includes('merienda') || n.includes('snack')) return <span className="text-lg">🍎</span>
    if (n.includes('cena')) return <span className="text-lg">🌙</span>
    return <span className="text-lg">🍽️</span>
}
