"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar03Icon, Exchange01Icon } from "hugeicons-react"
import { cn } from "@/lib/utils"

interface CheckinSelectorProps {
    checkins: any[]
    selectedId: string | null
    comparisonId: string | null
    isCompareMode: boolean
    feedbackStatus: {
        hasNote: boolean
        isSeen: boolean
    }
    onSelect: (id: string) => void
    onComparisonSelect: (id: string) => void
    onCompareModeChange: (enabled: boolean) => void
}

export function CheckinSelector({
    checkins,
    selectedId,
    comparisonId,
    isCompareMode,
    feedbackStatus,
    onSelect,
    onComparisonSelect,
    onCompareModeChange
}: CheckinSelectorProps) {
    const sortedCheckins = [...checkins].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const getRelativeTime = (date: string) => {
        try {
            return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
        } catch (e) {
            return ""
        }
    }

    const scrollToNotes = () => {
        const element = document.getElementById('coach-notes')
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }

    return (
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-white p-4 lg:px-6 rounded-2xl border border-border/40 shadow-sm w-full min-h-[80px]">
            {/* IZQUIERDA: Contexto Principal */}
            <div className="flex items-center gap-4 flex-1">
                <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 shrink-0 border border-gray-100">
                    <Calendar03Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-0.5 block">
                        Check-in seleccionado
                    </Label>
                    <Select value={selectedId || ""} onValueChange={onSelect}>
                        <SelectTrigger className="h-7 border-none bg-transparent p-0 focus:ring-0 text-base font-bold shadow-none w-auto gap-2">
                            <SelectValue placeholder="Seleccionar fecha" />
                        </SelectTrigger>
                        <SelectContent>
                            {sortedCheckins.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold">{format(new Date(c.date), "dd MMMM yyyy", { locale: es })}</span>
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase">
                                            ({getRelativeTime(c.date)})
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedId && (
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                            {getRelativeTime(sortedCheckins.find(c => c.id === selectedId)?.date || "")}
                        </p>
                    )}
                </div>
            </div>

            <div className="hidden lg:block h-10 w-px bg-border/40 mx-2" />

            {/* CENTRO: Acción de Análisis */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-8 flex-1">
                <div className="flex items-center gap-3">
                    <Switch
                        id="compare-mode"
                        checked={isCompareMode}
                        onCheckedChange={onCompareModeChange}
                        className="data-[state=checked]:bg-primary"
                    />
                    <div className="flex flex-col">
                        <Label htmlFor="compare-mode" className="text-xs font-bold cursor-pointer flex items-center gap-2">
                            <Exchange01Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            Comparar
                        </Label>
                        <span className="text-[10px] text-muted-foreground font-medium">Analizar contra otro registro</span>
                    </div>
                </div>

                {isCompareMode && (
                    <div className="flex-1 min-w-[180px] animate-in slide-in-from-left-2 duration-300">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-0.5 block">
                            Comparar con:
                        </Label>
                        <Select value={comparisonId || ""} onValueChange={onComparisonSelect}>
                            <SelectTrigger className="h-7 border-none bg-transparent p-0 focus:ring-0 text-sm font-bold shadow-none w-auto gap-2">
                                <SelectValue placeholder="Elegir fecha..." />
                            </SelectTrigger>
                            <SelectContent>
                                {sortedCheckins
                                    .filter(c => c.id !== selectedId)
                                    .map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            <span className="font-bold">{format(new Date(c.date), "dd MMMM yyyy", { locale: es })}</span>
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            <div className="hidden lg:block h-10 w-px bg-border/40 mx-2" />

            {/* DERECHA: Estado del feedback */}
            <div className="flex items-center justify-between lg:justify-end gap-4 w-full lg:w-auto">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center border",
                        feedbackStatus.hasNote ? "bg-primary/5 border-primary/10 text-primary" : "bg-gray-50 border-gray-100 text-gray-300"
                    )}>
                        <Calendar03Icon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold leading-none mb-1">
                            {feedbackStatus.hasNote ? "Con feedback del coach" : "Sin feedback aún"}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter">
                            {feedbackStatus.hasNote && (
                                <>
                                    {feedbackStatus.isSeen ? (
                                        <span className="text-green-600 flex items-center gap-1">
                                            <div className="h-1 w-1 rounded-full bg-green-600" />
                                            Visto por cliente
                                        </span>
                                    ) : (
                                        <span className="text-amber-600 flex items-center gap-1">
                                            <div className="h-1 w-1 rounded-full bg-amber-600" />
                                            Pendiente de ver
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {feedbackStatus.hasNote && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={scrollToNotes}
                        className="h-8 rounded-full text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 px-3"
                    >
                        Ver nota
                    </Button>
                )}
            </div>
        </div>
    )
}
