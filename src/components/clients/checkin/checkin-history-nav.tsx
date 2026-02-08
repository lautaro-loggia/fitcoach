"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { format, parse, subMonths, isAfter } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Calendar03Icon, SearchList01Icon as ListSearchIcon } from "hugeicons-react"
import { useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CheckinHistoryNavProps {
    checkins: any[]
    selectedId: string | null
    comparisonId: string | null
    onSelect: (id: string) => void
}

export function CheckinHistoryNav({ checkins, selectedId, comparisonId, onSelect }: CheckinHistoryNavProps) {
    const [timeFilter, setTimeFilter] = useState("all")

    // Sort descending for navigation
    const sorted = [...checkins].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const filtered = sorted.filter(c => {
        if (timeFilter === "all") return true
        const months = parseInt(timeFilter)
        const cutoff = subMonths(new Date(), months)
        return isAfter(new Date(c.date), cutoff)
    })

    return (
        <Card className="rounded-2xl border-border/40 shadow-sm overflow-hidden bg-white flex flex-col h-full">
            <CardHeader className="pb-3 px-6 pt-6 flex flex-col gap-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ListSearchIcon className="h-4 w-4 text-primary" />
                    Historial de check-ins
                </CardTitle>

                <Tabs value={timeFilter} onValueChange={setTimeFilter} className="w-full">
                    <TabsList className="grid grid-cols-4 w-full h-8 bg-gray-50/80 p-1">
                        <TabsTrigger value="3" className="text-[10px] font-bold h-6">3M</TabsTrigger>
                        <TabsTrigger value="6" className="text-[10px] font-bold h-6">6M</TabsTrigger>
                        <TabsTrigger value="12" className="text-[10px] font-bold h-6">12M</TabsTrigger>
                        <TabsTrigger value="all" className="text-[10px] font-bold h-6">Todo</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
                <div className="flex flex-col h-[400px]">
                    <div className="grid grid-cols-12 px-6 py-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest border-b border-border/40 bg-gray-50/50">
                        <div className="col-span-8">Fecha</div>
                        <div className="col-span-4 text-right">Peso</div>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        {filtered.length === 0 ? (
                            <div className="p-12 text-center">
                                <p className="text-sm text-muted-foreground font-medium">Sin registros</p>
                            </div>
                        ) : (
                            filtered.map((c) => {
                                const isSelected = selectedId === c.id
                                const isComparing = comparisonId === c.id

                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => onSelect(c.id)}
                                        className={cn(
                                            "grid grid-cols-12 px-6 py-3.5 items-center border-b border-border/40 last:border-0 cursor-pointer transition-all",
                                            isSelected
                                                ? "bg-primary/5 border-l-4 border-l-primary"
                                                : isComparing
                                                    ? "bg-indigo-50/50 border-l-4 border-l-indigo-400"
                                                    : "hover:bg-gray-50/50 border-l-4 border-l-transparent"
                                        )}
                                    >
                                        <div className="col-span-8 flex flex-col">
                                            <span className={cn(
                                                "text-xs font-bold",
                                                isSelected ? "text-primary" : "text-gray-700"
                                            )}>
                                                {format(new Date(c.date), 'dd MMMM, yyyy', { locale: es })}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-medium">
                                                {format(new Date(c.date), 'EEEE', { locale: es })}
                                            </span>
                                        </div>
                                        <div className="col-span-4 text-right">
                                            <span className={cn(
                                                "text-xs font-black",
                                                isSelected ? "text-primary" : "text-gray-900"
                                            )}>
                                                {c.weight}<span className="text-[10px] ml-0.5 text-gray-400">kg</span>
                                            </span>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
