'use client'

import { Loader2, Home } from 'lucide-react'

export default function DashboardLoading() {
    return (
        <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-primary/20 flex items-center justify-center">
                        <Home className="h-5 w-5 text-primary/40" />
                    </div>
                    <Loader2 className="absolute -top-0.5 -left-0.5 h-[52px] w-[52px] animate-spin text-primary" />
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">
                    Cargando dashboard...
                </p>
            </div>
        </div>
    )
}
