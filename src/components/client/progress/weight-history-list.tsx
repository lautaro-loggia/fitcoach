'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Calendar, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckinDetailModal } from './checkin-detail-modal'
import { Badge } from '@/components/ui/badge'

interface WeightHistoryListProps {
    checkins: any[]
    initialCheckinId?: string
}

export function WeightHistoryList({ checkins, initialCheckinId }: WeightHistoryListProps) {
    const [selectedCheckin, setSelectedCheckin] = useState<any>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const handleOpenDetail = (checkin: any) => {
        setSelectedCheckin(checkin)
        setIsModalOpen(true)
    }

    useEffect(() => {
        if (initialCheckinId) {
            const match = checkins.find(c => c.id === initialCheckinId)
            if (match) {
                handleOpenDetail(match)
            }
        }
    }, [initialCheckinId, checkins])

    return (
        <>
            <div className="space-y-3">
                {checkins.map((checkin, idx) => {
                    const hasUnseenNote = checkin.status === 'commented' && !checkin.coach_note_seen_at

                    return (
                        <div
                            key={idx}
                            onClick={() => handleOpenDetail(checkin)}
                            className="flex items-center justify-between text-sm py-3 px-4 rounded-xl border border-gray-100 bg-white active:bg-gray-50 transition-colors shadow-sm cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`h-2 w-2 rounded-full ${hasUnseenNote ? 'bg-primary animate-pulse' : 'bg-transparent'}`} />
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span className="font-medium">{format(new Date(checkin.date), 'd MMM yyyy', { locale: es })}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {checkin.status === 'commented' && (
                                    <Badge variant="secondary" className={`text-[9px] h-4 py-0 px-1.5 ${hasUnseenNote ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                                        {hasUnseenNote ? 'Nuevo feedback' : 'Revisado'}
                                    </Badge>
                                )}
                                <span className="font-mono font-bold text-gray-900">{checkin.weight} kg</span>
                                <ChevronRight className="h-4 w-4 text-gray-300" />
                            </div>
                        </div>
                    )
                })}
                {checkins.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-xl border border-dashed">
                        Sin registros aún.
                    </p>
                )}
            </div>

            <CheckinDetailModal
                checkin={selectedCheckin}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
            />
        </>
    )
}
