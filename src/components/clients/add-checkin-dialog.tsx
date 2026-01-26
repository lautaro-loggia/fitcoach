"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Ruler, Scale, Camera, X } from "lucide-react"
import { createCheckinAction } from "@/app/(dashboard)/clients/[id]/checkin-actions"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"

interface AddCheckinDialogProps {
    clientId: string
    autoOpen?: boolean
    trigger?: React.ReactNode
}

export function AddCheckinDialog({ clientId, autoOpen, trigger }: AddCheckinDialogProps) {
    const [open, setOpen] = useState(autoOpen || false)

    useEffect(() => {
        if (autoOpen) {
            // Small delay to ensure component is fully mounted and ready
            const t = setTimeout(() => setOpen(true), 100)
            return () => clearTimeout(t)
        }
    }, [autoOpen])

    const [loading, setLoading] = useState(false)
    const [date, setDate] = useState(() => {
        // Use local date to avoid UTC shifts
        const d = new Date()
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    })
    const [nextCheckinDate, setNextCheckinDate] = useState(() => {
        const next = new Date()
        next.setMonth(next.getMonth() + 1)
        // Same here for next date default
        const year = next.getFullYear()
        const month = String(next.getMonth() + 1).padStart(2, '0')
        const day = String(next.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    })
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Basic
    const [weight, setWeight] = useState("")
    const [bodyFat, setBodyFat] = useState("")
    const [leanMass, setLeanMass] = useState("")
    const [observations, setObservations] = useState("")
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)

    // Measurements
    const [chest, setChest] = useState("")
    const [waist, setWaist] = useState("")
    const [hips, setHips] = useState("")
    const [arm, setArm] = useState("")
    const [thigh, setThigh] = useState("")
    const [calves, setCalves] = useState("")

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setPhotoFile(file)

            const reader = new FileReader()
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleRemovePhoto = () => {
        setPhotoFile(null)
        setPhotoPreview(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const handleSave = async () => {
        setLoading(true)

        // Parse numeric values safely
        const parseNum = (val: string) => val ? parseFloat(val) : undefined

        let uploadedPhotoUrls: string[] = []

        if (photoFile) {
            try {
                const supabase = createClient()
                const fileExt = photoFile.name.split('.').pop()
                const fileName = `${clientId}/${Date.now()}.${fileExt}`

                const { error: uploadError, data } = await supabase.storage
                    .from('progress-photos')
                    .upload(fileName, photoFile)

                if (uploadError) {
                    console.error('Upload error:', uploadError)
                    alert('Error al subir la imagen')
                    setLoading(false)
                    return
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('progress-photos')
                    .getPublicUrl(fileName)

                uploadedPhotoUrls.push(publicUrl)

            } catch (error) {
                console.error('Error handling photo:', error)
                alert('Error al procesar la imagen')
                setLoading(false)
                return
            }
        }

        const result = await createCheckinAction({
            clientId,
            date: date,
            weight: parseFloat(weight) || 0,
            bodyFat: parseNum(bodyFat),
            leanMass: parseNum(leanMass),
            observations,
            measurements: {
                chest: parseNum(chest),
                waist: parseNum(waist),
                hips: parseNum(hips),
                arm: parseNum(arm),
                thigh: parseNum(thigh),
                calves: parseNum(calves)
            },
            photos: uploadedPhotoUrls,
            nextCheckinDate: nextCheckinDate
        })

        if (result.error) {
            alert(result.error)
        } else {
            setOpen(false)
            setWeight("")
            setBodyFat("")
            setLeanMass("")
            setObservations("")
            setChest("")
            setWaist("")
            setHips("")
            setArm("")
            setThigh("")
            setCalves("")
            handleRemovePhoto()
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button className="bg-primary hover:bg-primary/90 text-white">
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Check-in
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Registrar Check-in</DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date">Fecha de hoy</Label>
                            <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="next_checkin">Próximo Check-in</Label>
                            <Input id="next_checkin" type="date" className="border-border focus-visible:ring-primary" value={nextCheckinDate} onChange={e => setNextCheckinDate(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2">
                            <h4 className="font-semibold text-lg">Composición corporal</h4>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Peso (kg)</Label>
                                <Input type="number" placeholder="0.0" value={weight} onChange={e => setWeight(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Grasa corporal (%)</Label>
                                <Input type="number" placeholder="0.0" value={bodyFat} onChange={e => setBodyFat(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Masa magra (%)</Label>
                                <Input type="number" placeholder="0.0" value={leanMass} onChange={e => setLeanMass(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2">
                            <h4 className="font-semibold text-lg">Medidas (cm)</h4>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Pecho</Label>
                                <Input type="number" placeholder="0.0" value={chest} onChange={e => setChest(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Cintura</Label>
                                <Input type="number" placeholder="0.0" value={waist} onChange={e => setWaist(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Cadera</Label>
                                <Input type="number" placeholder="0.0" value={hips} onChange={e => setHips(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Brazo</Label>
                                <Input type="number" placeholder="0.0" value={arm} onChange={e => setArm(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Muslo</Label>
                                <Input type="number" placeholder="0.0" value={thigh} onChange={e => setThigh(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Gemelos</Label>
                                <Input type="number" placeholder="0.0" value={calves} onChange={e => setCalves(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Photo Upload Section Moved Here */}
                    <div className="space-y-2">
                        <div
                            className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {photoPreview ? (
                                <div className="relative w-full h-[200px] rounded-md overflow-hidden">
                                    <Image
                                        src={photoPreview}
                                        alt="Previsualización"
                                        fill
                                        className="object-contain"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-6 w-6 rounded-full"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleRemovePhoto()
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                        Subir foto del estado actual <Camera className="h-4 w-4" />
                                    </div>
                                </>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileSelect}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Observaciones</Label>
                        <Textarea
                            placeholder=""
                            value={observations}
                            onChange={e => setObservations(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setOpen(false)}>Cerrar</Button>
                        <Button
                            className="bg-primary hover:bg-primary/90"
                            onClick={handleSave}
                            disabled={loading}
                        >
                            {loading ? 'Guardando...' : 'Guardar Check-in'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog >
    )
}
