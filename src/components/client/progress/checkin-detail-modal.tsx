'use client'

import { useState, useEffect } from 'react'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MessageSquare, Calendar, Scale, Ruler, CheckCircle2 } from 'lucide-react'
import { markNoteAsSeenAction } from '@/app/(client)/dashboard/checkin/actions'
import { Badge } from '@/components/ui/badge'

interface CheckinDetailModalProps {
    checkin: any
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CheckinDetailModal({ checkin, open, onOpenChange }: CheckinDetailModalProps) {
    useEffect(() => {
        if (open && checkin?.coach_note && !checkin.coach_note_seen_at) {
            markNoteAsSeenAction(checkin.id)
        }
    }, [open, checkin])

    if (!checkin) return null

    const hasNote = !!checkin.coach_note
    const measurements = checkin.measurements || {}

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="rounded-t-[32px] px-6 pb-10 sm:max-w-none border-none shadow-2xl">
                <SheetHeader className="text-left mb-6">
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm font-medium">Check-in del {format(new Date(checkin.date), 'd MMMM, yyyy', { locale: es })}</span>
                    </div>
                    <SheetTitle className="text-2xl font-bold">Detalle del registro</SheetTitle>
                </SheetHeader>

                <div className="space-y-6">
                    {/* Weight Card */}
                    <div className="bg-muted/30 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                <Scale className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Peso registrado</p>
                                <p className="text-xl font-bold text-foreground">{checkin.weight} kg</p>
                            </div>
                        </div>
                        {checkin.body_fat && (
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Grasa</p>
                                <p className="text-lg font-bold text-foreground">{checkin.body_fat}%</p>
                            </div>
                        )}
                    </div>

                    {/* Feedback Section */}
                    <div>
                        <h4 className="text-sm font-bold flex items-center gap-2 mb-3 px-1 text-foreground/80">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            Feedback de tu coach
                        </h4>
                        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3">
                                <MessageSquare className="h-12 w-12 text-primary/5 -rotate-12" />
                            </div>
                            {hasNote ? (
                                <div className="space-y-3 relative z-10">
                                    <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                                        {checkin.coach_note}
                                    </p>
                                    <div className="pt-2 flex items-center justify-between">
                                        <span className="text-[10px] text-muted-foreground italic">
                                            Actualizado {checkin.coach_note_updated_at && format(new Date(checkin.coach_note_updated_at), 'd/MM')}
                                        </span>
                                        <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none text-[10px] h-5 py-0">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Revisado
                                        </Badge>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic relative z-10 py-2">
                                    Todavía no hay feedback para este check-in. ¡Sigue así!
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Measurements (Optional) */}
                    {Object.values(measurements).some(v => v !== null) && (
                        <div>
                            <h4 className="text-sm font-bold flex items-center gap-2 mb-3 px-1 text-foreground/80">
                                <Ruler className="h-4 w-4 text-primary" />
                                Medidas (cm)
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(measurements).map(([key, val]) => {
                                    if (val === null) return null
                                    const labels: any = {
                                        neck: 'Cuello', chest: 'Pecho', waist: 'Cintura',
                                        hip: 'Cadera', arm: 'Brazo', thigh: 'Muslo', calf: 'Gemelo'
                                    }
                                    return (
                                        <div key={key} className="bg-muted/20 border border-border/40 rounded-xl p-3 flex justify-between items-center">
                                            <span className="text-xs text-muted-foreground font-medium">{labels[key] || key}</span>
                                            <span className="text-sm font-bold">{val as number}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
