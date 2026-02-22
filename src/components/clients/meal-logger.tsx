'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Check, Sparkles, ChevronRight, ArrowLeft, X } from 'lucide-react'
import { toast } from 'sonner'
import { registerMealLog, deleteMealLog } from '@/app/(dashboard)/clients/[id]/meal-plan-actions'
import { analyzeMealWithAI } from '@/app/(dashboard)/clients/[id]/ai-meal-actions'
import { compressImage } from '@/lib/image-utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import Image from 'next/image'

interface MealLoggerProps {
    clientId: string
    mealName: string
    existingLogs: any[] // From Supabase
}

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

export function MealLogger({ clientId, mealName, existingLogs }: MealLoggerProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [loadingTextIndex, setLoadingTextIndex] = useState(0)
    const [aiData, setAiData] = useState<{
        title?: string,
        macros?: { kcal?: number, protein?: number, carbs?: number, fats?: number },
        ingredients?: Array<{ name: string, category: string, grams: number }>
    } | null>(null)
    const [baseAiData, setBaseAiData] = useState<{ macros: { kcal: number, protein: number, carbs: number, fats: number }, totalGrams: number } | null>(null)

    const loadingTexts = [
        "Detectando ingredientes...",
        "Estimando cantidades...",
        "Calculando macros...",
        "Preparando resumen..."
    ]

    // Cycle internal text if analyzing
    useEffect(() => {
        if (!isAnalyzing) return
        const interval = setInterval(() => {
            setLoadingTextIndex(prev => (prev + 1) % loadingTexts.length)
        }, 1500)
        return () => clearInterval(interval)
    }, [isAnalyzing])

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

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
            setConfirmOpen(true)

            // Start AI Analysis
            setIsAnalyzing(true)
            setAiData(null)
            try {
                // Compress for AI to save tokens and speed up
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

                    setAiData(result.data)
                    setBaseAiData({
                        macros: { ...macros },
                        totalGrams: computedTotalGrams > 0 ? computedTotalGrams : 1
                    })
                } else {
                    toast.error('No se pudieron estimar los macros.')
                }
            } catch (err) {
                console.error('Error analyzing meal:', err)
                toast.error('Error al analizar la imagen.')
            } finally {
                setIsAnalyzing(false)
            }
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleConfirmUpload = async () => {
        if (!selectedFile) return

        setIsUploading(true)
        const formData = new FormData()

        try {
            // Compress client-side
            const compressedFile = await compressImage(selectedFile, 0.8, 1600)
            formData.append('file', compressedFile)

            if (aiData) {
                formData.append('metadata', JSON.stringify({
                    description: aiData.title,
                    macros: aiData.macros
                }))
            }

            const result = await registerMealLog(clientId, mealName, formData)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success('Comida registrada exitosamente')
                setConfirmOpen(false)
                setSelectedFile(null)
                setPreviewUrl(null)
            }
        } catch (error) {
            console.error('Error in handleConfirmUpload:', error)
            toast.error('Errorinesperado al subir la comida')
        } finally {
            setIsUploading(false)
        }
    }

    const handleCancel = () => {
        setConfirmOpen(false)
        setSelectedFile(null)
        setPreviewUrl(null)
        setAiData(null)
        setIsAnalyzing(false)
        setLoadingTextIndex(0)
    }

    const handleReanalyze = () => {
        setAiData(null)
        setIsAnalyzing(true)
        setLoadingTextIndex(0)

        // Simular re-análisis sin volver a llamar a la API consumiendo tokens
        // En un caso real, esto llamaría de nuevo a la función
        // Pero para UI testing podemos forzar cierre y apertura o reajustar state
        handleCancel()
        toast.info("Por favor, sube la foto nuevamente para reanalizar.")
    }

    const triggerFileRead = () => {
        fileInputRef.current?.click()
    }

    const handleDeleteLog = async (logId: string, imagePath: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta foto?')) return

        try {
            const result = await deleteMealLog(logId, imagePath)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success('Foto eliminada')
            }
        } catch (error) {
            toast.error('Error al eliminar la foto')
        }
    }

    // Filter logs for this specific meal (case sensitive? Usually mealName matches what is stored)
    // The logs passed in should already be filtered or we filter here if we pass all daily logs.
    // Let's assume parent passes logs filtered for this meal or we filter here.
    // For simplicity, let's assume the parent passes ALL daily logs and we filter.
    const myLogs = existingLogs.filter(log => log.meal_type === mealName)

    const hasLogs = myLogs.length > 0

    return (
        <div className="mt-4 pt-3 border-t border-gray-100">
            {/* Hidden Input */}
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
            />

            {/* Existing Logs Visualization */}
            {hasLogs && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-none">
                    {myLogs.map((log) => (
                        <div key={log.id} className="relative h-16 w-16 shrink-0 rounded-xl overflow-hidden border border-gray-100 group">
                            <Image
                                src={log.signedUrl || '/placeholder.png'}
                                alt="Comida registrada"
                                fill
                                className="object-cover"
                            />
                            <button
                                onClick={() => handleDeleteLog(log.id, log.image_path)}
                                className="absolute top-1 right-1 bg-white/90 text-red-500 p-1 rounded-full shadow-sm md:opacity-0 group-hover:opacity-100 transition-opacity active:scale-95"
                                title="Eliminar foto"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* CTA Button */}
            <div className="flex items-center justify-between">
                {(!hasLogs) && (
                    <span className="text-xs text-gray-500 italic">Sin comidas registradas</span>
                )}
                {hasLogs && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><Check className="h-3 w-3" /> Registrado</span>}

                <Button
                    size="sm"
                    onClick={triggerFileRead}
                    disabled={isUploading}
                    className="ml-auto gap-2 bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl px-4 transition-all active:scale-95 shadow-sm border-none"
                >
                    <Camera className="h-4 w-4" />
                    {hasLogs ? "Registrar otra" : "Registrar comida"}
                </Button>
            </div>

            {/* Fullscreen-like Modal for AI Analysis */}
            <Dialog open={confirmOpen} onOpenChange={(open) => !isUploading && !isAnalyzing && !open && handleCancel()}>
                <DialogContent className="sm:max-w-md w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] p-0 overflow-y-auto bg-white rounded-none sm:rounded-[24px] border-none flex flex-col hide-scrollbar">

                    {/* Header */}
                    <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-4 py-4 flex items-center shrink-0">
                        <DialogTitle className="sr-only">Análisis de Orbit AI</DialogTitle>
                        <button
                            onClick={handleCancel}
                            disabled={isUploading}
                            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6 text-gray-900" />
                        </button>
                        <h1 className="flex-1 text-center font-bold text-gray-900 absolute left-0 right-0 pointer-events-none uppercase tracking-widest text-xs">
                            {isAnalyzing ? "Orbit AI" : "Análisis Orbit AI"}
                        </h1>
                    </div>
                    {(!isAnalyzing && aiData) && <div className="h-px bg-gray-100 w-full" />}

                    {/* Content Scrollable Area */}
                    <div className="px-6 pb-24 space-y-8 flex-1">

                        {/* Image Header Block (Shared) */}
                        <div className="relative w-full aspect-[4/3] rounded-[20px] overflow-hidden shadow-sm bg-gray-100 mt-2 shrink-0">
                            {previewUrl && (
                                <Image
                                    src={previewUrl}
                                    alt="Preview"
                                    fill
                                    className="object-cover"
                                />
                            )}

                            {/* Overlay during loading to make it clean */}
                            {isAnalyzing && (
                                <>
                                    <div className="absolute inset-0 bg-black/20" />
                                    <div className="absolute left-0 right-0 h-1 bg-[#4139CF] shadow-[0_0_20px_4px_#4139CF] animate-scan-laser z-10" />
                                </>
                            )}

                            {/* Results Badge */}
                            {(!isAnalyzing && aiData?.ingredients) && (
                                <div className="absolute bottom-3 left-3 bg-white shadow-sm rounded-full py-1.5 px-3 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-[#4139CF]" />
                                    <span className="text-xs font-semibold text-gray-900">
                                        IA detectó {aiData.ingredients.length} ingredientes
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* --- STATE 1: LOADING --- */}
                        {isAnalyzing ? (
                            <div className="flex flex-col items-center justify-center pt-8 text-center px-4 animate-in fade-in duration-500">
                                <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">Estamos analizando tu plato</h2>

                                <div className="h-6 mb-8 relative w-full flex justify-center">
                                    <p
                                        key={loadingTextIndex}
                                        className="text-[15px] text-gray-500 absolute animate-in fade-in slide-in-from-bottom-2 duration-300"
                                    >
                                        {loadingTexts[loadingTextIndex]}
                                    </p>
                                </div>

                                {/* Indeterminate Line Progress */}
                                <div className="w-full max-w-[200px] h-[2px] bg-gray-100 rounded-full overflow-hidden relative">
                                    <div className="absolute top-0 left-0 h-full bg-[#4139CF] rounded-full w-1/3 animate-[progress_1.5s_ease-in-out_infinite] origin-left" />
                                </div>
                            </div>
                        ) : aiData ? (
                            /* --- STATE 2: RESULTS --- */
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2">

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
                                            {aiData.macros?.kcal || 0}
                                        </span>
                                        <span className="text-xl font-bold text-[#4139CF]">kcal</span>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-8">Total Estimado</span>

                                    {/* Sub Macros Grid */}
                                    <div className="flex items-end justify-between w-full max-w-[240px] px-2 relative h-[50px]">
                                        {/* Divider Lines (Vertical) */}
                                        <div className="absolute top-1/2 -translate-y-1/2 left-1/3 w-[1px] h-8 bg-gray-200" />
                                        <div className="absolute top-1/2 -translate-y-1/2 right-1/3 w-[1px] h-8 bg-gray-200" />

                                        {/* Protein */}
                                        <div className="flex flex-col items-center flex-1 z-10 group relative pb-3">
                                            <span className="text-lg font-bold text-gray-900 leading-none mb-1 tabular-nums">{aiData.macros?.protein || 0}g</span>
                                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Proteína</span>
                                            {/* Accent Line Bottom */}
                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full bg-blue-500" />
                                        </div>

                                        {/* Carbs */}
                                        <div className="flex flex-col items-center flex-1 z-10 group relative pb-3">
                                            <span className="text-lg font-bold text-gray-900 leading-none mb-1 tabular-nums">{aiData.macros?.carbs || 0}g</span>
                                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Carbos</span>
                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full bg-yellow-500" />
                                        </div>

                                        {/* Fats */}
                                        <div className="flex flex-col items-center flex-1 z-10 group relative pb-3">
                                            <span className="text-lg font-bold text-gray-900 leading-none mb-1 tabular-nums">{aiData.macros?.fats || 0}g</span>
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
                                        {aiData.ingredients?.map((ing, idx) => (
                                            <div key={idx} className="relative cursor-pointer group hover:bg-gray-50/50 transition-colors">
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
                                                {/* Divider except last */}
                                                {idx < aiData.ingredients!.length - 1 && (
                                                    <div className="absolute bottom-0 right-0 left-0 h-[1px] bg-gray-100" />
                                                )}
                                            </div>
                                        ))}

                                        {/* Fallback string for old structures */}
                                        {(!aiData.ingredients || aiData.ingredients.length === 0) && (
                                            <div className="py-4 text-sm text-gray-500 italic">
                                                {aiData.title || "No se detallaron ingredientes individuales."}
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        ) : null}
                    </div>

                    {/* Fixed Bottom CTA for Results */}
                    {(!isAnalyzing && aiData) && (
                        <div className="fixed bottom-0 left-0 right-0 sm:absolute bg-white/95 backdrop-blur-xl border-t border-gray-100 p-6 pt-4 pb-8 sm:pb-6 flex flex-col gap-3 z-50">
                            <Button
                                className="w-full h-14 bg-[#111827] hover:bg-[#1F2937] text-white rounded-[16px] text-[16px] font-bold shadow-sm transition-all active:scale-[0.98]"
                                onClick={handleConfirmUpload}
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
                                onClick={handleReanalyze}
                                disabled={isUploading}
                                className="w-full text-[15px] font-medium text-gray-500 hover:text-gray-900 py-2 transition-colors"
                            >
                                Volver a analizar
                            </button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
