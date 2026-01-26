"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Repeat, Loader2 } from "lucide-react"
import { format, parse } from "date-fns"
import { es } from "date-fns/locale"

import { updateNextCheckinDateAction } from "@/app/(dashboard)/clients/[id]/checkin-actions"
import { updateClientAction } from "@/app/(dashboard)/clients/actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useSearchParams, useRouter } from 'next/navigation'
import { addDays } from "date-fns"

interface ScheduleNextCheckinDialogProps {
    clientId: string
    currentDate?: string | null
    checkinFrequency?: number | null
    onUpdate?: () => void
}

export function ScheduleNextCheckinDialog({ clientId, currentDate, checkinFrequency, onUpdate }: ScheduleNextCheckinDialogProps) {
    const [open, setOpen] = useState(false)
    const [date, setDate] = useState<Date | undefined>(
        currentDate ? parse(currentDate, "yyyy-MM-dd", new Date()) : undefined
    )
    const [frequency, setFrequency] = useState<string>(checkinFrequency ? String(checkinFrequency) : "")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (checkinFrequency) {
            setFrequency(String(checkinFrequency))
        }
    }, [checkinFrequency])

    useEffect(() => {
        if (currentDate) {
            setDate(parse(currentDate, "yyyy-MM-dd", new Date()))
        } else {
            setDate(undefined)
        }
    }, [currentDate])

    const router = useRouter()

    const handleSave = async () => {
        setLoading(true)
        try {
            // 1. Update Date if changed
            if (date) {
                await updateNextCheckinDateAction(clientId, format(date, "yyyy-MM-dd"))
            }

            // 2. Update Frequency if changed
            if (frequency) {
                await updateClientAction(clientId, { checkin_frequency_days: parseInt(frequency) })
            }

            setOpen(false)
            if (onUpdate) {
                onUpdate()
            } else {
                router.refresh()
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleFrequencyChange = (val: string) => {
        setFrequency(val)
        // Auto-update date based on frequency if date allows
        // Logic: If user selects "Weekly", maybe suggest today + 7 days? 
        // For now, let's keep it manual or simple.
        if (val) {
            const days = parseInt(val)
            const newDate = addDays(new Date(), days)
            setDate(newDate)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Repeat className="h-4 w-4" />
                    {currentDate && date ? format(date, "d MMM, yyyy", { locale: es }) : "Definir Check-in"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Frecuencia de Check-in</DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* 1. Frequency Selector (Primary) */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Frecuencia</Label>
                        <Select value={frequency} onValueChange={handleFrequencyChange}>
                            <SelectTrigger className="w-full text-base py-6">
                                <SelectValue placeholder="Seleccionar frecuencia" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">Semanal (7 días)</SelectItem>
                                <SelectItem value="14">Quincenal (14 días)</SelectItem>
                                <SelectItem value="30">Mensual (30 días)</SelectItem>
                                <SelectItem value="42">Cada 6 semanas (42 días)</SelectItem>
                                <SelectItem value="60">Cada 2 meses (60 días)</SelectItem>
                                <SelectItem value="90">Cada 3 meses (90 días)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground leading-snug">
                            El asesorado podrá hacer el check-in solo cuando se cumpla este intervalo.
                        </p>
                    </div>

                    {/* 2. Read-only Date (Secondary) */}
                    {date && (
                        <div className="rounded-lg bg-secondary/50 p-4 border border-border/50">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
                                    Próximo check-in habilitado
                                </span>
                                <span className="text-lg font-medium text-foreground capitalize">
                                    {format(date, "EEEE d 'de' MMMM", { locale: es })}
                                </span>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground/80">
                                La fecha se calcula automáticamente según la frecuencia elegida.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={() => setOpen(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={loading || !frequency}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar frecuencia
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
