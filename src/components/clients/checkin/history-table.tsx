import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { format } from "date-fns"

interface HistoryTableProps {
    data: any[] // Expects { date: string, value: number }
    unit: string
    checkins?: any[] // Kept for retro compatibility or full details if needed, but unused for now based on requirement
}

export function HistoryTable({ data, unit }: HistoryTableProps) {
    // Sort descending for history
    const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return (
        <Card className="border-muted/60 shadow-sm">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Historial del progreso</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="w-full">
                    <div className="flex justify-between px-6 py-2 text-muted-foreground text-xs font-medium uppercase tracking-wide border-b border-border/40">
                        <span>Fecha</span>
                        <span>Valor</span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        {sorted.length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                Sin registros disponibles
                            </div>
                        ) : (
                            sorted.map((c, i) => (
                                <div key={i} className="flex justify-between px-6 py-4 items-center border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                                    <span className="font-medium text-sm text-muted-foreground">
                                        {format(new Date(c.date), 'dd/MM/yyyy')}
                                    </span>
                                    <span className="font-semibold text-sm text-foreground/80">
                                        {c.value !== null ? `${c.value}${unit}` : '—'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
