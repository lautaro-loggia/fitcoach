import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function DashboardLoading() {
    return (
        <div className="p-4 space-y-6 pb-24 max-w-md mx-auto">
            {/* Header Skeleton */}
            <div className="flex justify-between items-center py-1">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>

            {/* Main Banner / Check-in Skeleton */}
            <Card className="border-none shadow-sm overflow-hidden h-40 bg-gray-50">
                <div className="p-5 flex flex-col justify-between h-full">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32 bg-gray-200" />
                        <Skeleton className="h-6 w-48 bg-gray-200" />
                    </div>
                    <Skeleton className="h-10 w-full mt-2 bg-gray-200" />
                </div>
            </Card>

            {/* Secondary Block (Weekly Progress / Milestone) */}
            <div className="space-y-2">
                <Skeleton className="h-24 w-full rounded-xl" />
            </div>

            {/* Day Status / Workout Card */}
            <div className="space-y-3">
                <div className="flex justify-between px-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-24" />
                </div>
                <Card className="p-0 border-none shadow-sm h-32 overflow-hidden">
                    <Skeleton className="h-full w-full" />
                </Card>
            </div>

            {/* Grid Stats */}
            <div className="grid grid-cols-1 gap-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
            </div>
        </div>
    )
}
