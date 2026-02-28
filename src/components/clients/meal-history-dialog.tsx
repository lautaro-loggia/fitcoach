'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { History, ChevronLeft, ChevronRight, CheckCircle2, X, Camera, UtensilsCrossed } from 'lucide-react'
import { format, addDays, subDays, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { getDailyMealLogs, reviewMealLog, getPendingMealLogsCount, markAllPendingMealLogsAsReviewed } from '@/app/(dashboard)/clients/[id]/meal-plan-actions'
import Image from 'next/image'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface MealHistoryDialogProps {
    clientId: string
}

type LogStatus = 'pending' | 'reviewed'

type MealMacro = {
    kcal?: number | string
    protein?: number | string
    carbs?: number | string
    fats?: number | string
}

type MealIngredient = {
    name?: string
    grams?: number | string
    quantity?: number | string
    unit?: string
}

type MealMetadata = {
    title?: string
    description?: string
    macros?: MealMacro
    ingredients?: MealIngredient[]
    ai_ingredients?: MealIngredient[]
}

type MealLog = {
    id: string
    meal_type: string
    created_at: string
    status: LogStatus
    signedUrl?: string
    metadata?: MealMetadata
    coach_comment?: string
}

type MacroSummary = {
    kcal: number
    protein: number
    carbs: number
    fats: number
}

type ParsedIngredient = {
    name: string
    amount: string
}

function toRoundedNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.round(value)
    }

    if (typeof value === 'string') {
        const parsed = Number(value.replace(',', '.'))
        if (Number.isFinite(parsed)) {
            return Math.round(parsed)
        }
    }

    return 0
}

function getLogMacros(log: MealLog): MacroSummary {
    const macros = log.metadata?.macros
    return {
        kcal: toRoundedNumber(macros?.kcal),
        protein: toRoundedNumber(macros?.protein),
        carbs: toRoundedNumber(macros?.carbs),
        fats: toRoundedNumber(macros?.fats),
    }
}

function getMealTitle(log: MealLog): string {
    const metadataTitle = log.metadata?.title?.trim()
    const metadataDescription = log.metadata?.description?.trim()
    return metadataTitle || metadataDescription || log.meal_type
}

function formatIngredientAmount(ingredient: MealIngredient): string {
    const grams = toRoundedNumber(ingredient.grams)
    if (grams > 0) {
        return `${grams}g`
    }

    const quantity = toRoundedNumber(ingredient.quantity)
    if (quantity > 0) {
        return ingredient.unit ? `${quantity}${ingredient.unit}` : `${quantity}`
    }

    return '-'
}

function getLogIngredients(log: MealLog): ParsedIngredient[] {
    const fromMetadata = Array.isArray(log.metadata?.ingredients) && log.metadata.ingredients.length > 0
        ? log.metadata.ingredients
        : (Array.isArray(log.metadata?.ai_ingredients) ? log.metadata.ai_ingredients : [])

    return fromMetadata
        .map((ingredient, index) => ({
            name: ingredient.name?.trim() || `Ingrediente ${index + 1}`,
            amount: formatIngredientAmount(ingredient),
        }))
}

function formatDisplayDate(date: Date): string {
    const raw = format(date, "d 'de' MMMM, yyyy", { locale: es })
    return raw.replace(/ de ([a-záéíóúñ]+)/i, (_match, month: string) => ` de ${month.charAt(0).toUpperCase()}${month.slice(1)}`)
}

function formatMealTime(createdAt: string): string {
    return format(new Date(createdAt), 'HH:mm a', { locale: es })
}

function formatKcalLabel(kcal: number): string {
    return kcal > 0 ? `${kcal} kcal` : '-- kcal'
}

function formatMacroLabel(value: number): string {
    return value > 0 ? `${value}g` : '--'
}

export function MealHistoryDialog({ clientId }: MealHistoryDialogProps) {
    const [open, setOpen] = useState(false)
    const [date, setDate] = useState(new Date())
    const [logs, setLogs] = useState<MealLog[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedLog, setSelectedLog] = useState<MealLog | null>(null)
    const [pendingCount, setPendingCount] = useState(0)

    const fetchLogs = useCallback(async () => {
        setLoading(true)
        const dateStr = format(date, 'yyyy-MM-dd')
        const result = await getDailyMealLogs(clientId, dateStr)
        const nextLogs = (result.logs || []) as MealLog[]

        setLogs(nextLogs)
        setSelectedLog((prevSelected) => (
            nextLogs.find((log) => log.id === prevSelected?.id) || nextLogs[0] || null
        ))
        setLoading(false)
    }, [clientId, date])

    useEffect(() => {
        getPendingMealLogsCount(clientId).then((res) => setPendingCount(res.count || 0))
    }, [clientId])

    useEffect(() => {
        if (!open) return

        const frameId = window.requestAnimationFrame(() => {
            void fetchLogs()
        })

        return () => window.cancelAnimationFrame(frameId)
    }, [fetchLogs, open])

    useEffect(() => {
        if (!open) return

        const syncPendingLogs = async () => {
            const result = await markAllPendingMealLogsAsReviewed(clientId)
            const latestCount = await getPendingMealLogsCount(clientId)
            setPendingCount(latestCount.count || 0)

            if (!result.success) return

            setLogs((prev) => prev.map((log) => (
                log.status === 'pending' ? { ...log, status: 'reviewed' } : log
            )))
            setSelectedLog((prev) => (
                prev && prev.status === 'pending' ? { ...prev, status: 'reviewed' } : prev
            ))
            await fetchLogs()
        }

        void syncPendingLogs()
    }, [clientId, fetchLogs, open])

    const handleReview = async (
        logId: string,
        status: LogStatus,
        comment?: string,
        showToast = true
    ) => {
        const result = await reviewMealLog(logId, status, comment)
        if (result?.success) {
            if (showToast) toast.success('Comida actualizada')
            setLogs((prev) => prev.map((log) => (
                log.id === logId ? { ...log, status, coach_comment: comment } : log
            )))
            setSelectedLog((prev) => (
                prev?.id === logId ? { ...prev, status, coach_comment: comment } : prev
            ))
            getPendingMealLogsCount(clientId).then((res) => setPendingCount(res.count || 0))
            return
        }

        if (showToast) toast.error('Error al actualizar')
    }

    const handleLogClick = (log: MealLog) => {
        if (log.status === 'pending') {
            const updatedLog: MealLog = { ...log, status: 'reviewed' }
            setSelectedLog(updatedLog)
            setLogs((prev) => prev.map((item) => item.id === log.id ? updatedLog : item))
            setPendingCount((prev) => Math.max(0, prev - 1))
            void handleReview(log.id, 'reviewed', '', false)
            return
        }

        setSelectedLog(log)
    }

    const dayLabel = isToday(date)
        ? 'HOY'
        : format(date, 'EEE', { locale: es }).replace('.', '').toUpperCase()

    const hasLogs = logs.length > 0

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="relative h-10 gap-2 rounded-xl border-gray-200 bg-white px-4 text-xs font-bold text-gray-900 shadow-sm"
                >
                    <History className="h-4 w-4" />
                    Historial de comidas
                    {pendingCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                        </span>
                    )}
                </Button>
            </DialogTrigger>

            <DialogContent
                className="h-[min(640px,calc(100vh-120px))] w-[min(1060px,calc(100vw-120px))] !max-w-[min(1060px,calc(100vw-120px))] gap-0 overflow-hidden rounded-[20px] border border-[#E3E8F1] bg-[#F8FAFD] p-0 shadow-[0_20px_56px_rgba(15,23,42,0.2)]"
                showCloseButton={false}
            >
                <div className="flex h-[84px] items-center justify-between border-b border-[#E3E8F1] bg-[#F8FAFD] px-6">
                    <DialogTitle className="whitespace-nowrap text-[30px] leading-none font-semibold tracking-[-0.02em] text-[#0F172A]">
                        Historial de comidas
                    </DialogTitle>

                    <div className="flex items-center gap-4">
                        <div className="flex h-[64px] w-[300px] items-center justify-between rounded-[14px] border border-[#E2E8F0] bg-[#F3F6FC] px-2.5">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-full text-[#7F8EA6] hover:bg-[#E9EEF8] hover:text-[#64748B]"
                                onClick={() => setDate(subDays(date, 1))}
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>

                            <div className="flex flex-col items-center justify-center">
                                <span className="text-[10px] font-semibold tracking-[0.18em] text-[#4F46E5] uppercase">
                                    {dayLabel}
                                </span>
                                <span className="mt-1 text-[14px] leading-none font-semibold text-[#0F172A]">
                                    {formatDisplayDate(date)}
                                </span>
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-full text-[#7F8EA6] hover:bg-[#E9EEF8] hover:text-[#64748B]"
                                onClick={() => setDate(addDays(date, 1))}
                            >
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </div>

                        <DialogClose asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-full text-[#8A97AD] hover:bg-[#E9EEF8] hover:text-[#64748B]"
                            >
                                <X className="h-6 w-6" />
                            </Button>
                        </DialogClose>
                    </div>
                </div>

                <div className="flex min-h-0 flex-1">
                    <aside className="flex min-h-0 w-[320px] flex-col border-r border-[#E3E8F1] bg-[#F8FAFD]">
                        <div className="flex h-[56px] items-center border-b border-[#E3E8F1] px-5">
                            <p className="text-[14px] font-semibold tracking-[0.08em] text-[#95A3BA] uppercase">
                                Registros del día
                            </p>
                        </div>

                        {loading || hasLogs ? (
                            <ScrollArea className="min-h-0 flex-1">
                                {loading ? (
                                <div className="space-y-0">
                                    {[1, 2, 3].map((item) => (
                                        <div key={item} className="grid grid-cols-[60px_1fr_auto] items-center gap-3 border-b border-[#E6ECF4] px-5 py-5">
                                            <Skeleton className="h-[60px] w-[60px] rounded-[12px]" />
                                            <div className="space-y-3">
                                                <Skeleton className="h-4 w-24" />
                                                <Skeleton className="h-4 w-16" />
                                            </div>
                                            <Skeleton className="h-5 w-14" />
                                        </div>
                                    ))}
                                </div>
                                ) : (
                                    <div>
                                    {logs.map((log) => {
                                        const isSelected = selectedLog?.id === log.id
                                        const macros = getLogMacros(log)
                                        return (
                                            <button
                                                key={log.id}
                                                type="button"
                                                onClick={() => handleLogClick(log)}
                                                className={cn(
                                                    'relative grid w-full grid-cols-[60px_1fr_auto] items-center gap-3 border-b border-[#E6ECF4] px-5 py-5 text-left transition-colors',
                                                    isSelected ? 'bg-[#F6F8FF]' : 'hover:bg-[#F8FAFF]'
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'absolute top-0 left-0 h-full w-[6px] rounded-r-full bg-[#4F46E5] transition-opacity',
                                                        isSelected ? 'opacity-100' : 'opacity-0'
                                                    )}
                                                />

                                                <div className="relative h-[60px] w-[60px] overflow-hidden rounded-[12px] bg-[#E2E8F0]">
                                                    {log.signedUrl ? (
                                                        <Image
                                                            src={log.signedUrl}
                                                            alt={log.meal_type}
                                                            fill
                                                            sizes="60px"
                                                            quality={72}
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-[#A4B1C7]">
                                                            <History className="h-8 w-8" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="truncate text-[14px] leading-none font-semibold text-[#1E293B]">
                                                        {log.meal_type}
                                                    </p>
                                                    <p className="mt-1 text-[12px] leading-none text-[#71839C]">
                                                        {formatMealTime(log.created_at)}
                                                    </p>
                                                </div>

                                                <p className="pl-2 text-[12px] leading-none font-semibold text-[#4F46E5] tabular-nums">
                                                    {formatKcalLabel(macros.kcal)}
                                                </p>

                                                {log.status === 'reviewed' && (
                                                    <div className="absolute top-4 right-4 rounded-full bg-[#10B981] p-1 text-white">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                    </div>
                                )}
                            </ScrollArea>
                        ) : (
                            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-8 text-center text-[#94A3B8]">
                                <UtensilsCrossed className="h-9 w-9" />
                                <p className="text-base font-semibold">No hay platos registrados</p>
                                <p className="text-sm">No existen comidas cargadas para este día.</p>
                            </div>
                        )}
                    </aside>

                    <section className="grid min-h-0 flex-1 content-start grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)] gap-4 px-4 pt-2 pb-4">
                        <div className="min-h-0 overflow-y-auto pr-1">
                            {loading ? (
                                <MealDetailSkeleton />
                            ) : selectedLog ? (
                                <MealDetailContent log={selectedLog} />
                            ) : (
                                <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[#D8E0EB] bg-[#F5F8FD] px-8 text-center">
                                    <UtensilsCrossed className="h-12 w-12 text-[#A4B1C7]" />
                                    <h3 className="mt-4 text-[24px] font-semibold text-[#334155]">Sin platos para este día</h3>
                                    <p className="mt-2 text-lg text-[#6B7C95]">
                                        Cambiá la fecha o esperá a que el asesorado cargue nuevas comidas.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex min-h-0 items-stretch">
                            <MealPhotoPanel log={selectedLog} loading={loading} />
                        </div>
                    </section>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function MealDetailContent({ log }: { log: MealLog }) {
    const macros = useMemo(() => getLogMacros(log), [log])
    const ingredients = useMemo(() => getLogIngredients(log), [log])
    const title = getMealTitle(log)

    return (
        <div className="space-y-5">
            <span className="inline-flex h-8 items-center rounded-full border border-[#D9E0EA] bg-white px-4 text-[12px] font-semibold text-[#0F172A]">
                {log.meal_type}
            </span>

            <h3 className="max-w-[500px] text-[18px] leading-[1.18] font-semibold text-[#0F172A]">
                {title}
            </h3>

            <div className="max-w-[500px] rounded-[16px] border border-[#E2E8F1] bg-[#F2F5FA] p-4">
                <div className="flex items-end justify-center gap-2">
                    <span className="text-[44px] leading-none font-bold text-[#0B1538] tabular-nums">
                        {macros.kcal > 0 ? macros.kcal : '--'}
                    </span>
                    <span className="mb-1 text-[20px] leading-none font-medium text-[#8EA0BA]">kcal</span>
                </div>
                <p className="text-center text-[11px] font-semibold tracking-[0.14em] text-[#4F46E5] uppercase">
                    Total calórico
                </p>

                <div className="mt-6 grid grid-cols-3 divide-x divide-[#D5DEEA]">
                    <MacroCell label="Proteína" value={formatMacroLabel(macros.protein)} />
                    <MacroCell label="Carbos" value={formatMacroLabel(macros.carbs)} />
                    <MacroCell label="Grasas" value={formatMacroLabel(macros.fats)} />
                </div>
            </div>

            <div className="max-w-[500px]">
                <h4 className="text-[14px] font-semibold tracking-[0.02em] text-[#64748B] uppercase">Ingredientes</h4>

                {ingredients.length > 0 ? (
                    <ul className="mt-2.5 space-y-2.5">
                        {ingredients.map((ingredient, index) => (
                            <li key={`${ingredient.name}-${index}`} className="flex items-center justify-between gap-6">
                                <span className="text-[13px] leading-none font-medium text-[#1E293B]">
                                    {ingredient.name}
                                </span>
                                <span className="text-[13px] leading-none font-semibold text-[#0F172A] tabular-nums">
                                    {ingredient.amount}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-4 text-xl text-[#94A3B8]">Sin ingredientes detectados para este plato.</p>
                )}
            </div>
        </div>
    )
}

function MacroCell({ label, value }: { label: string; value: string }) {
    return (
        <div className="px-3 text-center">
            <p className="text-[15px] leading-none font-semibold text-[#1E293B]">{value}</p>
            <p className="mt-2 text-[10px] font-semibold tracking-[0.08em] text-[#8A9AB1] uppercase">{label}</p>
        </div>
    )
}

function MealPhotoPanel({ log, loading }: { log: MealLog | null; loading: boolean }) {
    if (loading) {
        return (
            <div className="h-full w-full rounded-[22px] border border-[#E2E8F1] bg-[#EEF2F8]">
                <Skeleton className="h-full w-full rounded-[22px]" />
            </div>
        )
    }

    if (!log) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center rounded-[22px] border border-dashed border-[#D8E0EB] bg-[#F5F8FD] text-center">
                <History className="h-10 w-10 text-[#A4B1C7]" />
                <p className="mt-3 text-lg font-semibold text-[#64748B]">Sin foto para mostrar</p>
            </div>
        )
    }

    return (
        <div className="relative h-full w-full overflow-hidden rounded-[22px] border border-[#E2E8F1] bg-[#E2E8F0]">
            {log.signedUrl ? (
                <Image
                    src={log.signedUrl}
                    alt={getMealTitle(log)}
                    fill
                    sizes="(max-width: 1600px) 45vw, 640px"
                    quality={78}
                    className="object-cover"
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center text-[#9AA9BF]">
                    <UtensilsCrossed className="h-14 w-14" />
                </div>
            )}

            <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-[12px] border border-white/35 bg-black/35 px-3.5 py-1.5 text-[12px] font-semibold text-white backdrop-blur-[2px]">
                <Camera className="h-4 w-4" />
                Foto del asesorado
            </div>
        </div>
    )
}

function MealDetailSkeleton() {
    return (
        <div className="space-y-7">
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-[112px] w-full max-w-[760px] rounded-xl" />
            <Skeleton className="h-[280px] w-full max-w-[760px] rounded-[22px]" />
            <Skeleton className="h-10 w-64 rounded-lg" />
            <div className="space-y-4">
                {[1, 2, 3, 4].map((row) => (
                    <div key={row} className="flex items-center justify-between gap-6">
                        <Skeleton className="h-8 w-60 rounded-md" />
                        <Skeleton className="h-8 w-24 rounded-md" />
                    </div>
                ))}
            </div>
        </div>
    )
}
