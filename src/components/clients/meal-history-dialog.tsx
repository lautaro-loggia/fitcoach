'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { History, ChevronLeft, ChevronRight, CheckCircle2, MessageSquare, X, Loader2 } from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { getDailyMealLogs, reviewMealLog, getPendingMealLogsCount } from '@/app/(dashboard)/clients/[id]/meal-plan-actions'
import Image from 'next/image'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'

interface MealHistoryDialogProps {
    clientId: string
}

export function MealHistoryDialog({ clientId }: MealHistoryDialogProps) {
    const [open, setOpen] = useState(false)
    const [date, setDate] = useState(new Date())
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedLog, setSelectedLog] = useState<any>(null)
    const [pendingCount, setPendingCount] = useState(0)

    useEffect(() => {
        getPendingMealLogsCount(clientId).then(res => setPendingCount(res.count || 0))
    }, [clientId, open])

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

    const handleReview = async (logId: string, status: 'pending' | 'reviewed', comment?: string, showToast = true) => {
        const result = await reviewMealLog(logId, status, comment)
        if (result?.success) {
            if (showToast) toast.success('Comida actualizada')
            // Update local state
            setLogs((prev: any[]) => prev.map(l => l.id === logId ? { ...l, status, coach_comment: comment } : l))
            if (selectedLog?.id === logId) {
                setSelectedLog((prev: any) => ({ ...prev, status, coach_comment: comment }))
            }
            // Update pending status check
            getPendingMealLogsCount(clientId).then(res => setPendingCount(res.count || 0))
        } else {
            if (showToast) toast.error('Error al actualizar')
        }
    }

    const handleLogClick = (log: any) => {
        if (log.status === 'pending') {
            const updatedLog = { ...log, status: 'reviewed' }
            setSelectedLog(updatedLog)
            setLogs((prev: any[]) => prev.map(l => l.id === log.id ? updatedLog : l))
            // Optimistically decrease pending count
            setPendingCount(prev => Math.max(0, prev - 1))
            // Auto-review silently
            handleReview(log.id, 'reviewed', '', false)
        } else {
            setSelectedLog(log)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-4 rounded-xl border-gray-200 bg-white text-gray-900 font-bold text-xs gap-2 shadow-sm relative"
                >
                    <History className="h-4 w-4" /> Historial de comidas
                    {pendingCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[1000px] w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden gap-0" showCloseButton={false}>
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
                    {/* List of Meals - Very Narrow Sidebar */}
                    <ScrollArea className="w-24 flex-none border-r bg-gray-50/50">
                        <div className="p-3 space-y-3">
                            {loading ? (
                                [1, 2, 3, 4].map((i) => (
                                    <Skeleton key={i} className="aspect-square rounded-xl" />
                                ))
                            ) : logs.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-1">
                                    <History className="h-5 w-5 opacity-20" />
                                    <p className="text-[10px]">Vacío</p>
                                </div>
                            ) : (
                                logs.map((log) => (
                                    <div
                                        key={log.id}
                                        className={`group cursor-pointer rounded-xl overflow-hidden border-2 transition-all relative aspect-square shrink-0 ${selectedLog?.id === log.id ? 'border-zinc-900 ring-2 ring-zinc-900/10' : 'border-transparent hover:border-gray-200'}`}
                                        onClick={() => handleLogClick(log)}
                                    >
                                        <Image
                                            src={log.signedUrl || '/placeholder.png'}
                                            alt={log.meal_type}
                                            fill
                                            className="object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {log.status === 'reviewed' && (
                                            <div className="absolute top-1 right-1 bg-green-500 text-white p-0.5 rounded-full shadow-sm">
                                                <CheckCircle2 className="h-2.5 w-2.5" />
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>

                    {/* Detail View */}
                    <div className="flex-1 bg-white flex flex-col min-w-0">
                        {selectedLog ? (
                            <MealDetail
                                log={selectedLog}
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

function MealDetail({ log, onClose }: { log: any, onClose: () => void }) {
    return (
        <div className="flex-1 flex flex-col h-full bg-white min-h-0">
            <ScrollArea className="flex-1">
                <div className="relative w-full aspect-square sm:aspect-video bg-zinc-900/5 shrink-0 flex items-center justify-center border-b">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-300 absolute z-0" />
                    <Image
                        src={log.signedUrl || '/placeholder.png'}
                        alt={log.meal_type}
                        fill
                        className="object-cover relative z-10"
                        onLoadingComplete={(img) => {
                            img.parentElement?.querySelector('.animate-spin')?.classList.add('hidden')
                        }}
                    />
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 capitalize mb-1">{log.meal_type}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            {format(new Date(log.created_at), 'PPP p', { locale: es })}
                        </p>
                    </div>

                    {log.metadata?.description && (
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mt-4">
                            <p className="text-sm text-gray-700 italic">"{log.metadata.description}"</p>
                        </div>
                    )}

                    {log.metadata?.macros && (
                        <div className="grid grid-cols-4 gap-2 mt-4">
                            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50 border border-gray-100 shadow-sm">
                                <span className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Kcal</span>
                                <span className="font-black text-gray-900 text-sm">{log.metadata.macros.kcal}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50 border border-gray-100 shadow-sm">
                                <span className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">P</span>
                                <span className="font-black text-[#C50D00] text-sm">{log.metadata.macros.protein}g</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50 border border-gray-100 shadow-sm">
                                <span className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">C</span>
                                <span className="font-black text-[#E7A202] text-sm">{log.metadata.macros.carbs}g</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50 border border-gray-100 shadow-sm">
                                <span className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">G</span>
                                <span className="font-black text-[#009B27] text-sm">{log.metadata.macros.fats}g</span>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
