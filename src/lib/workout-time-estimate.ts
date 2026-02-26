type WorkoutSetDetail = {
    reps?: unknown
    rest?: unknown
}

type WorkoutCardioConfig = {
    type?: unknown
    duration?: unknown
    work_time?: unknown
    rest_time?: unknown
    rounds?: unknown
}

type WorkoutExercise = {
    category?: unknown
    sets?: unknown
    reps?: unknown
    rest?: unknown
    sets_detail?: unknown
    cardio_config?: unknown
}

const DEFAULT_EXERCISE_FALLBACK_MINUTES = 4
const DEFAULT_STRENGTH_REST_SECONDS = 60
const DEFAULT_EXERCISE_TRANSITION_SECONDS = 45

function toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value

    if (typeof value === 'string') {
        const normalized = value.trim().replace(',', '.')
        const parsed = Number(normalized)
        if (Number.isFinite(parsed)) return parsed
    }

    return null
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

function parseReps(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value !== 'string') return null

    const matches = value.match(/\d+(?:\.\d+)?/g)
    if (!matches || matches.length === 0) return null

    const numbers = matches.map(Number).filter(Number.isFinite)
    if (numbers.length === 0) return null

    const sum = numbers.reduce((acc, curr) => acc + curr, 0)
    return sum / numbers.length
}

function parseRestSeconds(value: unknown): number | null {
    const parsed = toNumber(value)
    if (parsed === null || parsed <= 0) return null

    // Historical workout data mixes minutes (1, 2, 3...) and seconds (60, 90...).
    // Treat tiny values as minutes and the rest as seconds.
    if (parsed <= 5) return parsed * 60
    return parsed
}

function estimateCardioSeconds(cardioConfig: unknown): number {
    if (!cardioConfig || typeof cardioConfig !== 'object') {
        return DEFAULT_EXERCISE_FALLBACK_MINUTES * 60
    }

    const config = cardioConfig as WorkoutCardioConfig
    const type = typeof config.type === 'string' ? config.type : ''

    if (type === 'continuous') {
        const durationMinutes = toNumber(config.duration) ?? DEFAULT_EXERCISE_FALLBACK_MINUTES
        return Math.max(60, durationMinutes * 60)
    }

    const workSeconds = toNumber(config.work_time) ?? 0
    const restSeconds = toNumber(config.rest_time) ?? 0
    const rounds = toNumber(config.rounds) ?? 0
    const totalSeconds = (workSeconds + restSeconds) * rounds

    if (totalSeconds > 0) return totalSeconds
    return DEFAULT_EXERCISE_FALLBACK_MINUTES * 60
}

function estimateStrengthSeconds(exercise: WorkoutExercise): number {
    const detailedSets = Array.isArray(exercise.sets_detail)
        ? (exercise.sets_detail as WorkoutSetDetail[]).filter((set) => set && typeof set === 'object')
        : []

    const fallbackSetsCount = Math.max(0, Math.round(toNumber(exercise.sets) ?? 0))
    const sets: WorkoutSetDetail[] = detailedSets.length > 0
        ? detailedSets
        : Array.from({ length: fallbackSetsCount }, () => ({}))

    if (sets.length === 0) {
        return DEFAULT_EXERCISE_FALLBACK_MINUTES * 60
    }

    const fallbackReps = parseReps(exercise.reps) ?? 10
    const fallbackRestSeconds = parseRestSeconds(exercise.rest) ?? DEFAULT_STRENGTH_REST_SECONDS

    let totalSeconds = 0

    sets.forEach((set, index) => {
        const reps = parseReps(set.reps) ?? fallbackReps
        const effortSeconds = clamp(Math.round(reps * 3.5), 20, 75)
        totalSeconds += effortSeconds

        if (index < sets.length - 1) {
            const restSeconds = parseRestSeconds(set.rest) ?? fallbackRestSeconds
            totalSeconds += clamp(restSeconds, 20, 300)
        }
    })

    return totalSeconds + DEFAULT_EXERCISE_TRANSITION_SECONDS
}

function isCardioExercise(exercise: WorkoutExercise): boolean {
    const category = typeof exercise.category === 'string' ? exercise.category.toLowerCase() : ''
    return category.includes('cardio') || !!exercise.cardio_config
}

export function estimateWorkoutDurationMinutes(structure: unknown): number {
    if (!Array.isArray(structure) || structure.length === 0) return 0

    let totalSeconds = 0

    for (const rawExercise of structure) {
        if (!rawExercise || typeof rawExercise !== 'object') {
            totalSeconds += DEFAULT_EXERCISE_FALLBACK_MINUTES * 60
            continue
        }

        const exercise = rawExercise as WorkoutExercise
        totalSeconds += isCardioExercise(exercise)
            ? estimateCardioSeconds(exercise.cardio_config)
            : estimateStrengthSeconds(exercise)
    }

    return Math.max(1, Math.round(totalSeconds / 60))
}

export function formatEstimatedWorkoutDuration(structure: unknown): string {
    return `${estimateWorkoutDurationMinutes(structure)} min aprox.`
}
