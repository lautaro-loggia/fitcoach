import { Skeleton } from "@/components/ui/skeleton"

export default function DietLoading() {
    return (
        <div className="flex-1 flex flex-col p-4 space-y-6 pb-[calc(110px+env(safe-area-inset-bottom))] min-h-[calc(100dvh-68px)]">
            <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-4 w-24" />
            </div>

            <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white p-3 rounded-2xl shadow-sm space-y-2 border">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-5 w-16" />
                    </div>
                ))}
            </div>

            <div className="space-y-4 pt-2">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white border p-4 rounded-2xl shadow-sm space-y-3">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-xl" />
                                <div className="space-y-1.5">
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-5 w-32" />
                                </div>
                            </div>
                            <Skeleton className="h-8 w-20 rounded-full" />
                        </div>
                        <div className="flex gap-4 border-t pt-3">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
