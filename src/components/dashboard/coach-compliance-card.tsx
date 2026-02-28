import type { CoachComplianceData } from '@/lib/actions/coach-home'

function Gauge({ percentage }: { percentage: number }) {
    const normalized = Math.max(0, Math.min(100, percentage))
    const visibleArc = 0.82 // leave a visual gap like figma ring
    const circumference = 2 * Math.PI * 72
    const arcLength = circumference * visibleArc
    const progressLength = arcLength * (normalized / 100)

    return (
        <div className="relative h-[192px] w-full flex items-center justify-center">
            <svg width="220" height="220" viewBox="0 0 220 220" className="-rotate-[135deg]">
                <circle
                    cx="110"
                    cy="110"
                    r="72"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${arcLength} ${circumference}`}
                />
                <circle
                    cx="110"
                    cy="110"
                    r="72"
                    fill="none"
                    stroke="#6d5cf6"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${progressLength} ${circumference}`}
                />
            </svg>
            <div className="absolute text-center">
                <p className="text-[20px] leading-none text-[#0e0e0e] mb-2">Semanal</p>
                <p className="text-[48px] leading-none font-semibold text-[#0e0e0e]">{normalized}%</p>
            </div>
        </div>
    )
}

export function CoachComplianceCard({ compliance }: { compliance: CoachComplianceData }) {
    return (
        <section className="bg-white rounded-3xl border border-[#f3f4f6] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_2px_4px_-1px_rgba(0,0,0,0.02)] p-6 h-full">
            <h3 className="text-[18px] leading-7 font-semibold text-[#101019]">Cumplimiento Global</h3>
            <Gauge percentage={compliance.percentage} />

            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#7b5cfa]" />
                    <span className="text-[14px] leading-5 text-[#57578e]">Completado</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#e5e7eb]" />
                    <span className="text-[14px] leading-5 text-[#57578e]">Restante</span>
                </div>
            </div>

            <div className="rounded-2xl bg-[#f8f8fb] p-3">
                <p className="text-xs text-[#57578e]">
                    Engagement semanal: <span className="font-semibold text-[#101019]">{compliance.engagementWeeklyPercent}%</span>
                    {' '}({compliance.engagementActiveClients}/{compliance.engagementTotalClients} asesorados activos)
                </p>
            </div>
        </section>
    )
}
