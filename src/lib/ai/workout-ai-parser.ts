import { addDaysToDateString, getTodayString, normalizeText } from '@/lib/utils'
import type {
    AIGeneratedWorkoutDraft,
    WorkoutCardioConfigDraft,
    WorkoutExerciseDraft,
} from '@/lib/ai/workout-ai-types'

export type WorkoutCatalogExercise = {
    id: string
    name: string
    muscle_group: string | null
    equipment: string | null
    target: string | null
    gif_url: string | null
    instructions: string[] | null
}

type ParseWorkoutDraftOptions = {
    fallbackSessionsPerWeek?: number
    minimumExercises?: number
}

type ParseWorkoutDraftResult = {
    draft?: AIGeneratedWorkoutDraft
    warnings: string[]
    error?: string
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

const DAY_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const DAY_ALIASES: Record<string, string> = {
    lunes: 'Lunes',
    monday: 'Lunes',
    martes: 'Martes',
    tuesday: 'Martes',
    miercoles: 'Miércoles',
    miércoles: 'Miércoles',
    wednesday: 'Miércoles',
    jueves: 'Jueves',
    thursday: 'Jueves',
    viernes: 'Viernes',
    friday: 'Viernes',
    sabado: 'Sábado',
    sábado: 'Sábado',
    saturday: 'Sábado',
    domingo: 'Domingo',
    sunday: 'Domingo',
}

function asString(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
    const n = Number(value)
    if (!Number.isFinite(n)) return fallback
    return Math.max(min, Math.min(max, Math.round(n)))
}

function clampFloat(value: unknown, min: number, max: number, fallback: number): number {
    const n = Number(value)
    if (!Number.isFinite(n)) return fallback
    return Math.max(min, Math.min(max, n))
}

function normalizeDay(day: unknown): string | null {
    const dayText = asString(day)
    if (!dayText) return null
    const normalized = normalizeText(dayText)
    return DAY_ALIASES[normalized] || null
}

function normalizeDate(value: unknown): string {
    const dateText = asString(value)
    if (dateText && DATE_REGEX.test(dateText)) return dateText
    return addDaysToDateString(getTodayString(), 28)
}

export function resolveScheduledDaysFromFrequency(daysPerWeek: number): string[] {
    const safe = clampInt(daysPerWeek, 1, 7, 4)
    if (safe === 1) return ['Lunes']
    if (safe === 2) return ['Lunes', 'Jueves']
    if (safe === 3) return ['Lunes', 'Miércoles', 'Viernes']
    if (safe === 4) return ['Lunes', 'Martes', 'Jueves', 'Viernes']
    if (safe === 5) return ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
    if (safe === 6) return ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    return [...DAY_ORDER]
}

function normalizeScheduledDays(value: unknown, fallbackSessionsPerWeek: number): string[] {
    if (!Array.isArray(value)) {
        return resolveScheduledDaysFromFrequency(fallbackSessionsPerWeek)
    }

    const seen = new Set<string>()
    const parsedDays: string[] = []

    for (const rawDay of value) {
        const normalized = normalizeDay(rawDay)
        if (!normalized || seen.has(normalized)) continue
        seen.add(normalized)
        parsedDays.push(normalized)
    }

    if (parsedDays.length === 0) {
        return resolveScheduledDaysFromFrequency(fallbackSessionsPerWeek)
    }

    return [...parsedDays].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
}

function normalizeInstructions(value: unknown, fallback: string[] | null): string[] | undefined {
    if (Array.isArray(value)) {
        const parsed = value
            .map((item) => asString(item))
            .filter((item): item is string => Boolean(item))
            .slice(0, 6)
        if (parsed.length > 0) return parsed
    }

    if (Array.isArray(fallback) && fallback.length > 0) {
        return fallback.slice(0, 6)
    }

    return undefined
}

function toSetDetail(rawSet: unknown): { reps: string; weight: string; rest: string } {
    const raw = (rawSet && typeof rawSet === 'object') ? (rawSet as Record<string, unknown>) : {}
    const reps = clampInt(raw.reps, 1, 50, 10)
    const weight = clampFloat(raw.weight, 0, 500, 0)
    const rest = clampInt(raw.rest, 15, 600, 60)

    return {
        reps: String(reps),
        weight: String(Number(weight.toFixed(1))),
        rest: String(rest),
    }
}

function resolveExercise(
    rawExercise: Record<string, unknown>,
    byId: Map<string, WorkoutCatalogExercise>,
    byNameExact: Map<string, WorkoutCatalogExercise>,
    byNameIncludes: WorkoutCatalogExercise[],
): WorkoutCatalogExercise | null {
    const exerciseId = asString(rawExercise.exercise_id)
    if (exerciseId) {
        const byExactId = byId.get(exerciseId)
        if (byExactId) return byExactId
    }

    const exerciseName = asString(rawExercise.name)
    if (!exerciseName) return null

    const normalizedName = normalizeText(exerciseName)
    const byExactName = byNameExact.get(normalizedName)
    if (byExactName) return byExactName

    const byPartial = byNameIncludes.find((exercise) => normalizeText(exercise.name).includes(normalizedName))
    return byPartial || null
}

function normalizeCardioConfig(raw: Record<string, unknown>): WorkoutCardioConfigDraft {
    const rawConfig = (raw.cardio_config && typeof raw.cardio_config === 'object')
        ? (raw.cardio_config as Record<string, unknown>)
        : {}

    const rawType = asString(rawConfig.type)
    const type = rawType === 'intervals' ? 'intervals' : 'continuous'
    const rawIntensity = asString(rawConfig.intensity)
    const intensity = rawIntensity === 'low' || rawIntensity === 'medium' || rawIntensity === 'high' || rawIntensity === 'hiit'
        ? rawIntensity
        : 'medium'

    if (type === 'intervals') {
        return {
            type,
            intensity,
            work_time: clampInt(rawConfig.work_time, 10, 300, 30),
            rest_time: clampInt(rawConfig.rest_time, 10, 300, 60),
            rounds: clampInt(rawConfig.rounds, 1, 30, 10),
        }
    }

    return {
        type,
        intensity,
        duration: clampInt(rawConfig.duration, 5, 180, 30),
    }
}

export function parseAIGeneratedWorkoutDraft(
    payload: unknown,
    catalog: WorkoutCatalogExercise[],
    options: ParseWorkoutDraftOptions = {},
): ParseWorkoutDraftResult {
    if (!payload || typeof payload !== 'object') {
        return { warnings: [], error: 'Respuesta inválida de IA (payload no es objeto).' }
    }

    const raw = payload as Record<string, unknown>
    const minimumExercises = clampInt(options.minimumExercises, 1, 10, 3)
    const fallbackSessionsPerWeek = clampInt(options.fallbackSessionsPerWeek, 1, 7, 4)

    const byId = new Map<string, WorkoutCatalogExercise>()
    const byNameExact = new Map<string, WorkoutCatalogExercise>()

    for (const exercise of catalog) {
        byId.set(exercise.id, exercise)
        byNameExact.set(normalizeText(exercise.name), exercise)
    }

    const warnings: string[] = []
    const byNameIncludes = [...catalog]
    const exercisesPayload = Array.isArray(raw.exercises) ? raw.exercises : []
    const exercises: WorkoutExerciseDraft[] = []

    for (const entry of exercisesPayload) {
        if (!entry || typeof entry !== 'object') continue
        const rawExercise = entry as Record<string, unknown>

        const resolved = resolveExercise(rawExercise, byId, byNameExact, byNameIncludes)
        if (!resolved) {
            const unresolvedName = asString(rawExercise.name) || asString(rawExercise.exercise_id) || 'ejercicio sin identificar'
            warnings.push(`Se omitió "${unresolvedName}" porque no existe en la base de ejercicios.`)
            continue
        }

        const rawCategory = asString(rawExercise.category)
        const inferredCategory = rawCategory || resolved.target || 'Fuerza'
        const isCardio = normalizeText(inferredCategory).includes('cardio')

        if (isCardio) {
            const cardioConfig = normalizeCardioConfig(rawExercise)
            exercises.push({
                exercise_id: resolved.id,
                name: resolved.name,
                category: 'Cardio',
                muscle_group: resolved.muscle_group || undefined,
                gif_url: resolved.gif_url || undefined,
                instructions: normalizeInstructions(rawExercise.instructions, resolved.instructions),
                cardio_config: cardioConfig,
            })
            continue
        }

        const rawSets = Array.isArray(rawExercise.sets_detail)
            ? rawExercise.sets_detail.slice(0, 12)
            : []

        let setsDetail = rawSets.map((set) => toSetDetail(set)).filter(Boolean)
        if (setsDetail.length === 0) {
            const fallbackSets = clampInt(rawExercise.sets, 1, 12, 3)
            const fallbackSet = toSetDetail(rawExercise)
            setsDetail = Array.from({ length: fallbackSets }, () => ({ ...fallbackSet }))
        }

        const firstSet = setsDetail[0]
        exercises.push({
            exercise_id: resolved.id,
            name: resolved.name,
            muscle_group: resolved.muscle_group || undefined,
            category: rawCategory || undefined,
            gif_url: resolved.gif_url || undefined,
            instructions: normalizeInstructions(rawExercise.instructions, resolved.instructions),
            sets_detail: setsDetail,
            sets: String(setsDetail.length),
            reps: firstSet.reps,
            weight: firstSet.weight,
            rest: firstSet.rest,
        })
    }

    if (exercises.length < minimumExercises) {
        return {
            warnings,
            error: `La IA devolvió una rutina incompleta (${exercises.length} ejercicios válidos). Reintenta ajustando el prompt.`,
        }
    }

    const name = asString(raw.name) || 'Rutina IA'
    const description = asString(raw.description) || undefined
    const scheduled_days = normalizeScheduledDays(raw.scheduled_days, fallbackSessionsPerWeek)
    const valid_until = normalizeDate(raw.valid_until)

    return {
        warnings,
        draft: {
            name,
            description,
            exercises,
            scheduled_days,
            valid_until,
        },
    }
}
