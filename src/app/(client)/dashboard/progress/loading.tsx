import { Skeleton } from "@/components/ui/skeleton"

const CHART_BAR_HEIGHTS = ['28%', '46%', '62%', '40%', '74%', '55%', '36%']

export default function ProgressLoading() {
    return (
        <div className="flex-1 flex flex-col p-4 space-y-6 pb-[calc(110px+env(safe-area-inset-bottom))] min-h-[calc(100dvh-68px)]">
            <h1 className="text-xl font-bold">Mi Progreso</h1>

            <div className="grid grid-cols-2 gap-3">
                {[1, 2].map((i) => (
                    <div key={i} className="bg-white border p-4 rounded-2xl shadow-sm space-y-2 text-center">
                        <Skeleton className="h-4 w-16 mx-auto" />
                        <Skeleton className="h-7 w-20 mx-auto" />
                        <Skeleton className="h-3 w-12 mx-auto" />
                    </div>
                ))}
            </div>

            <div className="bg-white border p-6 rounded-2xl shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-8 w-24 rounded-full" />
                </div>
                <div className="h-48 w-full flex items-end gap-2 px-2">
                    {CHART_BAR_HEIGHTS.map((height, index) => (
                        <Skeleton key={index} className="flex-1 rounded-t-lg" style={{ height }} />
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <Skeleton className="h-5 w-40" />
                {[1, 2].map((i) => (
                    <div key={i} className="bg-white border p-4 rounded-2xl shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        </div>
                        <Skeleton className="h-6 w-12" />
                    </div>
                ))}
            </div>
        </div>
    )
}
