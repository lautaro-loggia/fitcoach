'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { History, ChevronLeft, ChevronRight, CheckCircle2, MessageSquare, X } from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { getDailyMealLogs, reviewMealLog } from '@/app/(dashboard)/clients/[id]/meal-plan-actions'
import Image from 'next/image'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'

interface MealHistoryDialogProps {
    clientId: string
}

export function MealHistoryDialog({ clientId }: MealHistoryDialogProps) {
    const [open, setOpen] = useState(false)
    const [date, setDate] = useState(new Date())
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedLog, setSelectedLog] = useState<any>(null)

    useEffect(() => {
        if (open) {
            fetchLogs()
        }
    }, [open, date])

    const fetchLogs = async () => {
        setLoading(true)
        const dateStr = format(date, 'yyyy-MM-dd')
        const { logs } = await getDailyMealLogs(clientId, dateStr)
        setLogs(logs || [])
        setLoading(false)
    }

    const handleReview = async (logId: string, status: 'pending' | 'reviewed', comment?: string) => {
        const result = await reviewMealLog(logId, status, comment)
        if (result?.success) {
            toast.success('Comida actualizada')
            // Update local state
            setLogs((prev: any[]) => prev.map(l => l.id === logId ? { ...l, status, coach_comment: comment } : l))
            if (selectedLog?.id === logId) {
                setSelectedLog((prev: any) => ({ ...prev, status, coach_comment: comment }))
            }
        } else {
            toast.error('Error al actualizar')
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-4 rounded-xl border-gray-200 bg-white text-gray-900 font-bold text-xs gap-2 shadow-sm"
                >
                    <History className="h-4 w-4" /> Historial de comidas
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden gap-0" showCloseButton={false}>
                <div className="p-4 border-b flex items-center justify-between bg-gray-50/50">
                    <DialogTitle className="font-semibold text-lg">Historial de comidas</DialogTitle>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-white rounded-lg border p-1 border-gray-200 shadow-sm">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDate(subDays(date, 1))}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium w-32 text-center">
                                {format(date, 'eee d MMM', { locale: es })}
                            </span>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDate(addDays(date, 1))}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-200">
                                <X className="h-4 w-4" />
                            </Button>
                        </DialogClose>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* List/Grid of Meals */}
                    <ScrollArea className="w-64 flex-none p-4 border-r">
                        {loading ? (
                            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
                        ) : logs.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                                <History className="h-8 w-8 opacity-20" />
                                <p>No hay comidas registradas este día</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {logs.map((log) => (
                                    <div
                                        key={log.id}
                                        className={`group cursor-pointer rounded-xl overflow-hidden border-2 transition-all relative aspect-square ${selectedLog?.id === log.id ? 'border-zinc-900 ring-2 ring-zinc-900/20' : 'border-transparent hover:border-gray-200'}`}
                                        onClick={() => setSelectedLog(log)}
                                    >
                                        <Image
                                            src={log.signedUrl || '/placeholder.png'}
                                            alt={log.meal_type}
                                            fill
                                            className="object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                            <p className="text-white font-medium capitalize">{log.meal_type}</p>
                                            <p className="text-white/80 text-xs">{format(new Date(log.created_at), 'HH:mm')}</p>
                                        </div>
                                        {log.status === 'reviewed' && (
                                            <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-sm">
                                                <CheckCircle2 className="h-3 w-3" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    {/* Detail View */}
                    <div className="flex-1 bg-white flex flex-col min-w-0">
                        {selectedLog ? (
                            <MealDetail
                                log={selectedLog}
                                onReview={(status, comment) => handleReview(selectedLog.id, status, comment)}
                                onClose={() => setSelectedLog(null)}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-gray-50/50">
                                <MessageSquare className="h-8 w-8 mb-3 opacity-20" />
                                <p className="text-sm">Selecciona una comida para ver detalles</p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent >
        </Dialog >
    )
}

function MealDetail({ log, onReview, onClose }: { log: any, onReview: (s: 'pending' | 'reviewed', c?: string) => void, onClose: () => void }) {
    // Comment state removed as requested
    const [isReviewed, setIsReviewed] = useState(log.status === 'reviewed')

    // Reset state when log changes
    useEffect(() => {
        setIsReviewed(log.status === 'reviewed')
    }, [log.id])

    const handleSave = () => {
        onReview(isReviewed ? 'reviewed' : 'pending', "") // Empty comment
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-white">
            <div className="relative flex-1 w-full bg-black min-h-[400px] shrink-0">
                <Image
                    src={log.signedUrl || '/placeholder.png'}
                    alt={log.meal_type}
                    fill
                    className="object-contain"
                />
            </div>

            <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 capitalize mb-1">{log.meal_type}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            {format(new Date(log.created_at), 'PPP p', { locale: es })}
                        </p>
                    </div>

                    {/* Comments section removed as requested */}
                </div>
            </ScrollArea>

            <div className="p-4 border-t bg-gray-50/30 space-y-3">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsReviewed(!isReviewed)}>
                    <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${isReviewed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white'}`}>
                        {isReviewed && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </div>
                    <span className="text-sm font-medium text-gray-700 select-none">Marcar como revisada</span>
                </div>

                <Button className="w-full" onClick={handleSave}>
                    Guardar cambios
                </Button>
            </div>
        </div>
    )
}
