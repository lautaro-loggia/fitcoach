'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowDown, Minus } from 'lucide-react'

interface HistoryCheckin {
    id: string
    date: string
    weight: number
    created_at?: string
}

interface RecentHistoryListProps {
    checkins: HistoryCheckin[]
}

export function RecentHistoryList({ checkins }: RecentHistoryListProps) {
    // Only show top 3
    const recent = checkins.slice(0, 3)

    return (
        <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Historial Reciente</h3>
            <div className="bg-white rounded-[24px] px-6 py-2 shadow-none border border-gray-200">
                {recent.map((checkin, idx) => {
                    // Calculate change from previous checkin in the full list (which is next index)
                    const prevCheckin = checkins[idx + 1]
                    let change = null
                    if (prevCheckin && prevCheckin.weight && checkin.weight) {
                        change = (checkin.weight - prevCheckin.weight).toFixed(1)
                    }

                    // Format date: "OCT 24" -> "MMM (vertical) dd"
                    let dateObj = new Date()
                    try {
                        dateObj = new Date(checkin.date) // Date format is likely YYYY-MM-DD
                    } catch (e) { }

                    const month = format(dateObj, 'MMM', { locale: es }).toUpperCase().replace('.', '')
                    const day = format(dateObj, 'd')
                    const time = checkin.created_at ? format(new Date(checkin.created_at), 'hh:mm a') : '09:00 AM' // Default or fetch real time if available

                    return (
                        <div key={checkin.id} className="flex items-center py-4 border-b border-gray-100 last:border-0">
                            {/* Date Column */}
                            <div className="flex flex-col items-center justify-center w-10 mr-4 text-gray-900 leading-tight">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">{month}</span>
                                <span className="text-lg font-bold">{day}</span>
                            </div>

                            {/* Weight & Time */}
                            <div className="flex flex-col">
                                <span className="text-base font-bold text-gray-900">{checkin.weight} kg</span>
                                <span className="text-[10px] text-gray-300 font-medium uppercase tracking-wide">{time}</span>
                            </div>

                            {/* Change Indicator */}
                            <div className="ml-auto">
                                {change ? (
                                    <div className={`flex items-center gap-1 font-bold text-sm ${Number(change) < 0 ? 'text-green-500' : 'text-amber-500'}`}>
                                        {Number(change) > 0 ? '+' : ''}{change}
                                        {Number(change) < 0 ? <ArrowDown className="h-3 w-3" /> : null}
                                    </div>
                                ) : (
                                    <span className="text-gray-300 font-bold">--</span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>


        </div>
    )
}
