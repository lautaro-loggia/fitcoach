import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface WeightSummaryProps {
    current: number | null
    start: number | null
    target: number | null
    label: string
    unit: string
    onEditTarget?: () => void
}

export function WeightSummary({ current, start, target, label, unit, onEditTarget }: WeightSummaryProps) {
    return (
        <div className="bg-white rounded-xl border border-muted/60 shadow-sm p-6 mb-6">
            <h3 className="text-base font-semibold mb-4">{label}</h3>
            <div className="flex gap-12">
                <div>
                    <div className="text-3xl font-bold tracking-tight">
                        {current ? `${current}${unit}` : "—"}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium mt-1">Actual</div>
                </div>
                <div className="relative group">
                    <div className="flex items-center gap-2">
                        <div className="text-3xl font-bold tracking-tight text-foreground/90">
                            {target ? `${target}${unit}` : "—"}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={onEditTarget}
                            title="Editar meta"
                        >
                            <Pencil className="h-3 w-3" />
                        </Button>
                    </div>
                    <div className="text-sm text-muted-foreground font-medium mt-1">Meta</div>
                </div>
                <div>
                    <div className="text-3xl font-bold tracking-tight text-foreground/90">
                        {start ? `${start}${unit}` : "—"}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium mt-1">Comenzo</div>
                </div>
            </div>
        </div>
    )
}
