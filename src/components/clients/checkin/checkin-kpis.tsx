"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ArrowUpRight as ArrowUpRightIcon, ArrowDownRight as ArrowDownRightIcon, Minus as MinusIcon } from "lucide-react"

interface KPIProps {
    label: string
    value: number | string | null
    unit: string
    delta?: number | null
    inverseColors?: boolean // Si es true, bajar es verde (ej: grasa)
}

function KPI({ label, value, unit, delta, inverseColors }: KPIProps) {
    const hasDelta = delta !== undefined && delta !== null && delta !== 0
    const isPositive = delta && delta > 0

    // Determine color based on delta and if it's "good" or "bad"
    let deltaColor = "text-gray-400"
    if (hasDelta) {
        if (isPositive) {
            deltaColor = inverseColors ? "text-orange-500 bg-orange-50" : "text-green-500 bg-green-50"
        } else {
            deltaColor = inverseColors ? "text-green-500 bg-green-50" : "text-orange-500 bg-orange-50"
        }
    }

    return (
        <Card className="p-4 rounded-2xl border-border/40 shadow-sm bg-white">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                {label}
            </p>
            <div className="flex items-end justify-between gap-2">
                <div className="flex items-baseline gap-0.5">
                    <span className="text-2xl font-black text-gray-900 leading-none">
                        {value !== null && value !== undefined ? value : "—"}
                    </span>
                    <span className="text-xs font-bold text-gray-400">
                        {unit}
                    </span>
                </div>

                {hasDelta ? (
                    <div className={cn("flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black", deltaColor)}>
                        {isPositive ? <ArrowUpRightIcon className="h-3 w-3" /> : <ArrowDownRightIcon className="h-3 w-3" />}
                        {Math.abs(delta).toFixed(1)}
                    </div>
                ) : (
                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-gray-300">
                        <MinusIcon className="h-3 w-3" />
                    </div>
                )}
            </div>
        </Card>
    )
}

interface CheckinKPIsProps {
    selected: any
    comparison?: any
}

export function CheckinKPIs({ selected, comparison }: CheckinKPIsProps) {
    const calculateDelta = (key: string, isMeasurement: boolean = false) => {
        if (!selected || !comparison) return null

        const currentVal = isMeasurement ? selected.measurements?.[key] : selected[key]
        const compVal = isMeasurement ? comparison.measurements?.[key] : comparison[key]

        if (currentVal === null || currentVal === undefined || compVal === null || compVal === undefined) return null

        return Number(currentVal) - Number(compVal)
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            <KPI
                label="Peso"
                value={selected?.weight}
                unit="kg"
                delta={calculateDelta('weight')}
            />
            <KPI
                label="Grasa Corp."
                value={selected?.body_fat}
                unit="%"
                delta={calculateDelta('body_fat')}
                inverseColors={true}
            />
            <KPI
                label="Cintura"
                value={selected?.measurements?.waist}
                unit="cm"
                delta={calculateDelta('waist', true)}
                inverseColors={true}
            />
            <KPI
                label="Masa Magra"
                value={selected?.lean_mass}
                unit="kg"
                delta={calculateDelta('lean_mass')}
            />
        </div>
    )
}
