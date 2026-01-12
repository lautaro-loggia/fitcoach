"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { Check } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ComparisonPhoto {
    id: string
    url: string
    date: string
    weight?: number
    bodyFat?: number
}

interface PhotoComparisonDialogProps {
    photos: ComparisonPhoto[]
}

export function PhotoComparisonDialog({ photos }: PhotoComparisonDialogProps) {
    // Select first two by default if available
    const [selectedIds, setSelectedIds] = useState<string[]>(
        photos.slice(0, 2).map(p => p.id)
    )

    const handleToggle = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id))
        } else {
            if (selectedIds.length < 2) {
                setSelectedIds([...selectedIds, id])
            } else {
                // Replace the second one (FIFOish or just block? UI implies toggles)
                // Let's replace the last selected one to allow easy switching
                setSelectedIds([selectedIds[0], id])
            }
        }
    }

    const selectedPhotos = photos.filter(p => selectedIds.includes(p.id))

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    Comparar
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[98vw] w-full h-[95vh] flex flex-col p-0 gap-0 bg-background text-foreground">
                <DialogTitle className="sr-only">Comparación de Fotos</DialogTitle>
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Selection */}
                    <div className="w-[300px] border-r overflow-y-auto p-4 space-y-4 bg-muted/10 hidden md:block">
                        <h3 className="font-semibold text-lg">Seleccionar fotos</h3>
                        <p className="text-xs text-muted-foreground mb-4">Selecciona 2 fotos para comparar</p>

                        <div className="space-y-4">
                            {photos.map(photo => {
                                const isSelected = selectedIds.includes(photo.id)
                                return (
                                    <div
                                        key={photo.id}
                                        className={cn(
                                            "cursor-pointer group relative rounded-lg border-2 overflow-hidden transition-all",
                                            isSelected ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-border"
                                        )}
                                        onClick={() => handleToggle(photo.id)}
                                    >
                                        <div className="aspect-square relative bg-muted">
                                            <Image
                                                src={photo.url}
                                                alt="Progress"
                                                fill
                                                className="object-cover"
                                            />
                                            {isSelected && (
                                                <div className="absolute  inset-0 bg-primary/20 flex items-center justify-center">
                                                    <div className="bg-primary text-primary-foreground rounded-full p-1">
                                                        <Check className="h-4 w-4" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-2 bg-card">
                                            <p className="text-sm font-medium">{format(new Date(photo.date), "MMM d", { locale: es })}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Comparison View */}
                    <div className="flex-1 overflow-y-auto p-4 bg-background">
                        <div className="h-full flex flex-col items-center justify-center">
                            <h2 className="text-2xl font-bold mb-8">Comparación de Progreso</h2>

                            <div className="flex flex-col md:flex-row gap-4 md:gap-8 w-full h-full justify-center items-center p-4">
                                {selectedPhotos.length === 0 && <p className="text-muted-foreground">Selecciona fotos para comenzar</p>}

                                {selectedPhotos.map((photo, index) => (
                                    <div key={photo.id} className="relative flex-1 h-full w-full max-h-[85vh] rounded-xl overflow-hidden shadow-2xl border bg-black group">
                                        <Image
                                            src={photo.url}
                                            alt="Comparison"
                                            fill
                                            className="object-contain" // Contain to show full photo
                                        />
                                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <p className="text-lg font-bold">{format(new Date(photo.date), "MMMM d, yyyy", { locale: es })}</p>
                                            <div className="flex gap-4 mt-2 text-sm opacity-90">
                                                <div>
                                                    <span className="block text-xs uppercase tracking-wider opacity-70">Peso</span>
                                                    <span className="font-semibold">{photo.weight ? `${photo.weight} kg` : '-'}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-xs uppercase tracking-wider opacity-70">Grasa</span>
                                                    <span className="font-semibold">{photo.bodyFat ? `${photo.bodyFat}%` : '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
