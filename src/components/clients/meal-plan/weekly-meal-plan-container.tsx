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
import { DietaryCard } from '../cards/dietary-card'

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

            {/* 2. Top Bar: Info & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DietaryCard client={client} />

                <div className="md:col-span-2 flex flex-col justify-center h-full">
                    <div className="bg-white rounded-xl border p-4 h-full flex flex-col justify-center">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            Objetivos Diarios
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Calorías</span>
                                <span className="text-2xl font-bold text-gray-900">{targetKcal} <span className="text-sm font-normal text-gray-500">kcal</span></span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-blue-600 font-medium uppercase tracking-wider mb-1">Proteínas</span>
                                <span className="text-2xl font-bold text-gray-900">{targetProt}g</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-yellow-600 font-medium uppercase tracking-wider mb-1">Carbohidratos</span>
                                <span className="text-2xl font-bold text-gray-900">{targetCarbs}g</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-red-600 font-medium uppercase tracking-wider mb-1">Grasas</span>
                                <span className="text-2xl font-bold text-gray-900">{targetFats}g</span>
                            </div>
                        </div>
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
