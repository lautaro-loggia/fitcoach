'use client'

import { WeeklyMealPlanContainer } from '../meal-plan/weekly-meal-plan-container'

export function DietTab({ client }: { client: any }) {
    // DietTab now delegates entirely to WeeklyMealPlanContainer for the new hierarchy
    return (
        <WeeklyMealPlanContainer client={client} />
    )
}
