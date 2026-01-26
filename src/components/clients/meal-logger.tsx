'use client'

import { useState, useRef } from 'react'
import { Camera, Loader2, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { logMeal } from '@/app/(client)/dashboard/diet/actions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export function MealLogger({ clientId }: { clientId: string }) {
    const [isUploading, setIsUploading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [mealType, setMealType] = useState<string>('almuerzo')

    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setSelectedFile(file)
            setPreviewUrl(URL.createObjectURL(file))
            setIsOpen(true) // Open dialog to confirm/select type
        }
    }

    const handleUpload = async () => {
        if (!selectedFile) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append('photo', selectedFile)
        formData.append('mealType', mealType)
        formData.append('clientId', clientId)

        const result = await logMeal(formData)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('¡Comida registrada!')
            setIsOpen(false)
            setSelectedFile(null)
            setPreviewUrl(null)
        }
        setIsUploading(false)
    }

    return (
        <>
            <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
            />

            <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 shadow-md"
            >
                <Camera className="mr-2 h-5 w-5" />
                Registrar Comida
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirmar Foto</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {previewUrl && (
                            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-gray-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={previewUrl} alt="Preview" className="object-cover w-full h-full" />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>¿Qué comida es?</Label>
                            <Select value={mealType} onValueChange={setMealType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="desayuno">Desayuno</SelectItem>
                                    <SelectItem value="almuerzo">Almuerzo</SelectItem>
                                    <SelectItem value="merienda">Merienda</SelectItem>
                                    <SelectItem value="cena">Cena</SelectItem>
                                    <SelectItem value="snack">Snack / Otro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            onClick={handleUpload}
                            disabled={isUploading}
                            className="w-full"
                        >
                            {isUploading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo...</>
                            ) : (
                                <><UploadCloud className="mr-2 h-4 w-4" /> Guardar</>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
