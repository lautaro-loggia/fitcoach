export type WorkoutRestUnit = 'sec' | 'min'

const LEGACY_MINUTES_THRESHOLD = 5

function toFiniteNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value

    if (typeof value === 'string') {
        const parsed = Number(value.trim().replace(',', '.'))
        if (Number.isFinite(parsed)) return parsed
    }

    return null
}

function formatNumericValue(value: number): string {
    if (Number.isInteger(value)) return String(value)
    return value.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

export function parseStoredWorkoutRestSeconds(value: unknown): number | null {
    const parsed = toFiniteNumber(value)
    if (parsed === null || parsed <= 0) return null

    if (parsed <= LEGACY_MINUTES_THRESHOLD) return parsed * 60
    return parsed
}

export function inferWorkoutRestInput(
    value: unknown,
    fallbackSeconds: number = 90
): { value: string; unit: WorkoutRestUnit } {
    const parsed = toFiniteNumber(value)

    if (parsed === null) {
        return {
            value: String(Math.max(0, Math.round(fallbackSeconds))),
            unit: 'sec',
        }
    }

    if (parsed <= 0) {
        return { value: '0', unit: 'sec' }
    }

    if (parsed <= LEGACY_MINUTES_THRESHOLD) {
        return { value: formatNumericValue(parsed), unit: 'min' }
    }

    return { value: formatNumericValue(parsed), unit: 'sec' }
}

export function workoutRestInputToStoredSeconds(value: unknown, unit: WorkoutRestUnit): string {
    const parsed = toFiniteNumber(value)
    if (parsed === null || parsed < 0) return '0'

    const seconds = unit === 'min' ? parsed * 60 : parsed
    return String(Math.max(0, Math.round(seconds)))
}

export function formatStoredWorkoutRest(value: unknown): string {
    const parsed = toFiniteNumber(value)
    if (parsed === null) return '-'

    if (parsed > 0 && parsed <= LEGACY_MINUTES_THRESHOLD) {
        return `${formatNumericValue(parsed)} min`
    }

    return `${formatNumericValue(parsed)} seg`
}

export function getWorkoutRestStep(unit: WorkoutRestUnit): number {
    return unit === 'min' ? 1 : 5
}
