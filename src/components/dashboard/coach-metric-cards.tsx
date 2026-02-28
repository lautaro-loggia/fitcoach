import type { ComponentType } from 'react'
import { AlertCircle, CheckCircle2, Clock3, Activity } from 'lucide-react'
import type { CoachMetricCard } from '@/lib/actions/coach-home'

const iconByMetricKey: Record<string, ComponentType<{ className?: string }>> = {
    active_clients: Activity,
    pending_payments: AlertCircle,
    pending_checkins: Clock3,
    presential_trainings: CheckCircle2
}

export function CoachMetricCards({ metrics }: { metrics: CoachMetricCard[] }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {metrics.map((metric) => {
                const Icon = iconByMetricKey[metric.key] || Activity
                return (
                    <article
                        key={metric.key}
                        className="bg-white border border-[#f3f4f6] rounded-3xl px-6 py-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_2px_4px_-1px_rgba(0,0,0,0.02)]"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[14px] leading-5 font-medium text-[#8c929c]">{metric.title}</h4>
                            <Icon className="h-4 w-4 text-[#8c929c]" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-[40px] leading-[40px] font-bold text-[#101019]">{metric.value}</p>
                            <p
                                className={
                                    metric.trendTone === 'success'
                                        ? 'text-[12px] leading-4 font-medium text-[#22c55e]'
                                        : metric.trendTone === 'warning'
                                            ? 'text-[12px] leading-4 font-medium text-[#eab308]'
                                            : 'text-[12px] leading-4 font-medium text-[#57578e]'
                                }
                            >
                                {metric.trendText}
                            </p>
                        </div>
                    </article>
                )
            })}
        </div>
    )
}
