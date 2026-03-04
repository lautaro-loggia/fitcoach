'use server'

import { createClient } from '@/lib/supabase/server'

export interface OnboardingStatus {
    hasClients: boolean
    hasWorkouts: boolean
    hasRecipes: boolean
    hasPayments: boolean
    hasAssignedWorkouts: boolean
    hasAssignedDiets: boolean
    hasAppUsage: boolean
    isEstablishedCoach: boolean
    hasAnyActivity: boolean
}

export async function getCoachOnboardingStatus(): Promise<OnboardingStatus> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return {
            hasClients: false,
            hasWorkouts: false,
            hasRecipes: false,
            hasPayments: false,
            hasAssignedWorkouts: false,
            hasAssignedDiets: false,
            hasAppUsage: false,
            isEstablishedCoach: false,
            hasAnyActivity: false,
        }
    }

    // Ejecutamos las consultas en paralelo para mejor performance
    const [
        clientsResult,
        workoutsResult,
        recipesResult,
        paymentsResult,
        assignedWorkoutsResult,
        assignedDietsResult,
    ] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('trainer_id', user.id),
        supabase.from('workouts').select('id', { count: 'exact', head: true }).eq('trainer_id', user.id),
        supabase.from('recipes').select('id', { count: 'exact', head: true }).eq('trainer_id', user.id),
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('trainer_id', user.id),
        supabase.from('assigned_workouts').select('id', { count: 'exact', head: true }).eq('trainer_id', user.id),
        supabase.from('assigned_diets').select('id', { count: 'exact', head: true }).eq('trainer_id', user.id),
    ])

    const hasClients = (clientsResult.count || 0) > 0
    const hasWorkouts = (workoutsResult.count || 0) > 0
    const hasRecipes = (recipesResult.count || 0) > 0
    const hasPayments = (paymentsResult.count || 0) > 0
    const hasAssignedWorkouts = (assignedWorkoutsResult.count || 0) > 0
    const hasAssignedDiets = (assignedDietsResult.count || 0) > 0
    const hasAppUsage =
        hasWorkouts ||
        hasRecipes ||
        hasPayments ||
        hasAssignedWorkouts ||
        hasAssignedDiets
    const isEstablishedCoach = hasClients && hasAppUsage

    return {
        hasClients,
        hasWorkouts,
        hasRecipes,
        hasPayments,
        hasAssignedWorkouts,
        hasAssignedDiets,
        hasAppUsage,
        isEstablishedCoach,
        hasAnyActivity: hasClients || hasAppUsage,
    }
}
