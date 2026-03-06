import { getTodayString } from '@/lib/utils'

export type SessionCompletionInput = {
    id: string
    client_id: string
    assigned_workout_id: string | null
    started_at: string | null
    ended_at: string | null
}

export type LogCompletionInput = {
    id: string
    client_id: string
    workout_id: string | null
    date: string
    completed_at: string | null
}

export type NormalizedWorkoutCompletion = {
    signature: string
    clientId: string
    workoutId: string | null
    date: string
    source: 'session' | 'log'
}

function toDateFromTimestamp(timestamp: string | null | undefined): string | null {
    if (!timestamp) return null
    return getTodayString(new Date(timestamp))
}

export function buildWorkoutCompletionSignature(params: {
    clientId: string
    date: string
    workoutId: string | null | undefined
}) {
    return `${params.clientId}:${params.date}:${params.workoutId || 'log'}`
}

export function mergeWorkoutCompletions(params: {
    sessions: SessionCompletionInput[]
    logs: LogCompletionInput[]
}) {
    const bySignature = new Map<string, NormalizedWorkoutCompletion>()

    for (const session of params.sessions) {
        const date = toDateFromTimestamp(session.ended_at || session.started_at)
        if (!date) continue
        const signature = buildWorkoutCompletionSignature({
            clientId: session.client_id,
            date,
            workoutId: session.assigned_workout_id,
        })
        bySignature.set(signature, {
            signature,
            clientId: session.client_id,
            workoutId: session.assigned_workout_id,
            date,
            source: 'session',
        })
    }

    for (const log of params.logs) {
        const signature = buildWorkoutCompletionSignature({
            clientId: log.client_id,
            date: log.date,
            workoutId: log.workout_id,
        })
        if (bySignature.has(signature)) continue
        bySignature.set(signature, {
            signature,
            clientId: log.client_id,
            workoutId: log.workout_id,
            date: log.date,
            source: 'log',
        })
    }

    return [...bySignature.values()]
}
