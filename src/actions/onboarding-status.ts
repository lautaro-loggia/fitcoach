'use server'

import { createClient } from '@/lib/supabase/server'

export interface OnboardingStatus {
    hasClients: boolean
    hasWorkouts: boolean
    hasRecipes: boolean
}

export async function getCoachOnboardingStatus(): Promise<OnboardingStatus> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return {
            hasClients: false,
            hasWorkouts: false,
            hasRecipes: false,
        }
    }

    // Ejecutamos las consultas en paralelo para mejor performance
    const [clientsResult, workoutsResult, recipesResult] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('trainer_id', user.id),
        supabase.from('workouts').select('id', { count: 'exact', head: true }).eq('trainer_id', user.id),
        supabase.from('recipes').select('id', { count: 'exact', head: true }).eq('trainer_id', user.id),
    ])

    return {
        hasClients: (clientsResult.count || 0) > 0,
        hasWorkouts: (workoutsResult.count || 0) > 0,
        hasRecipes: (recipesResult.count || 0) > 0,
    }
}
