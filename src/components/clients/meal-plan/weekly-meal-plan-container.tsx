'use client'

import { useState, useEffect, useMemo } from 'react'
import { getWeeklyPlan, createWeeklyPlan, updateReviewDate } from '@/app/(dashboard)/clients/[id]/meal-plan-actions'
import { Button } from '@/components/ui/button'
import { Loader2, Calendar, Utensils, Download } from 'lucide-react'
import { WeekStrip } from './week-strip'
import { DayView } from './day-view'
import { PlanWizard } from './plan-wizard'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
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

    const isPlanEmpty = plan && plan.days.every((d: any) => !d.meals || d.meals.length === 0)

    if (!plan || isPlanEmpty) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg space-y-4">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">No hay plan semanal activo</h3>
                    <p className="text-muted-foreground max-w-sm">Configura un plan semanal para organizar las comidas de tu asesorado día por día.</p>
                </div>
                <Button onClick={() => setWizardOpen(true)} className="cursor-pointer">Crear Plan Semanal</Button>
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
            {/* Removed internal header to use global page header */}


            {/* 2. Top Bar: Info & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                <DietaryCard client={client} />

                <div className="md:col-span-2">
                    <Card className="bg-white p-4 h-[96px] flex flex-col justify-center py-0">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-1">Calorías</span>
                                <span className="text-xl font-bold text-gray-900 leading-none">{targetKcal} <span className="text-xs font-normal text-gray-400">kcal</span></span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider leading-none mb-1">Proteínas</span>
                                <span className="text-xl font-bold text-gray-900 leading-none">{targetProt}g</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-yellow-600 font-bold uppercase tracking-wider leading-none mb-1">Carbohidratos</span>
                                <span className="text-xl font-bold text-gray-900 leading-none">{targetCarbs}g</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider leading-none mb-1">Grasas</span>
                                <span className="text-xl font-bold text-gray-900 leading-none">{targetFats}g</span>
                            </div>
                        </div>
                    </Card>
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
