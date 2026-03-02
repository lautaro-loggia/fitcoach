'use server'

import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { consumeRateLimit } from '@/lib/security/rate-limit'
import { formatInjuryWarningMessage } from '@/lib/injury-risk-utils'
import {
    getClientWorkoutGenerationContext,
    getClientWorkoutGenerationDefaults,
    getTemplateWorkoutGenerationCatalog,
} from '@/lib/ai/workout-ai-context'
import { parseAIGeneratedWorkoutDraft } from '@/lib/ai/workout-ai-parser'
import type {
    AIGenerateClientWorkoutInput,
    AIGenerateTemplateWorkoutInput,
    AIGenerateWorkoutResult,
    AIWorkoutBriefDefaults,
    WorkoutEquipment,
    WorkoutLevel,
    WorkoutObjective,
    WorkoutStyle,
} from '@/lib/ai/workout-ai-types'

const ALLOWED_EQUIPMENT: WorkoutEquipment[] = [
    'bodyweight',
    'dumbbells',
    'barbell',
    'machines',
    'bands',
    'kettlebell',
    'other',
]

const ALLOWED_OBJECTIVES: WorkoutObjective[] = ['strength', 'hypertrophy', 'fat_loss', 'performance', 'general']
const ALLOWED_LEVELS: WorkoutLevel[] = ['beginner', 'intermediate', 'advanced']
const ALLOWED_STYLES: WorkoutStyle[] = ['full_body', 'upper_lower', 'push_pull_legs', 'mixed']

function sanitizeArrayUnique<T>(input: unknown, allow: readonly T[]): T[] {
    if (!Array.isArray(input)) return []
    const seen = new Set<T>()
    const output: T[] = []

    for (const item of input) {
        if (!allow.includes(item as T)) continue
        const typed = item as T
        if (seen.has(typed)) continue
        seen.add(typed)
        output.push(typed)
    }

    return output
}

function sanitizeString(input: unknown, maxLength: number): string | undefined {
    if (typeof input !== 'string') return undefined
    const trimmed = input.trim()
    if (!trimmed) return undefined
    return trimmed.slice(0, maxLength)
}

function sanitizeObjective(input: unknown): WorkoutObjective {
    return ALLOWED_OBJECTIVES.includes(input as WorkoutObjective) ? (input as WorkoutObjective) : 'general'
}

function sanitizeLevel(input: unknown): WorkoutLevel {
    return ALLOWED_LEVELS.includes(input as WorkoutLevel) ? (input as WorkoutLevel) : 'intermediate'
}

function sanitizeStyle(input: unknown): WorkoutStyle {
    return ALLOWED_STYLES.includes(input as WorkoutStyle) ? (input as WorkoutStyle) : 'mixed'
}

function sanitizeSessions(input: unknown): number {
    const n = Number(input)
    if (!Number.isFinite(n)) return 4
    return Math.max(1, Math.min(7, Math.round(n)))
}

function sanitizeMinutes(input: unknown): number {
    const n = Number(input)
    if (!Number.isFinite(n)) return 60
    return Math.max(20, Math.min(180, Math.round(n)))
}

function parseJsonPayload(raw: string): unknown {
    try {
        return JSON.parse(raw)
    } catch {
        const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
        return JSON.parse(cleaned)
    }
}

function buildCatalogForPrompt(catalog: Array<{
    id: string
    name: string
    muscle_group: string | null
    equipment: string | null
    target: string | null
}>) {
    return catalog.map((item) => ({
        id: item.id,
        name: item.name,
        muscle_group: item.muscle_group,
        equipment: item.equipment,
        target: item.target,
    }))
}

function dedupeWarnings(warnings: string[]) {
    return [...new Set(warnings.filter(Boolean))]
}

function buildPrompt(params: {
    mode: 'client' | 'template'
    objective: WorkoutObjective
    sessionsPerWeek: number
    minutesPerSession: number
    level: WorkoutLevel
    style: WorkoutStyle
    equipment: WorkoutEquipment[]
    coachNotes?: string
    catalog: Array<{
        id: string
        name: string
        muscle_group: string | null
        equipment: string | null
        target: string | null
    }>
    clientContext?: Record<string, unknown>
}): string {
    const modeInstructions = params.mode === 'client'
        ? `Estás generando un plan PERSONALIZADO para un asesorado real. Debes usar el contexto del cliente para ajustar volumen, selección de ejercicios y distribución semanal.`
        : `Estás generando una plantilla genérica reusable para entrenadores.`

    const clientContextText = params.clientContext
        ? `Contexto cliente (usar sí o sí):\n${JSON.stringify(params.clientContext, null, 2)}`
        : 'No hay contexto de cliente específico.'

    return `Sos un preparador físico profesional. Tu tarea es generar un borrador de rutina de entrenamiento.
${modeInstructions}

Reglas obligatorias:
1) Responder SOLO JSON válido (sin markdown, sin comentarios, sin texto adicional).
2) Usar ÚNICAMENTE ejercicios del catálogo provisto.
3) Cada ejercicio debe incluir "exercise_id".
4) Incluir mínimo 3 ejercicios.
5) Para ejercicios de fuerza incluir "sets_detail" con objetos { "reps": string, "weight": string, "rest": string }.
6) "scheduled_days" debe usar nombres en español: Lunes..Domingo.
7) "valid_until" formato YYYY-MM-DD.

Input de diseño:
{
  "objective": "${params.objective}",
  "sessions_per_week": ${params.sessionsPerWeek},
  "minutes_per_session": ${params.minutesPerSession},
  "level": "${params.level}",
  "style": "${params.style}",
  "equipment": ${JSON.stringify(params.equipment)},
  "coach_notes": ${JSON.stringify(params.coachNotes || '')}
}

${clientContextText}

Catálogo de ejercicios (ID obligatorio):
${JSON.stringify(buildCatalogForPrompt(params.catalog), null, 2)}

Responder usando este schema exacto:
{
  "name": "string",
  "description": "string opcional",
  "notes": "string opcional",
  "scheduled_days": ["Lunes", "Jueves"],
  "valid_until": "YYYY-MM-DD",
  "exercises": [
    {
      "exercise_id": "string",
      "name": "string",
      "muscle_group": "string opcional",
      "category": "string opcional",
      "sets_detail": [{ "reps": "8", "weight": "50", "rest": "90" }]
    }
  ]
}`
}

async function getAuthenticatedCoach() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { supabase, user: null, error: 'No autorizado' as const }
    }

    return { supabase, user, error: null }
}

function validateApiKey() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return null
    return apiKey
}

export async function getClientWorkoutDraftDefaultsAction(clientId: string): Promise<{
    success: boolean
    error?: string
    defaults?: AIWorkoutBriefDefaults
}> {
    const auth = await getAuthenticatedCoach()
    if (!auth.user) return { success: false, error: auth.error || 'No autorizado' }

    const result = await getClientWorkoutGenerationDefaults({
        supabase: auth.supabase,
        trainerId: auth.user.id,
        clientId,
    })

    if (!result.defaults) {
        return { success: false, error: result.error || 'No se pudo cargar el contexto del cliente.' }
    }

    return { success: true, defaults: result.defaults }
}

export async function generateClientWorkoutDraftAction(input: AIGenerateClientWorkoutInput): Promise<AIGenerateWorkoutResult> {
    const auth = await getAuthenticatedCoach()
    if (!auth.user) return { success: false, error: auth.error || 'No autorizado' }

    const rate = consumeRateLimit({
        scope: 'ai-workout-generation',
        key: auth.user.id,
        maxRequests: 12,
        windowMs: 60 * 60 * 1000,
    })
    if (!rate.allowed) {
        const retryMinutes = Math.max(1, Math.ceil(rate.retryAfterMs / 60000))
        return { success: false, error: `Demasiadas solicitudes. Reintenta en ${retryMinutes} min.` }
    }

    const apiKey = validateApiKey()
    if (!apiKey) return { success: false, error: 'Gemini API Key no configurada' }

    const payload = {
        clientId: sanitizeString(input.clientId, 64),
        objective: sanitizeObjective(input.objective),
        sessionsPerWeek: sanitizeSessions(input.sessionsPerWeek),
        minutesPerSession: sanitizeMinutes(input.minutesPerSession),
        equipment: sanitizeArrayUnique(input.equipment, ALLOWED_EQUIPMENT),
        level: sanitizeLevel(input.level),
        style: sanitizeStyle(input.style),
        coachNotes: sanitizeString(input.coachNotes, 1200),
    }

    if (!payload.clientId) {
        return { success: false, error: 'Cliente inválido.' }
    }

    const context = await getClientWorkoutGenerationContext({
        supabase: auth.supabase,
        trainerId: auth.user.id,
        clientId: payload.clientId,
        objective: payload.objective,
        equipment: payload.equipment,
        maxCatalogItems: 300,
    })

    if ('error' in context) {
        return { success: false, error: context.error }
    }

    if (!context.exerciseCatalog.length) {
        return { success: false, error: 'No hay ejercicios disponibles para generar la rutina.' }
    }

    const ai = new GoogleGenAI({ apiKey })

    try {
        const prompt = buildPrompt({
            mode: 'client',
            objective: payload.objective,
            sessionsPerWeek: payload.sessionsPerWeek,
            minutesPerSession: payload.minutesPerSession,
            level: payload.level,
            style: payload.style,
            equipment: payload.equipment,
            coachNotes: payload.coachNotes,
            catalog: context.exerciseCatalog,
            clientContext: {
                client_name: context.client.full_name,
                main_goal: context.client.main_goal,
                goal_text: context.client.goal_text,
                activity_level: context.client.activity_level,
                work_type: context.client.work_type,
                injuries: context.client.injuries || [],
                training_availability: context.client.training_availability || {},
                current_weight: context.client.current_weight,
                target_weight: context.client.target_weight,
                target_fat: context.client.target_fat,
                recent_workout_feedback: context.recentWorkoutLogs,
                recent_checkins: context.recentCheckins,
                active_workout_patterns: context.activeAssignedWorkouts.map((w) => ({
                    name: w.name,
                    scheduled_days: w.scheduled_days,
                })),
            },
        })

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json' },
        })

        const textResponse = response.text
        if (!textResponse) return { success: false, error: 'Respuesta vacía de Gemini.' }

        const parsedPayload = parseJsonPayload(textResponse)
        const parsedDraft = parseAIGeneratedWorkoutDraft(parsedPayload, context.exerciseCatalog, {
            fallbackSessionsPerWeek: payload.sessionsPerWeek,
            minimumExercises: 3,
        })

        if (!parsedDraft.draft) {
            return { success: false, error: parsedDraft.error || 'No se pudo parsear el borrador generado.' }
        }

        const injuryWarnings = parsedDraft.draft.exercises
            .map((exercise) => formatInjuryWarningMessage(exercise, context.client.injuries))
            .filter((warning): warning is string => Boolean(warning))

        return {
            success: true,
            draft: parsedDraft.draft,
            warnings: dedupeWarnings([...parsedDraft.warnings, ...injuryWarnings]),
        }
    } catch (error: unknown) {
        console.error('Error generating client workout draft:', error)
        const message = error instanceof Error ? error.message : 'desconocido'
        return { success: false, error: `Error generando rutina: ${message}` }
    }
}

export async function generateTemplateWorkoutDraftAction(input: AIGenerateTemplateWorkoutInput): Promise<AIGenerateWorkoutResult> {
    const auth = await getAuthenticatedCoach()
    if (!auth.user) return { success: false, error: auth.error || 'No autorizado' }

    const rate = consumeRateLimit({
        scope: 'ai-workout-generation',
        key: auth.user.id,
        maxRequests: 12,
        windowMs: 60 * 60 * 1000,
    })
    if (!rate.allowed) {
        const retryMinutes = Math.max(1, Math.ceil(rate.retryAfterMs / 60000))
        return { success: false, error: `Demasiadas solicitudes. Reintenta en ${retryMinutes} min.` }
    }

    const apiKey = validateApiKey()
    if (!apiKey) return { success: false, error: 'Gemini API Key no configurada' }

    const payload = {
        objective: sanitizeObjective(input.objective),
        sessionsPerWeek: sanitizeSessions(input.sessionsPerWeek),
        minutesPerSession: sanitizeMinutes(input.minutesPerSession),
        equipment: sanitizeArrayUnique(input.equipment, ALLOWED_EQUIPMENT),
        level: sanitizeLevel(input.level),
        style: sanitizeStyle(input.style),
        coachNotes: sanitizeString(input.coachNotes, 1200),
    }

    const catalog = await getTemplateWorkoutGenerationCatalog({
        supabase: auth.supabase,
        objective: payload.objective,
        equipment: payload.equipment,
        maxCatalogItems: 300,
    })

    if (!catalog.length) {
        return { success: false, error: 'No hay ejercicios disponibles para generar la rutina.' }
    }

    const ai = new GoogleGenAI({ apiKey })

    try {
        const prompt = buildPrompt({
            mode: 'template',
            objective: payload.objective,
            sessionsPerWeek: payload.sessionsPerWeek,
            minutesPerSession: payload.minutesPerSession,
            level: payload.level,
            style: payload.style,
            equipment: payload.equipment,
            coachNotes: payload.coachNotes,
            catalog,
        })

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json' },
        })

        const textResponse = response.text
        if (!textResponse) return { success: false, error: 'Respuesta vacía de Gemini.' }

        const parsedPayload = parseJsonPayload(textResponse)
        const parsedDraft = parseAIGeneratedWorkoutDraft(parsedPayload, catalog, {
            fallbackSessionsPerWeek: payload.sessionsPerWeek,
            minimumExercises: 3,
        })

        if (!parsedDraft.draft) {
            return { success: false, error: parsedDraft.error || 'No se pudo parsear el borrador generado.' }
        }

        return {
            success: true,
            draft: parsedDraft.draft,
            warnings: dedupeWarnings(parsedDraft.warnings),
        }
    } catch (error: unknown) {
        console.error('Error generating template workout draft:', error)
        const message = error instanceof Error ? error.message : 'desconocido'
        return { success: false, error: `Error generando rutina: ${message}` }
    }
}
