'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Check, ChevronRight, X, Loader2, Sun, Utensils, Apple, Moon } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { registerMealLog } from '@/app/(dashboard)/clients/[id]/meal-plan-actions'
import { compressImage } from '@/lib/image-utils'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogTrigger, DialogClose, DialogTitle } from '@/components/ui/dialog'

interface MealAccordionItemProps {
    meal: any
    log?: any
    clientId: string
}

export function MealAccordionItem({ meal, log, clientId }: MealAccordionItemProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

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
                setIsDialogOpen(false) // Close dialog if open
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

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
            />

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <div className="w-full bg-white rounded-[18px] shadow-sm p-4 flex items-center justify-between gap-4 transition-all hover:shadow-md">
                    {/* Expandable Click Area */}
                    <DialogTrigger asChild>
                        <div className="flex-1 cursor-pointer">
                            <h3 className="text-[17px] font-bold text-gray-900 leading-tight mb-1">{cardTitle}</h3>
                            <p className="text-[14px] text-gray-500 font-medium">{stats.kcal} kcal</p>
                        </div>
                    </DialogTrigger>

                    {/* Quick Action Button */}
                    <div className="shrink-0">
                        {isComplete ? (
                            <button
                                onClick={() => setIsDialogOpen(true)} // If complete, opening the dialog allows them to see/change.
                                className="h-14 w-14 bg-[#3FB824] hover:bg-[#35a01e] text-white rounded-[12px] flex items-center justify-center transition-all shadow-sm"
                            >
                                <Check className="w-6 h-6 stroke-[3px]" />
                            </button>
                        ) : (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="h-14 w-14 bg-black hover:bg-gray-800 text-white rounded-[12px] flex items-center justify-center transition-all shadow-sm disabled:opacity-50"
                            >
                                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-6 h-6" />}
                            </button>
                        )}
                    </div>
                </div>

                <DialogContent className="max-w-md w-[95vw] rounded-[32px] p-0 border-none bg-white shadow-2xl overflow-hidden" showCloseButton={false}>
                    <div className="p-6 space-y-6">
                        {/* Header with Title and Close */}
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <DialogTitle className="text-2xl font-bold text-gray-900 leading-tight">
                                    {cardTitle}
                                </DialogTitle>
                                <p className="text-gray-500 font-medium mt-1">{stats.kcal} kcal</p>
                            </div>
                            <DialogClose className="p-2 bg-gray-100/50 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </DialogClose>
                        </div>

                        {/* Image Section */}
                        {(log?.signedUrl || meal.items?.[0]?.recipe?.image_url) && (
                            <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100 shadow-inner">
                                <Image
                                    src={log?.signedUrl || meal.items[0].recipe.image_url}
                                    alt={cardTitle}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        )}

                        {/* Ingredients List */}
                        <div className="space-y-3">
                            <h4 className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">INGREDIENTES</h4>
                            <div className="space-y-2">
                                {meal.items?.map((item: any, idx: number) => {
                                    const recipe = item.recipe
                                    const portions = item.portions || 1
                                    let ingredientsList = recipe?.ingredients || recipe?.ingredients_data || []
                                    if (typeof ingredientsList === 'string') {
                                        try { ingredientsList = JSON.parse(ingredientsList) } catch (e) { ingredientsList = [] }
                                    }
                                    const hasIngredients = Array.isArray(ingredientsList) && ingredientsList.length > 0

                                    if (hasIngredients) {
                                        return ingredientsList.map((ing: any, i: number) => (
                                            <div key={`${idx}-${i}`} className="flex justify-between items-center text-[14px]">
                                                <span className="font-semibold text-gray-900 capitalize">{ing.ingredient_name || ing.name}</span>
                                                <span className="text-gray-500 font-medium">
                                                    {ing.quantity && ing.unit && ing.unit.toLowerCase() !== 'g'
                                                        ? `${ing.quantity} ${ing.unit}`
                                                        : `${Math.round((ing.grams || 0) * portions)}g`
                                                    }
                                                </span>
                                            </div>
                                        ))
                                    }
                                    return (
                                        <div key={idx} className="flex justify-between items-center text-[14px]">
                                            <span className="font-semibold text-gray-900">{item.custom_name || recipe?.name || "Item"}</span>
                                            <span className="text-gray-500 font-medium">{portions > 1 ? `${portions} porciones` : '1 porción'}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Macros Row - NEW COLORS */}
                        <div className="grid grid-cols-3 gap-3">
                            <MacroChip label="PROTEINA" value={stats.protein} unit="g" textColor="text-[#C50D00]" />
                            <MacroChip label="CARBOS" value={stats.carbs} unit="g" textColor="text-[#E7A202]" />
                            <MacroChip label="GRASAS" value={stats.fats} unit="g" textColor="text-[#009B27]" />
                        </div>

                        {/* Upload/replace Button */}
                        <div className="pt-2">
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="w-full bg-black hover:bg-black/90 text-white h-14 rounded-[20px] text-[15px] font-bold shadow-xl shadow-black/5"
                            >
                                {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Camera className="w-5 h-5 mr-2" />}
                                {isUploading ? 'Subiendo...' : (isComplete ? 'Cambiar foto del plato' : 'Subir una foto del plato')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function MacroChip({ label, value, unit, textColor }: { label: string; value?: number; unit: string; textColor: string }) {
    if (value === undefined) return null;
    return (
        <div className="flex flex-col items-center justify-center py-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{label}</span>
            <span className={cn("text-xl font-black", textColor)}>
                {value}<span className="text-[13px] font-bold text-gray-400 ml-0.5">{unit}</span>
            </span>
        </div>
    )
}
