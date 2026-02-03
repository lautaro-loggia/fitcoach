'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, Download } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getWeeklyPlan, updateReviewDate } from '@/app/(dashboard)/clients/[id]/meal-plan-actions'
import { generateWeeklyPlanPDF } from './meal-plan/pdf-generator'
import { MealHistoryDialog } from './meal-history-dialog'

interface MealPlanActionsWrapperProps {
    clientId: string
    clientName: string
}

export function MealPlanActionsWrapper({ clientId, clientName }: MealPlanActionsWrapperProps) {
    const [plan, setPlan] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchPlan()
    }, [clientId])

    // Listen for refresh events
    useEffect(() => {
        const handleRefresh = () => fetchPlan()
        window.addEventListener('refresh-meal-plan', handleRefresh)
        return () => window.removeEventListener('refresh-meal-plan', handleRefresh)
    }, [clientId])

    const fetchPlan = async () => {
        try {
            const { plan: fetchedPlan } = await getWeeklyPlan(clientId)
            setPlan(fetchedPlan)
        } catch (error) {
            console.error("Error fetching plan", error)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateReviewDate = async (date: Date | undefined) => {
        if (!plan) return
        const dateStr = date ? format(date, 'yyyy-MM-dd') : null
        await updateReviewDate(plan.id, clientId, dateStr)
        setPlan({ ...plan, review_date: dateStr })
        // Dispatch event so the container can refresh if needed (though it usually doesn't need to for review_date)
        window.dispatchEvent(new CustomEvent('refresh-meal-plan'))
    }

    const handleDownloadPDF = () => {
        if (!plan) return
        generateWeeklyPlanPDF(plan, clientName)
    }

    const buttonClass = "h-10 px-4 rounded-xl border-gray-200 bg-white text-gray-900 font-bold text-xs gap-2 shadow-sm"

    return (
        <div className="flex items-center gap-3">
            <MealHistoryDialog clientId={clientId} />

            <Button
                variant="outline"
                size="sm"
                className={buttonClass}
                onClick={handleDownloadPDF}
                disabled={!plan}
            >
                <Download className="h-4 w-4" /> PDF
            </Button>

            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={buttonClass}
                        disabled={!plan}
                    >
                        <Calendar className="h-4 w-4" />
                        {plan?.review_date ? format(new Date(plan.review_date), "d MMM", { locale: es }) : "Revisión"}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent
                        mode="single"
                        selected={plan?.review_date ? new Date(plan.review_date) : undefined}
                        onSelect={handleUpdateReviewDate}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
