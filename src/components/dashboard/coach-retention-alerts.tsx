'use client'

import { AlertTriangle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { CoachRetentionAlert } from '@/lib/actions/coach-home'

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
}

export function CoachRetentionAlerts({ alerts }: { alerts: CoachRetentionAlert[] }) {
    return (
        <section className="bg-white rounded-3xl border border-[#f3f4f6] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_2px_4px_-1px_rgba(0,0,0,0.02)] p-6 h-full">
            <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-[#ef4444]" />
                <h3 className="text-[18px] leading-7 font-semibold text-[#101019]">Alerta de Retención</h3>
            </div>

            <div className="space-y-3">
                {alerts.length === 0 && (
                    <div className="rounded-2xl border border-[#f3f4f6] p-4 text-sm text-[#8c929c]">
                        No hay alertas de retención activas.
                    </div>
                )}

                {alerts.map((item) => (
                    <div
                        key={item.id}
                        className="rounded-2xl border border-[#fee2e2] bg-[#fef2f2] px-3 py-3 flex items-center justify-between gap-3"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-8 w-8 shrink-0">
                                <AvatarImage src={item.avatarUrl || undefined} alt={item.clientName} />
                                <AvatarFallback className="text-xs font-semibold">{initials(item.clientName)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="text-[14px] leading-5 font-semibold text-[#101019] truncate">{item.clientName}</p>
                                <p className="text-[12px] leading-4 text-[#dc2626] truncate">{item.message}</p>
                            </div>
                        </div>
                        <a
                            href={item.phone ? `https://wa.me/${item.phone.replace(/\D/g, '')}?text=${encodeURIComponent(item.whatsappMessage)}` : `https://wa.me/?text=${encodeURIComponent(item.whatsappMessage)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[14px] leading-5 text-[#0e0e0e] font-medium whitespace-nowrap"
                        >
                            Enviar mensaje
                        </a>
                    </div>
                ))}
            </div>
        </section>
    )
}
