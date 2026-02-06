'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createCheckin, uploadCheckinPhoto } from '../actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, UploadCloud, Info, X, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { compressImage } from '@/lib/image-utils'
import { getTodayString } from '@/lib/utils'

interface CheckinFormProps {
    initialWeight?: number
    gender?: 'male' | 'female' | string
    height?: number
}

interface PhotoItem {
    url: string
    path?: string // For private storage ref
    type: 'front' | 'back' | 'profile' | 'other'
}

function calculateNavyBodyFat(gender: string, heightCm: number, neckCm: number, waistCm: number, hipCm?: number) {
    if (!heightCm || !neckCm || !waistCm) return ''

    try {
        let result = 0
        const isMale = gender?.toLowerCase() === 'male' || gender?.toLowerCase() === 'hombre'

        if (isMale) {
            if (waistCm - neckCm <= 0) return '' // Invalid for log
            const denom = 1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)
            result = 495 / denom - 450
        } else {
            if (!hipCm) return ''
            if (waistCm + hipCm - neckCm <= 0) return ''
            const denom = 1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.22100 * Math.log10(heightCm)
            result = 495 / denom - 450
        }

        return result.toFixed(1)
    } catch (e) {
        return ''
    }
}

export function CheckinForm({ initialWeight, gender = 'male', height }: CheckinFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const normalizedGender = gender?.toLowerCase()
    const isMale = normalizedGender === 'male' || normalizedGender === 'hombre'
    const [isManualFat, setIsManualFat] = useState(false)
    const [uploading, setUploading] = useState(false)

    const [formData, setFormData] = useState({
        weight: initialWeight || '',
        body_fat: '',
        lean_mass: '',
        neck: '',
        chest: '',
        waist: '',
        hip: '',
        arm: '',
        thigh: '',
        calf: '',
        observations: '',
        photos: [] as PhotoItem[]
    })

    const [localHeight, setLocalHeight] = useState(height || '')

    // Update local height if prop changes
    useEffect(() => {
        if (height) setLocalHeight(height)
    }, [height])

    // Calculate Body Fat Effect
    useEffect(() => {
        if (!isManualFat && localHeight) {
            const neck = Number(formData.neck)
            const waist = Number(formData.waist)
            const hip = Number(formData.hip)
            const h = Number(localHeight)

            // Only attempt calculation if essential measurements are positive
            if (neck > 0 && waist > 0 && h > 0) {
                const calculated = calculateNavyBodyFat(gender, h, neck, waist, hip)
                if (calculated !== '') {
                    setFormData(prev => ({
                        ...prev,
                        body_fat: calculated,
                        lean_mass: (100 - Number(calculated)).toFixed(1)
                    }))
                }
            } else {
                // Clear body fat and lean mass if essential inputs are invalid
                setFormData(prev => ({
                    ...prev,
                    body_fat: '',
                    lean_mass: ''
                }))
            }
        }
    }, [formData.neck, formData.waist, formData.hip, isManualFat, gender, localHeight])

    // Calculate Lean Mass when Body Fat changes (manual or auto)
    useEffect(() => {
        if (formData.body_fat) {
            const fat = Number(formData.body_fat)
            if (!isNaN(fat)) {
                setFormData(prev => ({
                    ...prev,
                    lean_mass: (100 - fat).toFixed(1)
                }))
            }
        }
    }, [formData.body_fat])

    // Helper for date defaults
    const todayStr = getTodayString()

    const handleSlotUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: PhotoItem['type']) => {
        if (!e.target.files?.length) return

        setUploading(true)
        const file = e.target.files[0] // Single file per slot

        try {
            // Compress client-side
            const compressedFile = await compressImage(file, 0.8, 1600)

            const uploadData = new FormData()
            uploadData.append('file', compressedFile)

            const res = await uploadCheckinPhoto(uploadData)
            if (res.error || !res.url) {
                toast.error(`Error al subir imagen: ${file.name}`)
                setUploading(false)
                e.target.value = '' // Reset
                return
            }

            setFormData(prev => {
                // Remove existing photo of this type if any, to replace it
                const filtered = prev.photos.filter(p => p.type !== type)
                return {
                    ...prev,
                    photos: [...filtered, { url: res.url!, path: res.path, type }]
                }
            })
        } catch (err) {
            console.error(err)
            toast.error(`Error procesando imagen: ${file.name}`)
        }

        setUploading(false)
        e.target.value = ''
    }

    const removePhoto = (index: number) => {
        setFormData(prev => ({
            ...prev,
            photos: prev.photos.filter((_, i) => i !== index)
        }))
    }

    const updatePhotoType = (index: number, type: PhotoItem['type']) => {
        setFormData(prev => {
            const newPhotos = [...prev.photos]
            newPhotos[index].type = type
            return { ...prev, photos: newPhotos }
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.weight) {
            toast.error('El peso es obligatorio')
            return
        }

        if (!isManualFat) {
            if (!formData.neck || !formData.waist) {
                toast.error('Cuello y Cintura son necesarios para el cálculo de grasa corporal')
                return
            }
            if (!isMale && !formData.hip) {
                toast.error('La cadera es necesaria para el cálculo de grasa corporal en mujeres')
                return
            }
        }

        setLoading(true)
        try {
            const res = await createCheckin({
                weight: Number(formData.weight),
                body_fat: formData.body_fat ? Number(formData.body_fat) : undefined,
                lean_mass: formData.lean_mass ? Number(formData.lean_mass) : undefined,
                neck_measure: formData.neck ? Number(formData.neck) : undefined,
                chest_measure: formData.chest ? Number(formData.chest) : undefined,
                waist_measure: formData.waist ? Number(formData.waist) : undefined,
                hip_measure: formData.hip ? Number(formData.hip) : undefined,
                arm_measure: formData.arm ? Number(formData.arm) : undefined,
                thigh_measure: formData.thigh ? Number(formData.thigh) : undefined,
                calf_measure: formData.calf ? Number(formData.calf) : undefined,
                observations: formData.observations,
                photos: formData.photos
            })

            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Check-in guardado exitosamente')
                router.push('/dashboard')
            }
        } catch (error) {
            toast.error('Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">

            <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Composición corporal</h3>

                {/* Missing Height Alert / Input */}
                {!height && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 space-y-2">
                        <div className="flex items-center gap-2 text-yellow-800">
                            <Info className="h-4 w-4" />
                            <span className="text-sm font-medium">Falta tu altura</span>
                        </div>
                        <p className="text-xs text-yellow-700">Tu perfil no tiene altura registrada, necesaria para el cálculo Navy. Ingresala aquí temporalmente:</p>
                        <div className="max-w-[200px]">
                            <Label>Altura (cm)</Label>
                            <Input
                                type="number"
                                placeholder="Ej: 175"
                                value={localHeight}
                                onChange={e => setLocalHeight(Number(e.target.value))}
                                className="bg-white"
                            />
                        </div>
                    </div>
                )}

                {/* Weight Row */}
                <div className="space-y-2">
                    <Label htmlFor="weight">Peso (kg)</Label>
                    <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        required
                        value={formData.weight}
                        onChange={e => setFormData({ ...formData, weight: e.target.value })}
                    />
                </div>

                {/* Body Fat Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">Grasa Corporal (%)</Label>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="manual-fat"
                                checked={isManualFat}
                                onCheckedChange={(c) => setIsManualFat(!!c)}
                            />
                            <Label htmlFor="manual-fat" className="text-sm font-normal text-gray-600 cursor-pointer">
                                Ya conozco mi porcentaje
                            </Label>
                        </div>
                    </div>

                    {!isManualFat ? (
                        <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">
                                Calculado automáticamente por método Navy. Ingresa tus medidas.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Cuello (cm)</Label>
                                    <Input
                                        type="number" step="0.1" placeholder="0.0"
                                        value={formData.neck}
                                        onChange={e => setFormData({ ...formData, neck: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Cintura (cm)</Label>
                                    <Input
                                        type="number" step="0.1" placeholder="0.0"
                                        value={formData.waist}
                                        onChange={e => setFormData({ ...formData, waist: e.target.value })}
                                    />
                                </div>
                                {!isMale && (
                                    <div className="space-y-2 col-span-2">
                                        <Label>Cadera (cm)</Label>
                                        <Input
                                            type="number" step="0.1" placeholder="0.0"
                                            value={formData.hip}
                                            onChange={e => setFormData({ ...formData, hip: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 flex items-start gap-2">
                            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            Usar solo si fue medida por antropometría o bioimpedancia.
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="fat" className={!isManualFat ? "text-muted-foreground" : ""}>
                                % Grasa Corporal
                            </Label>
                            <Input
                                id="fat"
                                type="number"
                                step="0.1"
                                placeholder="0.0"
                                value={formData.body_fat}
                                onChange={e => setFormData({ ...formData, body_fat: e.target.value })}
                                readOnly={!isManualFat}
                                className={!isManualFat ? "bg-gray-100" : ""}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lean" className="text-muted-foreground">Masa magra (%)</Label>
                            <Input
                                id="lean"
                                type="number"
                                step="0.1"
                                placeholder="0.0"
                                value={formData.lean_mass}
                                readOnly
                                className="bg-gray-100"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Calculado automáticamente (100% - % Grasa)
                            </p>
                        </div>
                    </div>
                </div>
                <h3 className="font-semibold text-lg border-b pb-2 pt-4">Otras Medidas (cm)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Pecho</Label>
                        <Input type="number" step="0.1" placeholder="0.0" value={formData.chest} onChange={e => setFormData({ ...formData, chest: e.target.value })} />
                    </div>

                    <div className="space-y-2">
                        <Label>Brazo</Label>
                        <Input type="number" step="0.1" placeholder="0.0" value={formData.arm} onChange={e => setFormData({ ...formData, arm: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Muslo</Label>
                        <Input type="number" step="0.1" placeholder="0.0" value={formData.thigh} onChange={e => setFormData({ ...formData, thigh: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Gemelos</Label>
                        <Input type="number" step="0.1" placeholder="0.0" value={formData.calf} onChange={e => setFormData({ ...formData, calf: e.target.value })} />
                    </div>
                </div>
            </div >

            <div className="space-y-4">
                <div className="space-y-1 border-b pb-2">
                    <h3 className="font-semibold text-lg">Fotos de progreso</h3>
                    <p className="text-xs text-muted-foreground">JPG/PNG/WebP (se comprimen automáticamente)</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {[
                        { type: 'front', label: 'Frente' },
                        { type: 'profile', label: 'Perfil' },
                        { type: 'back', label: 'Espalda' },
                        { type: 'other', label: 'Extra' }
                    ].map((slot) => {
                        const photo = formData.photos.find(p => p.type === slot.type)
                        const photoIndex = formData.photos.findIndex(p => p.type === slot.type)
                        const inputId = `upload-${slot.type}`

                        return (
                            <div key={slot.type} className="space-y-2">
                                <span className="text-sm font-medium block text-gray-700">{slot.label}</span>

                                {photo ? (
                                    <div className="relative group rounded-xl overflow-hidden border bg-gray-100 aspect-[3/4] shadow-sm">
                                        <img src={photo.url} alt={slot.label} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(photoIndex)}
                                            className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80 backdrop-blur-sm transition-all shadow-sm"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <input
                                            type="file"
                                            id={inputId}
                                            accept="image/jpeg,image/png,image/heic,image/webp"
                                            className="hidden"
                                            onChange={(e) => handleSlotUpload(e, slot.type as any)}
                                            disabled={uploading}
                                        />
                                        <Label
                                            htmlFor={inputId}
                                            className={`
                                                border-2 border-dashed rounded-xl bg-gray-50 flex flex-col items-center justify-center 
                                                aspect-[3/4] gap-3 transition-all cursor-pointer hover:border-indigo-400 hover:bg-white
                                                ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}
                                            `}
                                        >
                                            <div className="h-12 w-12 rounded-full bg-white border shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                                {uploading ? (
                                                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                                                ) : (
                                                    <UploadCloud className="h-6 w-6 text-indigo-600" />
                                                )}
                                            </div>
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subir</span>
                                        </Label>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea
                    placeholder="¿Cómo te sentiste esta semana? ¿Algo que reportar?"
                    value={formData.observations}
                    onChange={e => setFormData({ ...formData, observations: e.target.value })}
                />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading || uploading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Check-in
            </Button>
        </form >
    )
}
