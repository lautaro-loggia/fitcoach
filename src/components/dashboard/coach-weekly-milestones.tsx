import { Trophy, Dumbbell, Sparkles } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { CoachWeeklyMilestone } from '@/lib/actions/coach-home'

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
}

function MilestoneIcon({ tone }: { tone: CoachWeeklyMilestone['iconTone'] }) {
    if (tone === 'yellow') {
        return (
            <div className="h-8 w-8 rounded-full bg-[#fef3c7] text-[#a16207] flex items-center justify-center shrink-0">
                <Dumbbell className="h-4 w-4" />
            </div>
        )
    }
    if (tone === 'green') {
        return (
            <div className="h-8 w-8 rounded-full bg-[#dcfce7] text-[#166534] flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4" />
            </div>
        )
    }
    return (
        <div className="h-8 w-8 rounded-full bg-[#dbeafe] text-[#1d4ed8] flex items-center justify-center shrink-0">
            <Trophy className="h-4 w-4" />
        </div>
    )
}

export function CoachWeeklyMilestones({ milestones }: { milestones: CoachWeeklyMilestone[] }) {
    return (
        <section className="bg-white rounded-3xl border border-[#f3f4f6] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_2px_4px_-1px_rgba(0,0,0,0.02)] p-6 h-full">
            <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-[#eab308]" />
                <h3 className="text-[18px] leading-7 font-semibold text-[#101019]">Hitos de la Semana</h3>
            </div>

            <div className="space-y-3">
                {milestones.length === 0 && (
                    <div className="rounded-2xl border border-[#f3f4f6] p-4 text-sm text-[#8c929c]">
                        Sin hitos destacados esta semana.
                    </div>
                )}

                {milestones.map((item) => (
                    <div key={item.id} className="rounded-2xl px-3 py-3 flex items-start gap-3">
                        <MilestoneIcon tone={item.iconTone} />
                        <div className="flex items-start gap-3 min-w-0">
                            <Avatar className="h-8 w-8 shrink-0">
                                <AvatarImage src={item.avatarUrl || undefined} alt={item.clientName} />
                                <AvatarFallback className="text-xs font-semibold">{initials(item.clientName)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="text-[14px] leading-5 font-bold text-[#101019] truncate">{item.clientName}</p>
                                <p className="text-[14px] leading-5 text-[#57578e]">{item.text}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}
