'use client'

import { IncomeChart } from '@/components/dashboard/income-chart'
import type { IncomeData } from '@/app/(dashboard)/pagos/actions'

interface StatsTabProps {
    history: IncomeData[]
}

export function StatsTab({ history }: StatsTabProps) {
    return (
        <div className="space-y-6">
            <IncomeChart initialData={history} />
        </div>
    )
}
