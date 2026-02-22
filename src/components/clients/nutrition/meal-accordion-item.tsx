'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Check, ChevronRight, X, Loader2, Sun, Utensils, Apple, Moon, Sparkles, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { registerMealLog } from '@/app/(dashboard)/clients/[id]/meal-plan-actions'
import { compressImage } from '@/lib/image-utils'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogTrigger, DialogClose, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { OutOfPlanDialog } from './out-of-plan-dialog'
import { analyzeMealWithAI } from '@/app/(dashboard)/clients/[id]/ai-meal-actions'

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
};

interface MealAccordionItemProps {
    meal: any
    log?: any
    outOfPlanLog?: any
    clientId: string
}

export function MealAccordionItem({ meal, log, outOfPlanLog, clientId }: MealAccordionItemProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    // AI Flow State
    const [aiState, setAiState] = useState<'idle' | 'analyzing' | 'review'>('idle')
    const [photo, setPhoto] = useState<File | null>(null)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [aiData, setAiData] = useState<{ title: string, macros: { kcal: number, protein: number, carbs: number, fats: number }, ingredients: Array<{ name: string, category: string, grams: number }> } | null>(null)
    const [baseAiData, setBaseAiData] = useState<{ macros: { kcal: number, protein: number, carbs: number, fats: number }, totalGrams: number } | null>(null)
    const [loadingTextIndex, setLoadingTextIndex] = useState(0)

    const loadingTexts = [
        "Detectando ingredientes...",
        "Estimando cantidades...",
        "Calculando macros...",
        "Preparando resumen..."
    ]

    useEffect(() => {
        if (aiState === 'analyzing') {
            const interval = setInterval(() => {
                setLoadingTextIndex((prevIndex) => (prevIndex + 1) % loadingTexts.length)
            }, 2000) // Change text every 2 seconds
            return () => clearInterval(interval)
        } else {
            setLoadingTextIndex(0) // Reset when not analyzing
        }
    }, [aiState])

    const handleUpdateIngredients = (newIngredients: any[]) => {
        if (!baseAiData || !aiData) return;
        const newTotal = newIngredients.reduce((sum: number, ing: any) => sum + (Number(ing.grams) || 0), 0)
        let ratio = newTotal / baseAiData.totalGrams
        if (isNaN(ratio) || !isFinite(ratio) || ratio < 0) ratio = 1

        setAiData({
            ...aiData,
            ingredients: newIngredients,
            macros: {
                kcal: Math.round(baseAiData.macros.kcal * ratio),
                protein: Math.round(baseAiData.macros.protein * ratio),
                carbs: Math.round(baseAiData.macros.carbs * ratio),
                fats: Math.round(baseAiData.macros.fats * ratio),
            }
        })
    }

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

        try {
            const compressedFile = await compressImage(file, 0.8, 1600)
            setPhoto(compressedFile)
            setPhotoPreview(URL.createObjectURL(compressedFile))
            setAiState('analyzing')
            setIsDialogOpen(true) // Expand the modal to show AI flow 

            try {
                const compressedForAI = await compressImage(file, 0.6, 800)
                const base64 = await fileToBase64(compressedForAI)
                const result = await analyzeMealWithAI(base64, compressedForAI.type)

                if (result.success && result.data) {
                    const macros = {
                        kcal: result.data.macros?.kcal || 0,
                        protein: result.data.macros?.protein || 0,
                        carbs: result.data.macros?.carbs || 0,
                        fats: result.data.macros?.fats || 0
                    };
                    const ingredients = result.data.ingredients || [];
                    const computedTotalGrams = ingredients.reduce((sum: number, ing: any) => sum + (Number(ing.grams) || 0), 0);

                    setAiData({
                        title: result.data.title || meal.name,
                        macros: { ...macros },
                        ingredients: [...ingredients]
                    })
                    setBaseAiData({
                        macros: { ...macros },
                        totalGrams: computedTotalGrams > 0 ? computedTotalGrams : 1
                    })
                } else {
                    toast.error(result.error || 'No se pudieron estimar los macros.')
                }
            } catch (error) {
                console.error('AI Error:', error)
                toast.error('Error al analizar la imagen.')
            } finally {
                setAiState('review')
            }
        } catch (error) {
            console.error('Upload Error:', error)
            toast.error('Error al procesar la imagen')
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleSaveLog = async () => {
        if (!photo) return
        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', photo)

        let metadataToSave = null
        if (aiData) {
            metadataToSave = {
                description: aiData.title,
                macros: aiData.macros,
                ingredients: aiData.ingredients
            }
        }
        formData.append('metadata', JSON.stringify(metadataToSave || {}))

        try {
            const result = await registerMealLog(clientId, meal.name, formData)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success('¡Comida registrada!')
                setIsDialogOpen(false)
                setTimeout(() => {
                    setAiState('idle')
                    setPhoto(null)
                    setAiData(null)
                }, 300)
            }
        } catch (error) {
            console.error('Upload error:', error)
            toast.error('Error al guardar')
        } finally {
            setIsUploading(false)
        }
    }

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open)
        if (!open) {
            setTimeout(() => {
                setAiState('idle')
                setPhoto(null)
                setAiData(null)
            }, 300)
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
        : "Receta no asignada"

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

            <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                <div className="w-full bg-white rounded-[18px] border border-gray-200 shadow-none p-4 flex items-center justify-between gap-4 transition-all">
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

                <DialogContent className="max-w-md w-[95vw] max-h-[90vh] rounded-[32px] p-0 border-none bg-white shadow-2xl overflow-hidden flex flex-col" showCloseButton={false}>
                    {aiState !== 'idle' ? (
                        <div className="flex-1 w-full bg-white flex flex-col relative overflow-hidden">
                            {/* Header */}
                            <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-4 flex items-center shrink-0 h-16">
                                <DialogTitle className="sr-only">Análisis de Orbit AI</DialogTitle>
                                <button
                                    onClick={() => { setAiState('idle'); setPhoto(null); setAiData(null); }}
                                    disabled={isUploading}
                                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors z-20"
                                >
                                    <ArrowLeft className="w-6 h-6 text-gray-900" />
                                </button>
                                <h1 className="flex-1 text-center font-bold text-gray-900 absolute inset-0 flex items-center justify-center pointer-events-none uppercase tracking-widest text-xs">
                                    {aiState === 'analyzing' ? "Orbit AI" : "Análisis Orbit AI"}
                                </h1>
                            </div>
                            {(aiState === 'review' && aiData) && <div className="h-px bg-gray-100 w-full shrink-0" />}

                            {/* Content Scrollable Area */}
                            <div className="px-6 pb-28 space-y-8 flex-1 overflow-y-auto custom-scrollbar">

                                {/* Image Header Block */}
                                <div className="relative w-full aspect-[4/3] rounded-[20px] overflow-hidden shadow-sm bg-gray-100 mt-2 shrink-0">
                                    {photoPreview && (
                                        <Image
                                            src={photoPreview}
                                            alt="Preview"
                                            fill
                                            className="object-cover"
                                        />
                                    )}

                                    {/* Overlay during loading */}
                                    {aiState === 'analyzing' && (
                                        <div className="absolute inset-0 bg-black/10" />
                                    )}

                                    {/* Results Badge */}
                                    {(aiState === 'review' && aiData?.ingredients) && (
                                        <div className="absolute bottom-3 left-3 bg-white shadow-sm rounded-full py-1.5 px-3 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-[#4139CF]" />
                                            <span className="text-xs font-semibold text-gray-900">
                                                IA detectó {aiData.ingredients.length} ingredientes
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* --- STATE 1: LOADING --- */}
                                {aiState === 'analyzing' ? (
                                    <div className="flex flex-col items-center justify-center pt-8 text-center px-4 animate-in fade-in duration-500">
                                        <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">Estamos analizando tu plato</h2>

                                        <div className="h-6 mb-8 relative w-full flex justify-center">
                                            <p
                                                key={loadingTextIndex}
                                                className="text-[15px] text-gray-500 absolute animate-in fade-in slide-in-from-bottom-2 duration-300"
                                            >
                                                {loadingTexts[loadingTextIndex] || "Analizando..."}
                                            </p>
                                        </div>

                                        {/* Indeterminate Line Progress */}
                                        <div className="w-full max-w-[200px] h-[2px] bg-gray-100 rounded-full overflow-hidden relative">
                                            <div className="absolute top-0 left-0 h-full bg-[#4139CF] rounded-full w-1/3 animate-[progress_1.5s_ease-in-out_infinite] origin-left" />
                                        </div>
                                    </div>
                                ) : (
                                    /* --- STATE 2: RESULTS --- */
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2 pb-6">

                                        <div className="space-y-0.5">
                                            <h2 className="text-xl font-bold tracking-tight leading-tight text-gray-900">
                                                Esto es lo que encontramos
                                            </h2>
                                            <p className="text-sm text-gray-500 leading-snug">
                                                Puedes ajustar cualquier ingrediente si algo no coincide.
                                            </p>
                                        </div>

                                        {/* Macros Card */}
                                        <div className="bg-[#F9FAFB] rounded-[24px] p-4 pb-6 flex flex-col items-center shadow-sm">
                                            {/* Main Kcal */}
                                            <div className="flex items-baseline gap-1 mb-1">
                                                <span className="text-5xl font-black text-gray-900 tabular-nums leading-none tracking-tighter">
                                                    {aiData?.macros?.kcal || 0}
                                                </span>
                                                <span className="text-xl font-bold text-[#4139CF]">kcal</span>
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-8">Total Estimado</span>

                                            {/* Sub Macros Grid */}
                                            <div className="flex items-end justify-between w-full max-w-[240px] px-2 relative h-[50px]">
                                                {/* Divider Lines */}
                                                <div className="absolute top-1/2 -translate-y-1/2 left-1/3 w-[1px] h-8 bg-gray-200" />
                                                <div className="absolute top-1/2 -translate-y-1/2 right-1/3 w-[1px] h-8 bg-gray-200" />

                                                {/* Protein */}
                                                <div className="flex flex-col items-center flex-1 z-10 relative pb-3">
                                                    <span className="text-lg font-bold text-gray-900 leading-none mb-1 tabular-nums">{aiData?.macros?.protein || 0}g</span>
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Proteína</span>
                                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full bg-blue-500" />
                                                </div>

                                                {/* Carbs */}
                                                <div className="flex flex-col items-center flex-1 z-10 relative pb-3">
                                                    <span className="text-lg font-bold text-gray-900 leading-none mb-1 tabular-nums">{aiData?.macros?.carbs || 0}g</span>
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Carbos</span>
                                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full bg-yellow-500" />
                                                </div>

                                                {/* Fats */}
                                                <div className="flex flex-col items-center flex-1 z-10 relative pb-3">
                                                    <span className="text-lg font-bold text-gray-900 leading-none mb-1 tabular-nums">{aiData?.macros?.fats || 0}g</span>
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Grasas</span>
                                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full bg-red-500" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ingredients List */}
                                        <div className="space-y-4">
                                            <div className="flex items-end justify-between pb-2">
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900">Ingredientes detectados</h3>
                                                    <p className="text-[13px] text-gray-500">Toca para editar cantidades o eliminar</p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const newIngs = [...(aiData?.ingredients || []), { name: 'Extra', category: 'Añadido', grams: 50 }];
                                                        handleUpdateIngredients(newIngs);
                                                    }}
                                                    className="text-[#4139CF] text-sm font-semibold hover:opacity-80 transition-opacity"
                                                >
                                                    + Añadir
                                                </button>
                                            </div>

                                            <div className="space-y-0 relative">
                                                {aiData?.ingredients?.map((ing, idx) => (
                                                    <div key={idx} className="relative group hover:bg-gray-50/50 transition-colors">
                                                        <div className="flex items-center justify-between py-4">
                                                            <div className="font-medium pr-4">
                                                                <input
                                                                    value={ing.name}
                                                                    onChange={(e) => {
                                                                        const newIngs = [...(aiData.ingredients || [])];
                                                                        newIngs[idx] = { ...newIngs[idx], name: e.target.value };
                                                                        handleUpdateIngredients(newIngs);
                                                                    }}
                                                                    className="text-[15px] font-medium text-gray-900 bg-transparent border-none outline-none focus:ring-1 focus:ring-gray-200 rounded px-1 -ml-1 w-full"
                                                                />
                                                                <p className="text-[13px] text-gray-500 mt-0.5">{ing.category}</p>
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0 bg-gray-50 rounded px-2 focus-within:ring-1 focus-within:ring-gray-200">
                                                                <input
                                                                    type="number"
                                                                    value={ing.grams || ''}
                                                                    onChange={(e) => {
                                                                        const newIngs = [...(aiData.ingredients || [])];
                                                                        newIngs[idx] = { ...newIngs[idx], grams: Number(e.target.value) };
                                                                        handleUpdateIngredients(newIngs);
                                                                    }}
                                                                    className="w-12 text-right bg-transparent text-[15px] font-bold text-gray-900 outline-none p-0 border-none tabular-nums"
                                                                />
                                                                <span className="text-[15px] font-bold text-gray-900">g</span>
                                                                <button
                                                                    onClick={() => {
                                                                        const newIngs = [...(aiData.ingredients || [])];
                                                                        newIngs.splice(idx, 1);
                                                                        handleUpdateIngredients(newIngs);
                                                                    }}
                                                                    className="ml-2 py-2 opacity-50 hover:opacity-100 hover:text-red-500 transition-colors"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {idx < aiData.ingredients.length - 1 && (
                                                            <div className="absolute bottom-0 right-0 left-0 h-[1px] bg-gray-100" />
                                                        )}
                                                    </div>
                                                ))}

                                                {(!aiData?.ingredients || aiData.ingredients.length === 0) && (
                                                    <div className="py-4 text-sm text-gray-500 italic">
                                                        {aiData?.title || "No se detallaron ingredientes individuales."}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Fixed Bottom CTA for Results */}
                            {aiState === 'review' && (
                                <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 p-6 pt-4 flex flex-col gap-3 z-50">
                                    <Button
                                        className="w-full h-14 bg-[#111827] hover:bg-[#1F2937] text-white rounded-[16px] text-[16px] font-bold shadow-sm transition-all active:scale-[0.98]"
                                        onClick={handleSaveLog}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                                                Subiendo...
                                            </>
                                        ) : (
                                            'Confirmar y registrar'
                                        )}
                                    </Button>

                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="w-full text-[15px] font-medium text-gray-500 hover:text-gray-900 py-2 transition-colors"
                                    >
                                        Volver a analizar
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
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

                            {/* Action */}
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
                    )}
                </DialogContent>
            </Dialog>

            {/* Out of plan log render */}
            {outOfPlanLog && (
                <div className="w-full bg-blue-50/50 rounded-[18px] border border-blue-100 shadow-none p-4 flex items-center justify-between gap-4 transition-all mt-2">
                    <div className="flex-1 cursor-pointer">
                        <h3 className="text-[15px] font-bold text-blue-900 leading-tight mb-1">Comida registrada</h3>
                        <p className="text-[13px] text-blue-500 font-medium">
                            {outOfPlanLog.metadata?.macros?.kcal ? `${outOfPlanLog.metadata.macros.kcal} kcal` : 'Sin estimación'}
                        </p>
                        {outOfPlanLog.metadata?.description && (
                            <p className="text-[12px] text-gray-400 mt-1 truncate">{outOfPlanLog.metadata.description}</p>
                        )}
                    </div>
                    {/* Could add edit / delete button here taking outOfPlanLog.id */}
                </div>
            )}

            {/* Out of plan action */}
            {!outOfPlanLog && (
                <OutOfPlanDialog clientId={clientId} mealName={meal.name} />
            )}
        </div>
    )
}

function MacroChip({ label, value, unit, textColor }: { label: string; value?: number; unit: string; textColor: string }) {
    if (value === undefined) return null;
    return (
        <div className="flex flex-col items-center justify-center py-4 rounded-2xl border border-gray-200 bg-white shadow-none">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{label}</span>
            <span className={cn("text-xl font-black", textColor)}>
                {value}<span className="text-[13px] font-bold text-gray-400 ml-0.5">{unit}</span>
            </span>
        </div>
    )
}
