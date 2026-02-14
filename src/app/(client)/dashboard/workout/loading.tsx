import { Skeleton } from "@/components/ui/skeleton"

export default function WorkoutsLoading() {
    return (
        <div className="flex-1 flex flex-col p-4 space-y-6 pb-[calc(110px+env(safe-area-inset-bottom))] min-h-[calc(100dvh-68px)]">
            <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-7 w-32" />
            </div>

            <div className="space-y-3">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-28 w-full rounded-2xl shadow-sm" />
            </div>

            <div className="space-y-4">
                <Skeleton className="h-4 w-32" />
                <div className="flex flex-col gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white border p-4 flex items-center justify-between rounded-2xl shadow-sm">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-3 w-40" />
                                </div>
                            </div>
                            <Skeleton className="h-5 w-5 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
