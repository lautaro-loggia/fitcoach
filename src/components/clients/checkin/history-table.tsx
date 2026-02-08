import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { format, parse } from "date-fns"
import { cn } from "@/lib/utils"

interface HistoryTableProps {
    data: any[] // Expects { date: string, value: number, id: string }
    unit: string
    selectedId?: string
    onSelect?: (id: string) => void
}

export function HistoryTable({ data, unit, selectedId, onSelect }: HistoryTableProps) {
    // Sort descending for history
    const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return (
        <Card>
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
                            sorted.map((c, i) => {
                                const isSelected = selectedId === c.id
                                return (
                                    <div
                                        key={c.id || i}
                                        onClick={() => onSelect?.(c.id)}
                                        className={cn(
                                            "flex justify-between px-6 py-4 items-center border-b border-border/40 last:border-0 cursor-pointer transition-colors",
                                            isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/20"
                                        )}
                                    >
                                        <span className={cn(
                                            "font-medium text-sm",
                                            isSelected ? "text-primary" : "text-muted-foreground"
                                        )}>
                                            {format(parse(c.date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')}
                                        </span>
                                        <span className={cn(
                                            "font-semibold text-sm",
                                            isSelected ? "text-primary" : "text-foreground/80"
                                        )}>
                                            {c.value !== null ? `${c.value}${unit}` : '—'}
                                        </span>
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
