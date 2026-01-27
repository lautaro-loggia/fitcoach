"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { Tick01Icon, Exchange01Icon, Calendar03Icon, InformationCircleIcon, AlertCircleIcon } from "hugeicons-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"

interface PhotoItem {
    type: 'front' | 'back' | 'profile' | 'other'
    signedUrl?: string
    url: string
}

interface ComparisonCheckin {
    id: string
    date: string
    weight?: number
    bodyFat?: number
    allPhotos: PhotoItem[]
}

interface PhotoComparisonDialogProps {
    photos: ComparisonCheckin[]
}

export function PhotoComparisonDialog({ photos }: PhotoComparisonDialogProps) {
    const [open, setOpen] = useState(false)
    const [selectedPose, setSelectedPose] = useState<'front' | 'profile' | 'back' | 'other'>('front')
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [mobileViewId, setMobileViewId] = useState<string | null>(null)

    // Filter checkins that have the selected pose
    const availCheckins = useMemo(() => {
        return photos.filter(p => p.allPhotos?.some(photo => {
            const type = photo.type || 'other'
            const target = selectedPose === 'profile' ? 'profile' : selectedPose // handle 'side' alias if needed, currently strict
            return type === target
        }))
    }, [photos, selectedPose])

    // On pose change, validate selection
    useMemo(() => {
        // Remove ids that don't have the new pose
        const validIds = selectedIds.filter(id => availCheckins.find(c => c.id === id))
        if (validIds.length !== selectedIds.length) {
            setSelectedIds(validIds)
        }
    }, [selectedPose, availCheckins, selectedIds])

    const handleToggle = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(sid => sid !== id))
            if (mobileViewId === id) setMobileViewId(null)
        } else {
            if (selectedIds.length < 2) {
                const newIds = [...selectedIds, id]
                setSelectedIds(newIds)
                // Set mobile view to the new one (latest selection)
                setMobileViewId(id)
            } else {
                // Replace oldest (first) with new
                const newIds = [selectedIds[1], id]
                setSelectedIds(newIds)
                setMobileViewId(id)
            }
        }
    }

    // Get specific photo url for a checkin and current pose
    const getPhotoUrl = (checkin: ComparisonCheckin) => {
        const p = checkin.allPhotos.find(p => p.type === selectedPose)
        return p?.signedUrl || p?.url
    }

    const selectedCheckinsData = availCheckins
        .filter(c => selectedIds.includes(c.id))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Sort chronological

    const canCompare = selectedIds.length === 2 && selectedCheckinsData.length === 2

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Exchange01Icon className="h-4 w-4" />
                    Comparar
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[95vw] w-full h-[90vh] flex flex-col p-0 gap-0 bg-white overflow-hidden">
                <DialogTitle className="sr-only">Comparación de Progreso</DialogTitle>

                {/* Header */}
                <div className="flex flex-col md:flex-<Exchange01Iconms-center justify-between px-4 py-3 border-b gap-4 bg-white z-10">
                    <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto no-scrollbar">
                        <h2 className="text-lg font-bold hidden md:block">Comparar</h2>
                        <Tabs value={selectedPose} onValueChange={(v: any) => setSelectedPose(v)} className="w-full md:w-auto">
                            <TabsList className="grid grid-cols-4 w-full md:w-[400px]">
                                <TabsTrigger value="front">Frente</TabsTrigger>
                                <TabsTrigger value="profile">Perfil</TabsTrigger>
                                <TabsTrigger value="back">Espalda</TabsTrigger>
                                <TabsTrigger value="other">Extra</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                    {/* Mobile toggle for comparison if 2 selected */}
                    {canCompare && (
                        <div className="flex md:hidden bg-muted rounded-lg p-1">
                            {selectedCheckinsData.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setMobileViewId(c.id)}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                        mobileViewId === c.id ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
                                    )}
                                >
                                    {format(new Date(c.date), 'dd MMM', { locale: es })}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-1 overflow-hidden relative">
                    {/* Timeline / List Sidebar */}
                    <div className="w-[100px] md:w-[280px] border-r overflow-y-auto bg-gray-50 flex-shrink-0 z-0">
                        {availCheckins.length === 0 ? (
                            <div className="p-8 text-center flex flex-col items-center text-muted-foreground gap-2">
                                <Image
                                    src="/placeholder-empty.svg"
                                    width={100}
                                    height={100}
                                    alt="Empty"
                                    className="opacity-20 mb-2 hidden" // Optional placeholder
                                />
                                <AlertCircleIcon className="h-8 w-8 opacity-20" />
                                <p className="text-sm">No hay fotos de <br /><span className="font-semibold capitalize">{selectedPose}</span></p>
                            </div>
                        ) : (
                            <div className="p-2 md:p-4 space-y-2 md:space-y-3">
                                <p className="text-xs text-muted-foreground font-medium px-1 uppercase tracking-wider mb-2 hidden md:block">
                                    Historial ({availCheckins.length})
                                </p>
                                {availCheckins.map(c => {
                                    const isSelected = selectedIds.includes(c.id)
                                    const url = getPhotoUrl(c)

                                    return (
                                        <div
                                            key={c.id}
                                            onClick={() => handleToggle(c.id)}
                                            className={cn(
                                                "group relative cursor-pointer md:rounded-xl rounded-lg overflow-hidden border-2 transition-all hover:border-indigo-200",
                                                isSelected ? "border-indigo-600 ring-2 ring-indigo-100" : "border-transparent bg-white shadow-sm"
                                            )}
                                        >
                                            <div className="flex flex-col md:flex-row gap-0 md:gap-3">
                                                {/* Thumbnail */}
                                                <div className="relative aspect-square w-full md:w-20 bg-muted flex-shrink-0">
                                                    {url ? (
                                                        <Image src={url} alt="Thumb" fill className="object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                                            <span className="text-[10px] text-gray-400">Sin foto</span>
                                                        </div>
                                                    )}
                                                    {isSelected && (
                                                        <div className="absolute inset-0 bg-indigo-600/20 md:bg-transparent flex items-center justify-center">
                                                            <div className="bg-indigo-600 text-white rounded-full p-1 shadow-sm md:absolute md:top-1 md:left-1">
                                                                <Tick01Icon className="h-3 w-3" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Info (Hidden on super small mobile sidebar to save space? Keep simple) */}
                                                <div className="p-2 md:py-2 md:pr-2 flex flex-col justify-center min-w-0">
                                                    <span className="text-[10px] md:text-xs font-semibold text-gray-900 truncate">
                                                        {format(new Date(c.date), 'dd MMM yyyy', { locale: es })}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground hidden md:inline-block">
                                                        {c.weight ? `${c.weight}kg` : '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Comparison Area */}
                    <div className="flex-1 bg-gray-100/50 p-4 md:p-6 overflow-hidden flex flex-col relative">
                        {!canCompare ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                                    <Exchange01Icon className="h-10 w-10 text-indigo-200" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-700">Modo Comparación</h3>
                                <p className="max-w-xs mt-2 text-sm">
                                    Selecciona <span className="font-bold text-indigo-600">2 fechas</span> del listado para comparar tu progreso en pose <span className="font-bold capitalize">{selectedPose}</span>.
                                </p>
                            </div>
                        ) : (
                            // Comparison View
                            <div className="w-full h-full">
                                {/* Desktop View: Side by Side */}
                                <div className="hidden md:flex w-full h-full gap-4 items-center justify-center">
                                    {selectedCheckinsData.map((c, idx) => (
                                        <div key={c.id} className="flex flex-col h-full max-h-[800px] flex-1 max-w-[500px] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative group">
                                            {/* Header Overlay */}
                                            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent p-4 z-10">
                                                <div className="flex justify-between items-start text-white">
                                                    <div>
                                                        <Badge variant="outline" className="bg-white/20 hover:bg-white/20 text-white border-0 backdrop-blur-md mb-1">
                                                            {idx === 0 ? 'ANTES' : 'DESPUÉS'}
                                                        </Badge>
                                                        <h4 className="font-bold text-lg leading-tight shadow-black drop-shadow-md">
                                                            {format(new Date(c.date), 'dd MMM, yyyy', { locale: es })}
                                                        </h4>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Image */}
                                            <div className="relative flex-1 bg-black">
                                                {getPhotoUrl(c) ? (
                                                    <Image
                                                        src={getPhotoUrl(c)!}
                                                        alt="Comparison"
                                                        fill
                                                        className="object-contain"
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-white/50">Imagen no disponible</div>
                                                )}
                                            </div>

                                            {/* Footer Info */}
                                            <div className="bg-white p-3 border-t grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Peso</span>
                                                    <p className="text-lg font-bold text-gray-900">{c.weight} <span className="text-xs font-normal text-gray-500">kg</span></p>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Grasa</span>
                                                    <p className="text-lg font-bold text-gray-900">{c.bodyFat || '-'} <span className="text-xs font-normal text-gray-500">%</span></p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Mobile View: Toggle */}
                                <div className="flex md:hidden w-full h-full flex-col">
                                    {(() => {
                                        // Find active checkin for mobile view
                                        const activeCheckin = selectedCheckinsData.find(c => c.id === mobileViewId) || selectedCheckinsData[0]
                                        const isAfter = activeCheckin.id === selectedCheckinsData[selectedCheckinsData.length - 1].id

                                        return (
                                            <div className="flex-1 flex flex-col bg-white rounded-xl shadow border overflow-hidden relative">
                                                <div className="relative flex-1 bg-black w-full">
                                                    {getPhotoUrl(activeCheckin) && (
                                                        <Image
                                                            src={getPhotoUrl(activeCheckin)!}
                                                            alt="Mobile Comp"
                                                            fill
                                                            className="object-contain"
                                                        />
                                                    )}
                                                    {/* Badge Overlay */}
                                                    <div className="absolute top-4 left-4">
                                                        <Badge className={cn("text-xs shadow-md", isAfter ? "bg-indigo-600" : "bg-gray-600")}>
                                                            {isAfter ? 'DESPUÉS' : 'ANTES'}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {/* Stats Bar */}
                                                <div className="p-3 bg-white/95 backdrop-blur border-t grid grid-cols-3 gap-2 text-center">
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground uppercase">Fecha</p>
                                                        <p className="text-xs font-bold truncate">{format(new Date(activeCheckin.date), 'dd MMM', { locale: es })}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground uppercase">Peso</p>
                                                        <p className="text-xs font-bold">{activeCheckin.weight}kg</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground uppercase">Grasa</p>
                                                        <p className="text-xs font-bold">{activeCheckin.bodyFat || '-'}%</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
