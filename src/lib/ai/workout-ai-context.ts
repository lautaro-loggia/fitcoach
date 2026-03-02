import { normalizeText } from '@/lib/utils'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
    AIWorkoutBriefDefaults,
    WorkoutEquipment,
    WorkoutObjective,
    WorkoutStyle,
} from '@/lib/ai/workout-ai-types'
import type { WorkoutCatalogExercise } from '@/lib/ai/workout-ai-parser'

type ClientContextInput = {
    supabase: SupabaseClient
    trainerId: string
    clientId: string
    objective: WorkoutObjective
    equipment: WorkoutEquipment[]
    maxCatalogItems?: number
}

type TemplateCatalogInput = {
    supabase: SupabaseClient
    objective: WorkoutObjective
    equipment: WorkoutEquipment[]
    maxCatalogItems?: number
}

const OBJECTIVE_KEYWORDS: Record<WorkoutObjective, string[]> = {
    strength: ['fuerza', 'power', 'compuesto', 'press', 'sentadilla', 'peso muerto'],
    hypertrophy: ['hipertrofia', 'musculo', 'volumen', 'aislado'],
    fat_loss: ['cardio', 'metabolico', 'circuito', 'intervalo'],
    performance: ['performance', 'potencia', 'agilidad', 'resistencia'],
    general: ['general', 'salud', 'full body', 'acondicionamiento'],
}

function objectiveScore(objective: WorkoutObjective, haystack: string): number {
    const keys = OBJECTIVE_KEYWORDS[objective]
    return keys.reduce((acc, keyword) => (haystack.includes(keyword) ? acc + 1 : acc), 0)
}

function equipmentMatchScore(equipment: WorkoutEquipment[], exerciseEquipment: string | null): number {
    if (equipment.length === 0) return 0
    const exerciseText = normalizeText(exerciseEquipment || '')
    if (!exerciseText) return 0

    const map: Record<WorkoutEquipment, string[]> = {
        bodyweight: ['body weight', 'peso corporal', 'sin equipamiento', 'none'],
        dumbbells: ['mancuerna', 'dumbbell'],
        barbell: ['barra', 'barbell'],
        machines: ['maquina', 'machine', 'cable'],
        bands: ['banda', 'band'],
        kettlebell: ['kettlebell'],
        other: [],
    }

    for (const item of equipment) {
        if (map[item].some((token) => exerciseText.includes(token))) {
            return 3
        }
    }

    return 0
}

function rankExercises(
    exercises: WorkoutCatalogExercise[],
    objective: WorkoutObjective,
    equipment: WorkoutEquipment[],
    maxCatalogItems: number,
) {
    return [...exercises]
        .map((exercise) => {
            const searchText = normalizeText(
                [exercise.name, exercise.muscle_group || '', exercise.target || '', exercise.equipment || ''].join(' ')
            )
            const score =
                objectiveScore(objective, searchText) +
                equipmentMatchScore(equipment, exercise.equipment) +
                (searchText.includes('cardio') && (objective === 'fat_loss' || objective === 'performance') ? 2 : 0)

            return { exercise, score }
        })
        .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name))
        .slice(0, maxCatalogItems)
        .map((item) => item.exercise)
}

function mapMainGoalToObjective(mainGoal?: string | null): WorkoutObjective {
    const normalized = normalizeText(mainGoal || '')
    if (!normalized) return 'general'
    if (normalized.includes('muscle') || normalized.includes('musculo') || normalized.includes('hipertrof')) return 'hypertrophy'
    if (normalized.includes('fat') || normalized.includes('grasa')) return 'fat_loss'
    if (normalized.includes('performance') || normalized.includes('rendimiento')) return 'performance'
    if (normalized.includes('strength') || normalized.includes('fuerza')) return 'strength'
    return 'general'
}

function inferStyle(sessionsPerWeek: number): WorkoutStyle {
    if (sessionsPerWeek <= 3) return 'full_body'
    if (sessionsPerWeek === 4) return 'upper_lower'
    return 'push_pull_legs'
}

function inferLevelFromHistory(workoutLogsCount: number): 'beginner' | 'intermediate' {
    if (workoutLogsCount >= 24) return 'intermediate'
    return 'beginner'
}

export async function getClientWorkoutGenerationDefaults(params: {
    supabase: SupabaseClient
    trainerId: string
    clientId: string
}): Promise<{ defaults: AIWorkoutBriefDefaults | null; error?: string }> {
    const { supabase, trainerId, clientId } = params

    const { data: client, error } = await supabase
        .from('clients')
        .select('id, main_goal, training_availability, training_frequency')
        .eq('id', clientId)
        .eq('trainer_id', trainerId)
        .maybeSingle<{
            id: string
            main_goal: string | null
            training_availability: { days_per_week?: number | null } | null
            training_frequency: number | null
        }>()

    if (error || !client) {
        return { defaults: null, error: 'No autorizado' }
    }

    const sessionsPerWeek = Number(client.training_availability?.days_per_week || client.training_frequency || 4)
    const clampedSessions = Number.isFinite(sessionsPerWeek)
        ? Math.max(1, Math.min(7, Math.round(sessionsPerWeek)))
        : 4

    const objective = mapMainGoalToObjective(client.main_goal)
    const defaults: AIWorkoutBriefDefaults = {
        objective,
        sessionsPerWeek: clampedSessions,
        minutesPerSession: 60,
        equipment: ['bodyweight', 'dumbbells'],
        level: 'intermediate',
        style: inferStyle(clampedSessions),
    }

    return { defaults }
}

export async function getClientWorkoutGenerationContext(input: ClientContextInput) {
    const { supabase, trainerId, clientId, objective, equipment } = input
    const maxCatalogItems = Math.max(50, Math.min(300, input.maxCatalogItems || 300))

    const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, full_name, main_goal, goal_text, activity_level, work_type, injuries, training_availability, training_frequency, target_weight, target_fat, current_weight')
        .eq('id', clientId)
        .eq('trainer_id', trainerId)
        .maybeSingle<{
            id: string
            full_name: string | null
            main_goal: string | null
            goal_text: string | null
            activity_level: string | null
            work_type: string | null
            injuries: unknown
            training_availability: unknown
            training_frequency: number | null
            target_weight: number | null
            target_fat: number | null
            current_weight: number | null
        }>()

    if (clientError || !client) {
        return { error: 'No autorizado' as const }
    }

    const { data: recentWorkoutLogs } = await supabase
        .from('workout_logs')
        .select('date, completed_at, feedback')
        .eq('client_id', clientId)
        .order('completed_at', { ascending: false })
        .limit(5)

    const { data: recentCheckins } = await supabase
        .from('checkins')
        .select('date, weight, body_fat, observations')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(3)

    const today = new Date().toISOString().slice(0, 10)
    const { data: activeAssignedWorkouts } = await supabase
        .from('assigned_workouts')
        .select('id, name, structure, scheduled_days, valid_until')
        .eq('client_id', clientId)
        .or(`valid_until.is.null,valid_until.gte.${today}`)
        .order('created_at', { ascending: false })
        .limit(10)

    const { data: exerciseCatalogRaw } = await supabase
        .from('exercises_v2')
        .select('id, name, muscle_group, equipment, target, gif_url, instructions')

    const catalog = (exerciseCatalogRaw || []) as WorkoutCatalogExercise[]
    const rankedCatalog = rankExercises(catalog, objective, equipment, maxCatalogItems)
    const inferredLevel = inferLevelFromHistory((recentWorkoutLogs || []).length)

    return {
        client,
        inferredLevel,
        recentWorkoutLogs: recentWorkoutLogs || [],
        recentCheckins: recentCheckins || [],
        activeAssignedWorkouts: activeAssignedWorkouts || [],
        exerciseCatalog: rankedCatalog,
    }
}

export async function getTemplateWorkoutGenerationCatalog(input: TemplateCatalogInput) {
    const maxCatalogItems = Math.max(50, Math.min(300, input.maxCatalogItems || 300))
    const { data: exerciseCatalogRaw } = await input.supabase
        .from('exercises_v2')
        .select('id, name, muscle_group, equipment, target, gif_url, instructions')

    const catalog = (exerciseCatalogRaw || []) as WorkoutCatalogExercise[]
    return rankExercises(catalog, input.objective, input.equipment, maxCatalogItems)
}
