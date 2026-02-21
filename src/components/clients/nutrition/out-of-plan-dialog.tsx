'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Loader2, X, Plus, Search, Check } from 'lucide-react'
import { toast } from 'sonner'
import { registerMealLog } from '@/app/(dashboard)/clients/[id]/meal-plan-actions'
import { getIngredientsAction } from '@/app/(dashboard)/recipes/actions'
import { compressImage } from '@/lib/image-utils'
import { Dialog, DialogContent, DialogTrigger, DialogClose, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface OutOfPlanDialogProps {
    clientId: string
    mealName: string
}

export function OutOfPlanDialog({ clientId, mealName }: OutOfPlanDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)

    // Form state
    const [photo, setPhoto] = useState<File | null>(null)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [description, setDescription] = useState('')
    const [estimateMacros, setEstimateMacros] = useState(false)

    // Ingredients search state
    const [allIngredients, setAllIngredients] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedItems, setSelectedItems] = useState<any[]>([])

    useEffect(() => {
        if (estimateMacros && allIngredients.length === 0) {
            getIngredientsAction().then(res => {
                if (res.ingredients) setAllIngredients(res.ingredients)
            })
        }
    }, [estimateMacros, allIngredients.length])

    const filteredIngredients = searchQuery.trim() === '' ? [] : allIngredients.filter(ing =>
        ing.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5)

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const compressedFile = await compressImage(file, 0.8, 1600)
            setPhoto(compressedFile)
            setPhotoPreview(URL.createObjectURL(compressedFile))
        } catch (error) {
            toast.error('Error procesando imagen')
        }
    }

    const handleAddItem = (ingredient: any) => {
        // default 100g
        setSelectedItems(prev => [...prev, { ...ingredient, quantity: 100 }])
        setSearchQuery('')
    }

    const handleUpdateQuantity = (index: number, val: string) => {
        const newItems = [...selectedItems]
        newItems[index].quantity = val === '' ? '' : Number(val)
        setSelectedItems(newItems)
    }

    const handleRemoveItem = (index: number) => {
        setSelectedItems(prev => prev.filter((_, i) => i !== index))
    }

    // Calculos
    const calculateTotals = () => {
        let kcal = 0, protein = 0, carbs = 0, fats = 0
        selectedItems.forEach(item => {
            const qty = Number(item.quantity) || 0
            const factor = qty / 100
            kcal += (item.kcal_100g || 0) * factor
            protein += (item.protein_100g || 0) * factor
            carbs += (item.carbs_100g || 0) * factor
            fats += (item.fat_100g || 0) * factor
        })
        return {
            kcal: Math.round(kcal),
            protein: Math.round(protein),
            carbs: Math.round(carbs),
            fats: Math.round(fats)
        }
    }

    const totals = calculateTotals()

    const handleSave = async () => {
        if (estimateMacros && selectedItems.length === 0) {
            toast.error('Agrega al menos un alimento')
            return
        }

        setIsUploading(true)
        const formData = new FormData()
        if (photo) {
            formData.append('file', photo)
        }

        const metadata = {
            is_out_of_plan: true,
            description: description.trim(),
            macros: estimateMacros ? totals : null,
            items: estimateMacros ? selectedItems.map(i => ({
                id: i.id,
                name: i.name,
                quantity: Number(i.quantity) || 0,
                unit: 'g'
            })) : []
        }

        formData.append('metadata', JSON.stringify(metadata))

        try {
            const result = await registerMealLog(clientId, mealName, formData)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success('¡Comida registrada!')
                setIsOpen(false)
                // reset state
                setPhoto(null)
                setPhotoPreview(null)
                setDescription('')
                setEstimateMacros(false)
                setSelectedItems([])
            }
        } catch (error) {
            toast.error('Error al guardar')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <div className="mt-2 flex justify-center">
                <DialogTrigger asChild>
                    <button className="text-[14px] font-medium text-gray-400 hover:text-black transition-colors rounded-full py-1.5 px-4 bg-gray-50/50">
                        Registrar otra comida
                    </button>
                </DialogTrigger>
            </div>

            <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto rounded-[32px] p-6 border-none bg-white shadow-2xl">
                <div className="flex justify-between items-start gap-4 mb-6">
                    <div>
                        <DialogTitle className="text-2xl font-bold text-gray-900 leading-tight">
                            Comida fuera del plan
                        </DialogTitle>
                        <p className="text-gray-500 font-medium mt-1 text-sm">{mealName}</p>
                    </div>
                    <DialogClose className="p-2 bg-gray-100/50 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </DialogClose>
                </div>

                <div className="space-y-6">
                    {/* Foto opcional */}
                    <div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileSelect}
                        />
                        {photoPreview ? (
                            <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button onClick={() => fileInputRef.current?.click()} variant="secondary" size="sm" className="rounded-xl font-bold">
                                        Cambiar foto
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-24 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
                            >
                                <Camera className="w-6 h-6 mb-1" />
                                <span className="text-sm font-semibold">Agregar foto (opcional)</span>
                            </button>
                        )}
                    </div>

                    {/* Descripcion */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700">¿Qué comiste?</Label>
                        <Input
                            placeholder="Ej: Hamburguesa con papas..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="h-12 rounded-xl bg-gray-50 border-gray-200"
                        />
                    </div>

                    {/* Toggle Macros */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold text-gray-900">Estimar macros</Label>
                            <p className="text-xs text-gray-500">Agrega alimentos manualmente para el progreso diario</p>
                        </div>
                        <Switch checked={estimateMacros} onCheckedChange={setEstimateMacros} />
                    </div>

                    {/* Estimador */}
                    {estimateMacros && (
                        <div className="space-y-4 pt-2">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <Input
                                    placeholder="Buscar alimento..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-10 pl-9 rounded-xl bg-gray-50 border-gray-200 text-sm"
                                />
                                {filteredIngredients.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-10">
                                        {filteredIngredients.map(ing => (
                                            <button
                                                key={ing.id}
                                                onClick={() => handleAddItem(ing)}
                                                className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-0"
                                            >
                                                <span>{ing.name}</span>
                                                <Plus className="w-4 h-4 text-gray-400" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Seleccionados */}
                            {selectedItems.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">AGREGADOS</h4>
                                    <div className="space-y-2">
                                        {selectedItems.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <span className="font-semibold text-gray-900 text-sm">{item.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            type="number"
                                                            value={item.quantity === '' ? '' : item.quantity}
                                                            onChange={(e) => handleUpdateQuantity(idx, e.target.value)}
                                                            className="w-16 h-8 text-center px-1 py-0 bg-white border-gray-200 rounded-lg text-sm"
                                                        />
                                                        <span className="text-xs font-semibold text-gray-400 shrink-0">g</span>
                                                    </div>
                                                    <button onClick={() => handleRemoveItem(idx)} className="p-1 text-gray-400 hover:text-red-500 rounded-md">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Totales */}
                                    <div className="grid grid-cols-4 gap-2 pt-2">
                                        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Kcal</span>
                                            <span className="font-black text-gray-900 text-sm">{totals.kcal}</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">P</span>
                                            <span className="font-black text-[#C50D00] text-sm">{totals.protein}g</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">C</span>
                                            <span className="font-black text-[#E7A202] text-sm">{totals.carbs}g</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">G</span>
                                            <span className="font-black text-[#009B27] text-sm">{totals.fats}g</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action */}
                    <div className="pt-2">
                        <Button
                            onClick={handleSave}
                            disabled={isUploading || (estimateMacros && selectedItems.length === 0)}
                            className="w-full bg-black hover:bg-black/90 text-white h-14 rounded-[20px] text-[15px] font-bold shadow-xl shadow-black/5"
                        >
                            {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
                            {isUploading ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
