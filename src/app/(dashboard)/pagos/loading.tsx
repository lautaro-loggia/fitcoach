import { Loader2 } from 'lucide-react'

export default function PagosLoading() {
    return (
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Cargando pagos...</p>
            </div>
        </div>
    )
}
