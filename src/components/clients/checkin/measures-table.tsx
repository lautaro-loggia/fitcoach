"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ArrowUpRight as ArrowUpRightIcon, ArrowDownRight as ArrowDownRightIcon, Minus as MinusIcon } from "lucide-react"
import { RulerIcon } from "hugeicons-react"

interface MeasuresTableProps {
    selected: any
    comparison?: any
    activeMetric: string
    onSelectMetric: (key: string) => void
}

export function MeasuresTable({ selected, comparison, activeMetric, onSelectMetric }: MeasuresTableProps) {
    const getValue = (key: string, isMeasurement = false) => {
        if (!selected) return null
        return isMeasurement ? selected.measurements?.[key] : selected[key]
    }

    const calculateDelta = (key: string, isMeasurement = false) => {
        if (!selected || !comparison) return null

        const currentVal = isMeasurement ? selected.measurements?.[key] : selected[key]
        const compVal = isMeasurement ? comparison.measurements?.[key] : comparison[key]

        if (currentVal === null || currentVal === undefined || compVal === null || compVal === undefined) return null

        return Number(currentVal) - Number(compVal)
    }

    const rows = [
        { key: 'measurements.waist', label: "Cintura", unit: "cm", isMeasurement: true },
        { key: 'measurements.hips', label: "Cadera", unit: "cm", isMeasurement: true },
        { key: 'measurements.chest', label: "Pecho", unit: "cm", isMeasurement: true },
        { key: 'measurements.arm', label: "Brazo", unit: "cm", isMeasurement: true },
        { key: 'measurements.thigh', label: "Muslo", unit: "cm", isMeasurement: true },
        { key: 'measurements.calf', label: "Gemelos", unit: "cm", isMeasurement: true },
        { key: 'weight', label: "Peso", unit: "kg", isMeasurement: false },
        { key: 'body_fat', label: "Grasa Corporal", unit: "%", isMeasurement: false },
        { key: 'lean_mass', label: "Masa Magra", unit: "kg", isMeasurement: false },
    ]

    return (
        <Card className="rounded-2xl border-border/40 shadow-sm overflow-hidden bg-white h-full">
            <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <RulerIcon className="h-4 w-4 text-primary" />
                    Detalle de medidas
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="w-full text-sm">
                    <div className="grid grid-cols-12 px-6 py-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest border-b border-border/40 bg-gray-50/50">
                        <div className="col-span-6">Medida</div>
                        <div className="col-span-3 text-right">Valor</div>
                        <div className="col-span-3 text-right">Delta</div>
                    </div>
                    <div>
                        {rows.map((row, i) => {
                            const val = getValue(row.isMeasurement ? row.key.split('.')[1] : row.key, row.isMeasurement)
                            const delta = calculateDelta(row.isMeasurement ? row.key.split('.')[1] : row.key, row.isMeasurement)
                            const isSelected = activeMetric === row.key

                            const isPositive = delta && delta > 0
                            const isZero = delta === 0 || delta === null

                            // Important: Use waist/hips/body_fat for inverse logic (lower is usually better)
                            const inverse = ['measurements.waist', 'measurements.hips', 'body_fat'].includes(row.key)
                            let deltaColor = "text-gray-400"
                            if (delta !== null && delta !== 0) {
                                if (isPositive) {
                                    deltaColor = inverse ? "text-orange-600" : "text-green-600"
                                } else {
                                    deltaColor = inverse ? "text-green-600" : "text-orange-600"
                                }
                            }

                            return (
                                <div
                                    key={i}
                                    onClick={() => onSelectMetric(row.key)}
                                    className={cn(
                                        "grid grid-cols-12 px-6 py-3.5 items-center border-b border-border/40 last:border-0 cursor-pointer transition-all",
                                        isSelected ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-gray-50/50 border-l-4 border-l-transparent"
                                    )}
                                >
                                    <div className={cn("col-span-6 font-bold", isSelected ? "text-primary" : "text-gray-700")}>
                                        {row.label}
                                    </div>
                                    <div className="col-span-3 text-right font-black">
                                        {val !== null && val !== undefined ? (
                                            <span className={isSelected ? "text-primary" : "text-gray-900"}>
                                                {val}<span className="text-[10px] ml-0.5 text-gray-400">{row.unit}</span>
                                            </span>
                                        ) : (
                                            <span className="text-gray-300">—</span>
                                        )}
                                    </div>
                                    <div className={cn("col-span-3 text-right text-[11px] font-black", deltaColor)}>
                                        {!isZero ? (
                                            <div className="flex items-center justify-end gap-0.5">
                                                {isPositive ? "+" : ""}{delta?.toFixed(1)}
                                            </div>
                                        ) : (
                                            <span className="text-gray-200">—</span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
