import { Skeleton } from "@/components/ui/skeleton"

export default function WorkoutLoading() {
    return (
        <div className="flex-1 flex flex-col bg-background min-h-[calc(100dvh-68px)]">
            {/* Header Skeleton */}
            <div className="fixed top-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 py-4">
                <div className="flex items-center justify-between max-w-md mx-auto">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-md" />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                    <Skeleton className="h-9 w-24 rounded-full" />
                </div>
            </div>

            {/* Spacer for fixed header */}
            <div className="h-[84px]" />

            {/* Exercise List Skeleton */}
            <div className="p-4 space-y-6 flex-1 pb-[calc(110px+env(safe-area-inset-bottom))]">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white border rounded-2xl shadow-sm p-4 space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-6 w-48" />
                                <Skeleton className="h-8 w-8 rounded-full" />
                            </div>
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-6 w-32" />
                        </div>

                        <div className="space-y-2 pt-2">
                            <div className="grid grid-cols-5 gap-2 px-1">
                                {[1, 2, 3, 4, 5].map((j) => (
                                    <Skeleton key={j} className="h-3 w-full" />
                                ))}
                            </div>
                            <div className="border rounded-lg overflow-hidden bg-gray-50/50">
                                {[1, 2].map((j) => (
                                    <div key={j} className="h-12 border-b last:border-0 flex items-center px-4 gap-4">
                                        <Skeleton className="h-4 w-4" />
                                        <Skeleton className="h-4 flex-1" />
                                        <Skeleton className="h-4 w-12" />
                                        <Skeleton className="h-4 w-12" />
                                        <Skeleton className="h-4 w-4" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Skeleton className="h-11 w-full rounded-xl" />
                    </div>
                ))}
            </div>
        </div>
    )
}
