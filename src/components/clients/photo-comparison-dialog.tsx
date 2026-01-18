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
                // Replace the last selected one to allow easy switching (FIFOish behavior for the 2nd slot)
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
            <DialogContent className="sm:max-w-[90vw] w-full h-[90vh] flex flex-col p-0 gap-0 bg-white text-foreground overflow-hidden">
                <DialogTitle className="sr-only">Comparación de Fotos</DialogTitle>

                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="text-xl font-bold">Seleccionar fotos</h2>
                        <p className="text-sm text-muted-foreground">Selecciona 2 fotos para comparar</p>
                    </div>
                    {/* Close button is handled by DialogPrimitive usually, but we can add a custom one if needed or rely on the default X */}
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Selection */}
                    <div className="w-[280px] border-r overflow-y-auto p-4 bg-gray-50/50 flex-shrink-0">
                        <div className="space-y-3">
                            {photos.map(photo => {
                                const isSelected = selectedIds.includes(photo.id)
                                return (
                                    <div
                                        key={photo.id}
                                        className={cn(
                                            "cursor-pointer group relative rounded-xl overflow-hidden transition-all border-2",
                                            isSelected ? "ring-2 ring-[#7B5CFA]/20" : "border-transparent hover:border-gray-200"
                                        )}
                                        style={{ borderColor: isSelected ? '#7B5CFA' : undefined }}
                                        onClick={() => handleToggle(photo.id)}
                                    >
                                        <div className="aspect-[4/5] relative bg-muted">
                                            <Image
                                                src={photo.url}
                                                alt="Progress"
                                                fill
                                                className="object-cover"
                                            />
                                            {isSelected && (
                                                <div className="absolute inset-0 bg-[#7B5CFA]/10 transition-colors">
                                                    <div className="absolute bottom-2 right-2 rounded-full p-1 shadow-sm" style={{ backgroundColor: '#7B5CFA', color: 'white' }}>
                                                        <Check className="h-3 w-3" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-2 bg-white text-center border-t">
                                            <p className="text-xs font-semibold text-gray-700">
                                                {format(new Date(photo.date), "d 'de' MMMM, yyyy", { locale: es })}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Comparison View */}
                    <div className="flex-1 overflow-hidden bg-gray-50/30 p-4 md:p-8">
                        <div className="h-full flex flex-col items-center justify-center">
                            {selectedPhotos.length < 2 ? (
                                <div className="text-center space-y-2">
                                    <p className="text-muted-foreground">Selecciona {2 - selectedPhotos.length} foto{2 - selectedPhotos.length !== 1 ? 's' : ''} más para comparar</p>
                                </div>
                            ) : (
                                <div className="flex flex-row gap-4 md:gap-8 w-full h-full justify-center items-center">
                                    {selectedPhotos.map((photo) => (
                                        <div key={photo.id} className="flex flex-col items-center gap-3 w-full h-full max-w-[500px]">
                                            <h3 className="text-base md:text-lg font-bold text-gray-900 shrink-0">
                                                {format(new Date(photo.date), "d 'de' MMMM, yyyy", { locale: es })}
                                            </h3>

                                            <div className="relative w-full flex-1 rounded-2xl overflow-hidden shadow-xl bg-black">
                                                <Image
                                                    src={photo.url}
                                                    alt="Comparison"
                                                    fill
                                                    className="object-contain"
                                                />

                                                {/* Stats Floating Pill */}
                                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] bg-white/95 backdrop-blur-sm shadow-lg rounded-xl py-2.5 px-4 border border-gray-100/50">
                                                    <div className="flex items-center justify-around text-xs md:text-sm">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-muted-foreground font-medium">Peso:</span>
                                                            <span className="font-bold text-gray-900">{photo.weight ? `${photo.weight}kg` : '-'}</span>
                                                        </div>
                                                        <div className="w-px h-4 bg-gray-200" />
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-muted-foreground font-medium whitespace-nowrap">Grasa corporal:</span>
                                                            <span className="font-bold text-gray-900">{photo.bodyFat ? `${photo.bodyFat}%` : '-'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

