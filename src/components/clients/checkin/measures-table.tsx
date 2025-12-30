import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface MeasuresTableProps {
    checkins: any[]
    selectedMetric: string
    onSelect: (key: string) => void
}

export function MeasuresTable({ checkins, selectedMetric, onSelect }: MeasuresTableProps) {
    // Determine latest values for each metric
    // If we assume checkins are ordered by date ascending, we reverse to find latest non-null
    const sortedCheckins = [...checkins].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const getLatest = (key: string, isMeasurement = false) => {
        const found = sortedCheckins.find(c => {
            if (isMeasurement) return c.measurements && c.measurements[key]
            return c[key]
        })

        if (!found) return { value: "—", date: null }

        const value = isMeasurement ? found.measurements[key] : found[key]
        return {
            value,
            date: found.date
        }
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "—"
        return format(new Date(dateString), "d 'de' MMMM", { locale: es })
    }

    const rows = [
        { key: 'body_fat', label: "Grasa corporal", ...getLatest("body_fat"), unit: "%" },
        { key: 'weight', label: "Peso", ...getLatest("weight"), unit: "kg" },
        { key: 'lean_mass', label: "Masa magra", ...getLatest("lean_mass"), unit: "kg" },
        // Measurements
        { key: 'measurements.chest', label: "Medida Pecho", ...getLatest("chest", true), unit: "cm" },
        { key: 'measurements.waist', label: "Medida Cintura", ...getLatest("waist", true), unit: "cm" },
        { key: 'measurements.hips', label: "Medida Cadera", ...getLatest("hips", true), unit: "cm" },
        { key: 'measurements.arm', label: "Medida Brazo", ...getLatest("arm", true), unit: "cm" },
        { key: 'measurements.thigh', label: "Medida Muslo", ...getLatest("thigh", true), unit: "cm" },
        { key: 'measurements.calves', label: "Medida Gemelos", ...getLatest("calves", true), unit: "cm" },
    ]

    return (
        <Card className="h-full border-muted/60 shadow-sm">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Medidas corporales</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="w-full text-sm">
                    <div className="grid grid-cols-12 px-6 py-2 text-muted-foreground text-xs font-medium uppercase tracking-wide border-b border-border/40">
                        <div className="col-span-5">Nombre</div>
                        <div className="col-span-3 text-right pr-4">Valor</div>
                        <div className="col-span-4 text-right">Última actualización</div>
                    </div>
                    <div>
                        {rows.map((row, i) => {
                            const isSelected = selectedMetric === row.key
                            return (
                                <div
                                    key={i}
                                    onClick={() => onSelect(row.key)}
                                    className={cn(
                                        "grid grid-cols-12 px-6 py-4 items-center border-b border-border/40 last:border-0 cursor-pointer transition-colors",
                                        isSelected ? "bg-muted/80 hover:bg-muted/80" : "hover:bg-muted/20"
                                    )}
                                >
                                    <div className={cn("col-span-5 font-medium", isSelected && "text-primary")}>
                                        {row.label}
                                    </div>
                                    <div className={cn("col-span-3 text-right font-semibold pr-4", isSelected && "text-primary")}>
                                        {row.value !== "—" ? `${row.value}${row.unit} ` : "—"}
                                    </div>
                                    <div className={cn("col-span-4 text-right text-muted-foreground", isSelected && "text-primary/80")}>
                                        {formatDate(row.date)}
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
