'use client'

import { useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Camera, Image as ImageIcon, Loader2, Edit2, CheckCircle2, Check, Sun, Utensils, Apple, Moon } from 'lucide-react'
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
            }
        } catch (error) {
            console.error('Upload error:', error)
            toast.error('Error al subir la imagen')
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // Helper to get Meal Label and Icon
    const getMealLabelAndIcon = (name: string) => {
        const n = name.toLowerCase()
        if (n.includes('desayuno')) return { label: 'DESAYUNO', icon: <Sun className="w-5 h-5 text-yellow-500" /> }
        if (n.includes('almuerzo')) return { label: 'ALMUERZO', icon: <Utensils className="w-5 h-5 text-green-600" /> }
        if (n.includes('merienda') || n.includes('snack')) return { label: 'MERIENDA', icon: <Apple className="w-5 h-5 text-red-500" /> }
        if (n.includes('cena')) return { label: 'CENA', icon: <Moon className="w-5 h-5 text-yellow-400" /> }
        return { label: name.toUpperCase(), icon: <Utensils className="w-5 h-5 text-gray-400" /> }
    }

    const { label, icon } = getMealLabelAndIcon(meal.name)

    const cardTitle = meal.items && meal.items.length > 0
        ? meal.items.map((i: any) => i.custom_name || i.recipe?.name).filter(Boolean).join(" + ")
        : meal.name

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
                {icon}
                <span className="text-[13px] font-medium text-gray-400 tracking-wide uppercase">
                    {label}
                </span>
            </div>

            <div className={cn(
                "w-full bg-white rounded-[24px] shadow-sm transition-all duration-300 overflow-hidden border border-transparent mx-auto",
                isOpen ? "pb-6 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)]" : ""
            )}>
                {/* Card Header (Clickable) */}
                <div
                    onClick={onToggle}
                    className="w-full p-5 cursor-pointer flex justify-between items-center gap-4"
                >
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h3 className="text-[16px] font-semibold text-black leading-tight line-clamp-2">{cardTitle}</h3>
                        <p className="text-[13px] text-gray-400 font-medium mt-1">{stats.kcal} kcal</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8">
                        <span className={cn("text-gray-400 transition-transform duration-300", isOpen && "rotate-180")}>
                            <ChevronDown size={22} />
                        </span>
                    </div>
                </div>

                {/* Expanded Content */}
                {isOpen && (
                    <div className="px-5 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Image */}
                        <div className="relative w-full aspect-[4/2.5] rounded-2xl overflow-hidden mb-5 bg-gray-100">
                            {/* Show Log Image if exists, else Recipe Image, else Placeholder */}
                            {log?.signedUrl ? (
                                <Image
                                    src={log.signedUrl}
                                    alt="Comida registrada"
                                    fill
                                    className="object-cover"
                                />
                            ) : meal.items?.[0]?.recipe?.image_url ? (
                                <Image
                                    src={meal.items[0].recipe.image_url}
                                    alt={meal.name}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-300">
                                    <ImageIcon className="w-10 h-10 mb-2" />
                                    <span className="text-xs font-medium">Sin imagen</span>
                                </div>
                            )}

                            {/* Change Photo Button Overlay (only if logged) */}
                            {log?.signedUrl && (
                                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="gap-2 shadow-sm pointer-events-auto cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            fileInputRef.current?.click()
                                        }}
                                        disabled={isUploading}
                                    >
                                        <Edit2 className="h-3.5 w-3.5" />
                                        Cambiar foto
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Ingredients */}
                        <div className="mb-6">
                            <h4 className="text-[11px] font-bold text-gray-400 tracking-wider uppercase mb-3">INGREDIENTES</h4>
                            <div className="space-y-2">
                                {meal.items?.map((item: any, idx: number) => {
                                    const recipe = item.recipe
                                    const portions = item.portions || 1
                                    // Normalize ingredients data
                                    let ingredientsList = recipe?.ingredients || recipe?.ingredients_data || []
                                    if (typeof ingredientsList === 'string') {
                                        try { ingredientsList = JSON.parse(ingredientsList) } catch (e) { ingredientsList = [] }
                                    }
                                    const hasIngredients = Array.isArray(ingredientsList) && ingredientsList.length > 0

                                    // If has explicit ingredients, list them
                                    if (hasIngredients) {
                                        return ingredientsList.map((ing: any, i: number) => {
                                            const displayAmount = ing.quantity ? Number((ing.quantity * portions).toFixed(2)) : null
                                            const displayUnit = ing.unit

                                            // Determine what to show: User friendly unit OR grams fallback
                                            const quantityText = (displayAmount && displayUnit && displayUnit.toLowerCase() !== 'g')
                                                ? `${displayAmount} ${displayUnit}`
                                                : `${Math.round((ing.grams || 0) * portions)}g`

                                            return (
                                                <div key={`${idx}-${i}`} className="flex justify-between items-center text-[13px]">
                                                    <span className="font-semibold text-black capitalize">{ing.ingredient_name || ing.name}</span>
                                                    <span className="text-gray-400 font-medium">
                                                        {quantityText}
                                                    </span>
                                                </div>
                                            )
                                        })
                                    }

                                    // Fallback if no ingredients (just recipe name)
                                    return (
                                        <div key={idx} className="flex justify-between items-center text-[13px]">
                                            <span className="font-semibold text-black">{item.custom_name || recipe?.name || "Item"}</span>
                                            <span className="text-gray-400 font-medium">{portions > 1 ? `${portions} porciones` : '1 porción'}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Macros Chips */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            <MacroChip label="PROT" value={stats.protein} unit="g" color="text-blue-500" />
                            <MacroChip label="CARB" value={stats.carbs} unit="g" color="text-orange-500" />
                            <MacroChip label="FAT" value={stats.fats} unit="g" color="text-red-500" />
                        </div>

                        {/* Action Button */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileSelect}
                        />

                        {(log || isComplete) ? (
                            <div className="flex gap-2">
                                <div className="flex-1 bg-[#3FB824] text-white h-[50px] rounded-full flex items-center justify-center gap-2 font-medium shadow-lg shadow-green-500/20">
                                    <Check className="w-5 h-5 stroke-[3px]" />
                                    <span>Foto registrada.</span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-[50px] w-[50px] rounded-full shrink-0 border-gray-200"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        fileInputRef.current?.click()
                                    }}
                                    disabled={isUploading}
                                >
                                    <Edit2 className="w-5 h-5 text-gray-400" />
                                </Button>
                            </div>
                        ) : (
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    fileInputRef.current?.click();
                                }}
                                disabled={isUploading}
                                className="w-full bg-black hover:bg-black/90 text-white h-[50px] rounded-full text-[15px] font-medium shadow-xl shadow-black/10"
                            >
                                {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Camera className="w-5 h-5 mr-2" />}
                                {isUploading ? 'Subiendo...' : 'Subir una foto del plato'}
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function MacroChip({ label, value, unit, color }: { label: string; value?: number; unit: string; color: string }) {
    if (value === undefined) return null;
    return (
        <div className="flex flex-col items-center justify-center py-2.5 rounded-2xl border border-gray-100 bg-white shadow-sm">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">{label}</span>
            <span className={cn("text-[15px] font-bold", color)}>
                {value}<span className="text-[11px] font-medium">{unit}</span>
            </span>
        </div>
    )
}
