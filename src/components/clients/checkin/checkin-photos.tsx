"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Image01Icon, ViewIcon } from "hugeicons-react"
import Image from "next/image"
import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

interface Photo {
    url: string
    type: 'front' | 'side' | 'back' | 'extra' | string
    path?: string
}

interface CheckinPhotosProps {
    photos: Photo[]
}

const TYPE_LABELS: Record<string, string> = {
    front: "Frente",
    side: "Perfil",
    profile: "Perfil",
    back: "Espalda",
    extra: "Extra"
}

export function CheckinPhotos({ photos: initialPhotos }: CheckinPhotosProps) {
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

    // Filter out photos with empty URLs to avoid Next.js Image errors
    const photos = (initialPhotos || []).filter(p => p.url && p.url.trim() !== "")

    if (photos.length === 0) {
        return (
            <Card className="rounded-2xl border-border/40 shadow-sm overflow-hidden bg-white h-full">
                <CardHeader className="pb-3 px-6 pt-6 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Image01Icon className="h-4 w-4 text-primary" />
                        Fotos del check-in
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-8 flex flex-col items-center justify-center text-center">
                    <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                        <Image01Icon className="h-8 w-8 text-gray-200" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">Sin fotos adjuntas</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Este registro no incluye imágenes.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="rounded-2xl border-border/40 shadow-sm overflow-hidden bg-white h-full">
            <CardHeader className="pb-3 px-6 pt-6">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Image01Icon className="h-4 w-4 text-primary" />
                    Fotos del check-in
                    <Badge variant="secondary" className="ml-2 font-bold px-2 py-0 h-5 bg-gray-100 text-gray-600 border-0">
                        {photos.length}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
                <div className="grid grid-cols-2 gap-3">
                    {photos.slice(0, 4).map((photo, idx) => (
                        <div
                            key={idx}
                            className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 cursor-pointer border border-border/40 shadow-sm"
                            onClick={() => setSelectedPhoto(photo.url)}
                        >
                            <Image
                                src={photo.url}
                                alt={photo.type}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ViewIcon className="h-6 w-6 text-white" />
                            </div>
                            <div className="absolute bottom-2 left-2">
                                <Badge className="bg-white/90 backdrop-blur-md text-gray-900 border-0 text-[10px] font-bold px-1.5 h-5">
                                    {TYPE_LABELS[photo.type] || photo.type}
                                </Badge>
                            </div>
                        </div>
                    ))}
                    {photos.length > 4 && (
                        <div className="col-span-2 text-center mt-2">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                + {photos.length - 4} fotos adicionales
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>

            <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
                <DialogContent className="max-w-3xl border-none bg-black p-0 overflow-hidden sm:rounded-2xl ring-offset-0">
                    <DialogTitle className="sr-only">Vista previa de foto</DialogTitle>
                    {selectedPhoto && (
                        <div className="relative aspect-[3/4] w-full max-h-[85vh]">
                            <Image
                                src={selectedPhoto}
                                alt="Checkin photo"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    )
}
