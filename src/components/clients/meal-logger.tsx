'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Image as ImageIcon, Check, Loader2, Plus, X } from 'lucide-react'
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
    const [aiData, setAiData] = useState<{ title?: string, macros?: { kcal?: number, protein?: number, carbs?: number, fats?: number } } | null>(null)

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
                    setAiData(result.data)
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

            {/* Confirmation Dialog */}
            <Dialog open={confirmOpen} onOpenChange={(open) => !isUploading && !open && handleCancel()}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl gap-0">
                    <div className="relative w-full aspect-[4/3] bg-black">
                        {previewUrl && (
                            <Image
                                src={previewUrl}
                                alt="Preview"
                                fill
                                className="object-contain"
                            />
                        )}
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-2 right-2 text-white hover:bg-white/20 rounded-full"
                            onClick={handleCancel}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="p-4 space-y-4 bg-white max-h-[60vh] overflow-y-auto">
                        <div>
                            <DialogTitle className="text-lg font-bold text-gray-900">Confirmar comida</DialogTitle>
                            <DialogDescription className="text-sm text-gray-500">¿Estás registrando tu {mealName}?</DialogDescription>
                        </div>

                        {isAnalyzing ? (
                            <div className="flex items-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <p className="text-sm font-medium">✨ Analizando la comida con IA...</p>
                            </div>
                        ) : aiData ? (
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Comida detectada</label>
                                    <input
                                        type="text"
                                        className="w-full text-sm font-medium bg-gray-50 border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        value={aiData.title || ''}
                                        onChange={(e) => setAiData({ ...aiData, title: e.target.value })}
                                    />
                                </div>
                                <div className="pt-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Macros Estimados</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mb-1 text-center">Kcal</span>
                                            <input type="number"
                                                className="w-full text-center text-sm font-black text-gray-900 bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                                                value={aiData.macros?.kcal || ''}
                                                onChange={(e) => setAiData({ ...aiData, macros: { ...aiData.macros, kcal: Number(e.target.value) } })}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mb-1 text-center">P</span>
                                            <input type="number"
                                                className="w-full text-center text-sm font-black text-[#C50D00] bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                                                value={aiData.macros?.protein || ''}
                                                onChange={(e) => setAiData({ ...aiData, macros: { ...aiData.macros, protein: Number(e.target.value) } })}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mb-1 text-center">C</span>
                                            <input type="number"
                                                className="w-full text-center text-sm font-black text-[#E7A202] bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                                                value={aiData.macros?.carbs || ''}
                                                onChange={(e) => setAiData({ ...aiData, macros: { ...aiData.macros, carbs: Number(e.target.value) } })}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mb-1 text-center">G</span>
                                            <input type="number"
                                                className="w-full text-center text-sm font-black text-[#009B27] bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                                                value={aiData.macros?.fats || ''}
                                                onChange={(e) => setAiData({ ...aiData, macros: { ...aiData.macros, fats: Number(e.target.value) } })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" className="flex-1" onClick={handleCancel}>
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1 bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl"
                                onClick={handleConfirmUpload}
                                disabled={isUploading || isAnalyzing}
                            >
                                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isUploading ? 'Subiendo...' : 'Confirmar'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
