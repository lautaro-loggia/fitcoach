'use client'

import { useState, useEffect, useMemo } from 'react'
import { getWeeklyPlan, createWeeklyPlan, updateReviewDate } from '@/app/(dashboard)/clients/[id]/meal-plan-actions'
import { Button } from '@/components/ui/button'
import { Loader2, Calendar, Utensils, Download } from 'lucide-react'
import { WeekStrip } from './week-strip'
import { DayView } from './day-view'
import { PlanWizard } from './plan-wizard'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { generateWeeklyPlanPDF } from './pdf-generator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface WeeklyMealPlanContainerProps {
    client: any
}

export function WeeklyMealPlanContainer({ client }: WeeklyMealPlanContainerProps) {
    const [loading, setLoading] = useState(true)
    const [plan, setPlan] = useState<any>(null)
    const [selectedDay, setSelectedDay] = useState<number>(1) // 1 = Monday
    const [wizardOpen, setWizardOpen] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)

    useEffect(() => {
        fetchPlan()
    }, [client.id, refreshKey])

    const fetchPlan = async () => {
        setLoading(true)
        try {
            const { plan } = await getWeeklyPlan(client.id)
            setPlan(plan)
        } catch (error) {
            console.error("Error fetching plan", error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreatePlan = async (config: string[]) => {
        try {
            const result = await createWeeklyPlan(client.id, config)
            if (result.error) {
                alert(result.error)
                return
            }
            setWizardOpen(false)
            setRefreshKey(prev => prev + 1)
        } catch (error) {
            alert('Error inesperado al crear el plan')
        }
    }

    const handleUpdateReviewDate = async (date: Date | undefined) => {
        if (!plan) return
        const dateStr = date ? format(date, 'yyyy-MM-dd') : null
        await updateReviewDate(plan.id, client.id, dateStr)
        setPlan({ ...plan, review_date: dateStr })
    }

    const handleDownloadPDF = () => {
        if (!plan) return
        generateWeeklyPlanPDF(plan, client.full_name)
    }

    // Daily Stats Calculation
    const dailyStats = useMemo(() => {
        if (!plan) return null
        const currentDay = plan.days.find((d: any) => d.day_of_week === selectedDay)
        if (!currentDay) return null

        let totalKcal = 0
        let totalProt = 0
        let totalCarbs = 0
        let totalFats = 0
        let hasItems = false

        currentDay.meals.forEach((meal: any) => {
            if (meal.is_skipped) return
            meal.items.forEach((item: any) => {
                hasItems = true
                if (item.recipe) {
                    const serving = item.portions || 1
                    totalKcal += (item.recipe.kcal_per_serving || item.recipe.macros_calories || 0) * serving
                    totalProt += (item.recipe.protein_g_per_serving || item.recipe.macros_protein_g || 0) * serving
                    totalCarbs += (item.recipe.carbs_g_per_serving || item.recipe.macros_carbs_g || 0) * serving
                    totalFats += (item.recipe.fat_g_per_serving || item.recipe.macros_fat_g || 0) * serving
                }
            })
        })

        return {
            kcal: Math.round(totalKcal),
            prot: Math.round(totalProt),
            carbs: Math.round(totalCarbs),
            fats: Math.round(totalFats),
            hasItems
        }
    }, [plan, selectedDay])

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

    if (!plan) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg space-y-4">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">No hay plan semanal activo</h3>
                    <p className="text-muted-foreground max-w-sm">Configura un plan semanal para organizar las comidas de tu asesorado día por día.</p>
                </div>
                <Button onClick={() => setWizardOpen(true)}>Crear Plan Semanal</Button>
                <PlanWizard open={wizardOpen} onOpenChange={setWizardOpen} onConfirm={handleCreatePlan} />
            </div>
        )
    }

    const currentDayData = plan.days.find((d: any) => d.day_of_week === selectedDay)

    // UI Helpers
    const preferenceLabel = client.dietary_preference?.replace(/_/g, ' ') || "Sin restricción"
    const allergens = client.allergens || []

    const targetKcal = client.target_calories || 0
    const targetProt = client.target_protein || 0
    const targetCarbs = client.target_carbs || 0
    const targetFats = client.target_fats || 0

    return (
        <div className="space-y-6">
            {/* 1. Header & Actions */}
            <div className="flex justify-between items-end border-b pb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="-ml-3 h-8 w-8 hidden md:flex">
                            <span className="text-xl">‹</span> {/* Back arrow placeholder if navigation needed */}
                        </Button>
                        <h1 className="text-2xl font-bold tracking-tight">Plan nutricional</h1>
                    </div>
                    <p className="text-muted-foreground text-sm ml-0 md:ml-7">Gestiona el plan semanal de tus asesorados</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Secondary Actions: PDF & Revision - Kept minimal as per new design focus, possibly moved to 'Ajustes' tab in real mockup but keeping here for functionality */}
                    <div className="flex items-center gap-1 text-sm bg-muted/50 p-1 rounded-md">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground" onClick={handleDownloadPDF}>PDF</Button>
                        <div className="w-px h-3 bg-border"></div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground">
                                    {plan.review_date ? format(new Date(plan.review_date), 'dd MMM', { locale: es }) : "Revisión"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end"><CalendarComponent mode="single" selected={plan.review_date ? new Date(plan.review_date) : undefined} onSelect={handleUpdateReviewDate} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>

            {/* 2. Top Bar: Restrictions & Goals */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Restrictions */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-foreground/80">
                    <span className="text-muted-foreground">Dieta:</span>
                    <Badge variant="outline" className="font-normal bg-background px-3 py-1 text-foreground gap-2">
                        <Utensils className="h-3 w-3 text-muted-foreground" />
                        {preferenceLabel}
                    </Badge>

                    <span className="text-muted-foreground ml-2">| Alergenos:</span>
                    {allergens.length > 0 ? (
                        allergens.map((a: string) => (
                            <Badge key={a} variant="outline" className="font-normal bg-background text-foreground capitalize">
                                🚫 {a}
                            </Badge>
                        ))
                    ) : (
                        <span className="text-muted-foreground text-xs italic">Ninguno</span>
                    )}
                </div>

                {/* Right: Goals (Read Only / Quick View) */}
                <div className="flex items-center gap-2 text-sm">
                    <div className="px-3 py-1 rounded bg-muted/30 border border-border">
                        <span className="text-muted-foreground mr-1">Kcal</span>
                        <span className="font-bold">{targetKcal}</span>
                    </div>

                    <div className="px-3 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <span className="mr-1 opacity-70">Prot</span>
                        <span className="font-bold">{targetProt}</span>
                    </div>

                    <div className="px-3 py-1 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800">
                        <span className="mr-1 opacity-70">Carbs</span>
                        <span className="font-bold">{targetCarbs}</span>
                    </div>

                    <div className="px-3 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                        <span className="mr-1 opacity-70">Grasas</span>
                        <span className="font-bold">{targetFats}</span>
                    </div>
                </div>
            </div>

            {/* 3. Week Strip */}
            <WeekStrip
                days={plan.days}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
            />

            {/* 4. Day View with Inline Stats */}
            <DayView
                day={currentDayData}
                allDays={plan.days}
                clientId={client.id}
                clientAllergens={client.allergens}
                clientPreference={client.dietary_preference}
                onUpdate={() => setRefreshKey(prev => prev + 1)}
                dailyStats={dailyStats ? {
                    ...dailyStats,
                    targets: { kcal: targetKcal, prot: targetProt, carbs: targetCarbs, fats: targetFats }
                } : undefined}
            />
        </div>
    )
}
