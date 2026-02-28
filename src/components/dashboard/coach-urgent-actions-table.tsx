'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { CoachUrgentAction } from '@/lib/actions/coach-home'

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((item) => item[0]?.toUpperCase())
        .join('')
}

export function CoachUrgentActionsTable({ actions }: { actions: CoachUrgentAction[] }) {
    return (
        <section className="bg-white rounded-3xl border border-[#f3f4f6] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_2px_4px_-1px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#f1f1f2] flex items-center justify-between">
                <h3 className="text-[18px] leading-7 font-semibold text-[#101019]">
                    Acciones Urgentes
                </h3>
                <span className="text-sm font-semibold text-[#101019]">Ver todo</span>
            </div>

            <div className="hidden md:grid grid-cols-[1.3fr_0.9fr_1.4fr_0.7fr] px-5 py-2 text-[12px] leading-4 font-medium tracking-[0.04em] text-[#8c929c] uppercase bg-[#fafafa]">
                <span>Cliente</span>
                <span>Estado</span>
                <span>Detalles</span>
                <span className="text-right">Acción</span>
            </div>

            <div className="divide-y divide-[#f1f1f2]">
                {actions.length === 0 && (
                    <div className="px-5 py-8 text-sm text-[#8c929c]">No hay acciones urgentes por ahora.</div>
                )}

                {actions.map((item) => (
                    <div
                        key={item.id}
                        className="px-5 py-3 grid grid-cols-1 md:grid-cols-[1.3fr_0.9fr_1.4fr_0.7fr] gap-2 md:gap-3 items-center"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-8 w-8 shrink-0">
                                <AvatarImage src={item.avatarUrl || undefined} alt={item.clientName} />
                                <AvatarFallback className="text-xs font-semibold">{initials(item.clientName)}</AvatarFallback>
                            </Avatar>
                            <span className="text-[14px] leading-5 font-medium text-[#101019] truncate">
                                {item.clientName}
                            </span>
                        </div>

                        <div>
                            <Badge
                                className={
                                    item.statusTone === 'danger'
                                        ? 'bg-[#fee2e2] text-[#dc2626] border-[#fecaca] hover:bg-[#fee2e2]'
                                        : 'bg-[#fef3c7] text-[#a16207] border-[#fde68a] hover:bg-[#fef3c7]'
                                }
                            >
                                {item.statusLabel}
                            </Badge>
                        </div>

                        <p className="text-[14px] leading-5 text-[#57578e] truncate">{item.details}</p>

                        <div className="md:text-right">
                            {item.actionLabel === 'Recordar' ? (
                                <a
                                    href={item.phone ? `https://wa.me/${item.phone.replace(/\D/g, '')}?text=${encodeURIComponent(item.whatsappMessage)}` : `https://wa.me/?text=${encodeURIComponent(item.whatsappMessage)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[14px] leading-5 font-medium text-[#4139cf] hover:text-[#2f2ab4]"
                                >
                                    Recordar
                                </a>
                            ) : (
                                <Link
                                    href={item.actionHref}
                                    className="text-[14px] leading-5 font-medium text-[#4139cf] hover:text-[#2f2ab4]"
                                >
                                    Revisar
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}
