'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Info, Loader2, Minus, Plus, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
    generateClientWorkoutDraftAction,
    generateTemplateWorkoutDraftAction,
} from '@/app/(dashboard)/workouts/ai-workout-actions'
import type {
    AIGeneratedWorkoutDraft,
    AIWorkoutBriefDefaults,
    WorkoutEquipment,
    WorkoutLevel,
    WorkoutObjective,
    WorkoutStyle,
} from '@/lib/ai/workout-ai-types'
import { cn } from '@/lib/utils'

type WorkoutMode = 'client' | 'template'

const ACCENT_COLOR = '#4139CF'
const ACCENT_BG = 'rgba(65, 57, 207, 0.1)'
const ACCENT_BORDER = 'rgba(65, 57, 207, 0.35)'

const OBJECTIVE_OPTIONS: Array<{
    value: WorkoutObjective
    label: string
    description: string
}> = [
    { value: 'general', label: 'General / Salud', description: 'Base sólida, movilidad y constancia.' },
    { value: 'hypertrophy', label: 'Hipertrofia', description: 'Más volumen y foco en masa muscular.' },
    { value: 'strength', label: 'Fuerza', description: 'Movimientos compuestos con progresión.' },
    { value: 'performance', label: 'Rendimiento', description: 'Potencia, capacidad y transferencia deportiva.' },
    { value: 'fat_loss', label: 'Recomposición', description: 'Déficit controlado con estímulo muscular.' },
]

const LEVEL_OPTIONS: Array<{ value: WorkoutLevel; label: string }> = [
    { value: 'beginner', label: 'Principiante' },
    { value: 'intermediate', label: 'Intermedio' },
    { value: 'advanced', label: 'Avanzado' },
]

const STYLE_OPTIONS: Array<{
    value: WorkoutStyle
    label: string
    description: string
}> = [
    { value: 'upper_lower', label: 'Upper / Lower', description: '4 días, volumen balanceado.' },
    { value: 'full_body', label: 'Full Body', description: '2 a 4 días, cobertura completa.' },
    { value: 'push_pull_legs', label: 'Push / Pull / Legs', description: '5 a 6 días, mayor especialización.' },
    { value: 'mixed', label: 'Mixto', description: 'Flexible, combina objetivos y frecuencia.' },
]

const EQUIPMENT_OPTIONS: Array<{ value: WorkoutEquipment; label: string }> = [
    { value: 'bodyweight', label: 'Peso corporal' },
    { value: 'dumbbells', label: 'Mancuernas' },
    { value: 'machines', label: 'Máquinas' },
    { value: 'barbell', label: 'Barra' },
    { value: 'bands', label: 'Bandas' },
    { value: 'kettlebell', label: 'Kettlebell' },
]

const OBJECTIVE_VALUES = new Set<WorkoutObjective>(OBJECTIVE_OPTIONS.map((item) => item.value))
const LEVEL_VALUES = new Set<WorkoutLevel>(LEVEL_OPTIONS.map((item) => item.value))
const STYLE_VALUES = new Set<WorkoutStyle>(STYLE_OPTIONS.map((item) => item.value))
const EQUIPMENT_VALUES = new Set<WorkoutEquipment>([...EQUIPMENT_OPTIONS.map((item) => item.value), 'other'])

const LOADING_STEPS = ['Analizando perfil', 'Armando split', 'Seleccionando ejercicios']

const NOTE_SHORTCUTS = ['Evitar dolor/hombro', 'Priorizar técnica', 'Enfoque glúteos']

const SELECTION_BASE_CLASS =
    'h-10 min-w-[110px] rounded-md border text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-[#4139CF]/30'

type WorkoutBriefFormState = {
    objective: string
    sessionsPerWeek: number
    minutesPerSession: number
    level: string
    style: string
    coachNotes: string
    equipment: WorkoutEquipment[]
}

type FormErrors = Partial<Record<'objective' | 'sessionsPerWeek' | 'minutesPerSession' | 'level' | 'style', string>>

type InjurySummary = {
    zone?: string | null
    description?: string | null
    severity?: string | null
    since?: string | null
}

type GeneratedPayload = {
    draft: AIGeneratedWorkoutDraft
    warnings: string[]
}

type ObjectiveRecommendation = {
    style: WorkoutStyle
    repsRange: string
    restRange: string
    sessionsRange: [number, number]
    minutesRange: [number, number]
    defaultLevel: WorkoutLevel
    defaultSessions: number
    defaultMinutes: number
}

const OBJECTIVE_RECOMMENDATIONS: Record<WorkoutObjective, ObjectiveRecommendation> = {
    general: {
        style: 'full_body',
        repsRange: '8 a 12 reps',
        restRange: '60 a 90 seg',
        sessionsRange: [2, 5],
        minutesRange: [35, 65],
        defaultLevel: 'beginner',
        defaultSessions: 3,
        defaultMinutes: 45,
    },
    hypertrophy: {
        style: 'upper_lower',
        repsRange: '6 a 12 reps',
        restRange: '60 a 90 seg',
        sessionsRange: [3, 6],
        minutesRange: [45, 75],
        defaultLevel: 'intermediate',
        defaultSessions: 4,
        defaultMinutes: 60,
    },
    strength: {
        style: 'upper_lower',
        repsRange: '3 a 6 reps',
        restRange: '120 a 180 seg',
        sessionsRange: [3, 6],
        minutesRange: [50, 85],
        defaultLevel: 'intermediate',
        defaultSessions: 4,
        defaultMinutes: 70,
    },
    performance: {
        style: 'mixed',
        repsRange: '4 a 10 reps',
        restRange: '75 a 120 seg',
        sessionsRange: [3, 6],
        minutesRange: [45, 80],
        defaultLevel: 'intermediate',
        defaultSessions: 4,
        defaultMinutes: 60,
    },
    fat_loss: {
        style: 'full_body',
        repsRange: '10 a 15 reps',
        restRange: '30 a 75 seg',
        sessionsRange: [3, 6],
        minutesRange: [30, 70],
        defaultLevel: 'beginner',
        defaultSessions: 4,
        defaultMinutes: 50,
    },
}

export type AIWorkoutBriefDialogProps = {
    mode: WorkoutMode
    open: boolean
    onOpenChange: (open: boolean) => void
    clientId?: string
    defaults?: AIWorkoutBriefDefaults
    injuries?: InjurySummary[]
    onGenerated: (payload: GeneratedPayload) => void
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value))
}

function buildInitialState(defaults?: AIWorkoutBriefDefaults): WorkoutBriefFormState {
    const sessions = defaults?.sessionsPerWeek ?? 4
    const minutes = defaults?.minutesPerSession ?? 60
    return {
        objective: defaults?.objective || 'general',
        sessionsPerWeek: clamp(Math.round(sessions), 1, 7),
        minutesPerSession: clamp(Math.round(minutes), 20, 180),
        level: defaults?.level || 'intermediate',
        style: defaults?.style || 'mixed',
        coachNotes: defaults?.coachNotes || '',
        equipment: (defaults?.equipment || ['bodyweight', 'dumbbells']).filter((item) => EQUIPMENT_VALUES.has(item)),
    }
}

function buildFormErrors(form: WorkoutBriefFormState): FormErrors {
    const errors: FormErrors = {}

    if (!OBJECTIVE_VALUES.has(form.objective as WorkoutObjective)) {
        errors.objective = 'Seleccioná un objetivo.'
    }
    if (!LEVEL_VALUES.has(form.level as WorkoutLevel)) {
        errors.level = 'Seleccioná el nivel.'
    }
    if (!STYLE_VALUES.has(form.style as WorkoutStyle)) {
        errors.style = 'Seleccioná el split.'
    }
    if (!Number.isFinite(form.sessionsPerWeek) || form.sessionsPerWeek < 1 || form.sessionsPerWeek > 7) {
        errors.sessionsPerWeek = 'Definí entre 1 y 7 días.'
    }
    if (!Number.isFinite(form.minutesPerSession) || form.minutesPerSession < 20 || form.minutesPerSession > 180) {
        errors.minutesPerSession = 'Definí entre 20 y 180 min.'
    }

    return errors
}

function getObjectiveRecommendation(objective: string, defaults?: AIWorkoutBriefDefaults) {
    const selectedObjective = OBJECTIVE_VALUES.has(objective as WorkoutObjective)
        ? (objective as WorkoutObjective)
        : 'general'
    const recommendation = OBJECTIVE_RECOMMENDATIONS[selectedObjective]
    const fallbackLevel = defaults?.level && LEVEL_VALUES.has(defaults.level) ? defaults.level : recommendation.defaultLevel
    const sessions = defaults?.sessionsPerWeek ?? recommendation.defaultSessions
    const minutes = defaults?.minutesPerSession ?? recommendation.defaultMinutes

    return {
        ...recommendation,
        sessionsPerWeek: clamp(Math.round(sessions), recommendation.sessionsRange[0], recommendation.sessionsRange[1]),
        minutesPerSession: clamp(Math.round(minutes), recommendation.minutesRange[0], recommendation.minutesRange[1]),
        level: fallbackLevel,
    }
}

function LabelWithTooltip({ label, tooltip }: { label: string; tooltip: string }) {
    return (
        <div className="mb-2 flex items-center gap-1.5">
            <Label className="text-[13px] font-medium text-slate-900">{label}</Label>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        aria-label={tooltip}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition-colors hover:text-slate-900"
                    >
                        <Info className="h-3 w-3" />
                    </button>
                </TooltipTrigger>
                <TooltipContent sideOffset={6} className="max-w-[220px] text-left">
                    {tooltip}
                </TooltipContent>
            </Tooltip>
        </div>
    )
}

export function AIWorkoutBriefDialog({
    mode,
    open,
    onOpenChange,
    clientId,
    defaults,
    injuries,
    onGenerated,
}: AIWorkoutBriefDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [form, setForm] = useState<WorkoutBriefFormState>(() => buildInitialState(defaults))
    const [useAutoRecommendation, setUseAutoRecommendation] = useState(mode === 'client')
    const [showOtherEquipmentOption, setShowOtherEquipmentOption] = useState(false)
    const [notesOpen, setNotesOpen] = useState(false)
    const [showInjuryDetail, setShowInjuryDetail] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [loadingStepIndex, setLoadingStepIndex] = useState(0)

    useEffect(() => {
        if (!open) return
        const initial = buildInitialState(defaults)
        setForm(initial)
        setUseAutoRecommendation(mode === 'client')
        setShowOtherEquipmentOption(initial.equipment.includes('other'))
        setNotesOpen(false)
        setShowInjuryDetail(false)
        setSubmitError(null)
        setLoadingStepIndex(0)
    }, [open, mode, defaults])

    const headerText = useMemo(() => {
        if (mode === 'client') {
            return 'Usa perfil, historial y lesiones. Te crea un borrador editable.'
        }
        return 'Usa objetivo y formato. Te crea un borrador editable.'
    }, [mode])

    const recommendation = useMemo(() => getObjectiveRecommendation(form.objective, defaults), [form.objective, defaults])
    const styleLabel = useMemo(() => {
        return STYLE_OPTIONS.find((item) => item.value === recommendation.style)?.label || 'Mixto'
    }, [recommendation.style])

    const formErrors = useMemo(() => buildFormErrors(form), [form])
    const hasBlockingError = Object.keys(formErrors).length > 0 || (mode === 'client' && !clientId)

    const injuryChips = useMemo(() => {
        if (!Array.isArray(injuries)) return []
        const unique = new Set<string>()
        return injuries
            .map((item) => ({
                label: item?.zone?.trim() || 'Lesión',
                detail: [item?.description, item?.severity, item?.since].filter(Boolean).join(' · '),
            }))
            .filter((item) => {
                const key = item.label.toLowerCase()
                if (unique.has(key)) return false
                unique.add(key)
                return true
            })
    }, [injuries])

    useEffect(() => {
        if (!open || !useAutoRecommendation) return
        setForm((prev) => ({
            ...prev,
            sessionsPerWeek: recommendation.sessionsPerWeek,
            minutesPerSession: recommendation.minutesPerSession,
            level: recommendation.level,
            style: recommendation.style,
        }))
    }, [open, useAutoRecommendation, recommendation])

    useEffect(() => {
        if (!isSubmitting) {
            setLoadingStepIndex(0)
            return
        }
        const intervalId = window.setInterval(() => {
            setLoadingStepIndex((prev) => Math.min(prev + 1, LOADING_STEPS.length - 1))
        }, 950)
        return () => window.clearInterval(intervalId)
    }, [isSubmitting])

    const toggleEquipment = (value: WorkoutEquipment) => {
        setForm((prev) => {
            if (prev.equipment.includes(value)) {
                return { ...prev, equipment: prev.equipment.filter((item) => item !== value) }
            }
            return { ...prev, equipment: [...prev.equipment, value] }
        })
    }

    const adjustDays = (delta: number) => {
        setForm((prev) => ({ ...prev, sessionsPerWeek: clamp(prev.sessionsPerWeek + delta, 1, 7) }))
    }

    const adjustMinutes = (delta: number) => {
        setForm((prev) => ({ ...prev, minutesPerSession: clamp(prev.minutesPerSession + delta, 20, 180) }))
    }

    const appendCoachShortcut = (value: string) => {
        setForm((prev) => ({
            ...prev,
            coachNotes: prev.coachNotes.trim().length ? `${prev.coachNotes}\n• ${value}` : value,
        }))
    }

    const submit = async () => {
        setSubmitError(null)

        if (hasBlockingError) {
            setSubmitError('Completá objetivo y formato para continuar.')
            return
        }

        if (mode === 'client' && !clientId) {
            setSubmitError('No se pudo identificar el asesorado.')
            return
        }

        setIsSubmitting(true)
        try {
            const payload = {
                objective: form.objective as WorkoutObjective,
                sessionsPerWeek: form.sessionsPerWeek,
                minutesPerSession: form.minutesPerSession,
                equipment: form.equipment,
                level: form.level as WorkoutLevel,
                style: form.style as WorkoutStyle,
                coachNotes: form.coachNotes || undefined,
            }

            const result = mode === 'client'
                ? await generateClientWorkoutDraftAction({
                    ...payload,
                    clientId: clientId!,
                })
                : await generateTemplateWorkoutDraftAction(payload)

            if (!result.success || !result.draft) {
                setSubmitError(result.error || 'No se pudo generar el borrador.')
                return
            }

            const warnings = result.warnings || []
            if (warnings.length > 0) {
                toast.info(`Borrador generado con ${warnings.length} advertencia${warnings.length > 1 ? 's' : ''}.`)
            } else {
                toast.success('Borrador generado con IA.')
            }

            onGenerated({ draft: result.draft, warnings })
            onOpenChange(false)
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error generando rutina con IA.'
            setSubmitError(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(value) => !isSubmitting && onOpenChange(value)}>
            <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-[760px]">
                <div className="max-h-[90vh] overflow-y-auto overscroll-contain p-6 [scrollbar-gutter:stable]">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-[#4139CF]" />
                            <span>Generar rutina</span>
                            <Badge
                                variant="outline"
                                className="h-5 border-[#4139CF]/30 bg-[#4139CF]/10 px-1.5 text-[10px] font-semibold text-[#2C2488]"
                            >
                                IA
                            </Badge>
                        </DialogTitle>
                        <DialogDescription className="text-sm text-slate-600">{headerText}</DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 space-y-4">
                    {isSubmitting && (
                        <div className="space-y-2 rounded-xl border border-[#4139CF]/20 bg-[#4139CF]/5 p-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-[#2C2488]">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {LOADING_STEPS[loadingStepIndex]}
                            </div>
                            <Progress
                                value={((loadingStepIndex + 1) / LOADING_STEPS.length) * 100}
                                className="h-1.5 bg-[#4139CF]/15"
                                indicatorClassName="bg-[#4139CF]"
                            />
                            <p className="text-xs text-slate-600">
                                {LOADING_STEPS.join(' → ')}
                            </p>
                        </div>
                    )}

                    <div className="grid items-start gap-4 lg:grid-cols-2">
                        <div className="space-y-4">
                            <section className="space-y-3 rounded-xl border border-slate-200 p-3.5">
                                <h3 className="text-base font-semibold text-slate-900">Objetivo</h3>
                                <LabelWithTooltip
                                    label="¿Qué tipo de rutina buscás?"
                                    tooltip="Esto orienta el split, el volumen y los descansos sugeridos."
                                />
                                <div className="grid grid-cols-1 gap-2">
                                    {OBJECTIVE_OPTIONS.map((option) => {
                                        const selected = form.objective === option.value
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                disabled={isSubmitting}
                                                onClick={() => setForm((prev) => ({ ...prev, objective: option.value }))}
                                                className={cn(
                                                    'rounded-lg border px-3 py-2 text-left transition-all',
                                                    selected
                                                        ? 'border-[#4139CF]/45 bg-[#4139CF]/10 text-[#1F184F]'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-[#4139CF]/25'
                                                )}
                                            >
                                                <p className="text-sm font-semibold">{option.label}</p>
                                                <p className="mt-0.5 text-xs text-slate-500">{option.description}</p>
                                            </button>
                                        )
                                    })}
                                </div>
                                {formErrors.objective && <p className="text-xs text-rose-600">{formErrors.objective}</p>}
                            </section>

                            <section className="space-y-3 rounded-xl border border-slate-200 p-3.5">
                                <h3 className="text-base font-semibold text-slate-900">Formato</h3>
                                <div className="rounded-lg border border-slate-200 p-2.5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">Usar sugerencia automática</p>
                                            <p className="text-xs text-slate-500">Bloquea días, duración y nivel sugeridos.</p>
                                        </div>
                                        <Switch
                                            checked={useAutoRecommendation}
                                            disabled={isSubmitting}
                                            onCheckedChange={setUseAutoRecommendation}
                                            className="data-[state=checked]:bg-[#4139CF]"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <LabelWithTooltip
                                        label="Días por semana"
                                        tooltip="Frecuencia semanal de entrenamiento."
                                    />
                                    <div className="grid grid-cols-5 gap-1.5">
                                        <Button
                                            type="button"
                                            size="icon-sm"
                                            variant="outline"
                                            disabled={isSubmitting || useAutoRecommendation}
                                            onClick={() => adjustDays(-1)}
                                            className="h-9 w-full rounded-md px-0"
                                        >
                                            <Minus className="h-3.5 w-3.5" />
                                        </Button>
                                        {[3, 4, 5].map((value) => (
                                            <button
                                                key={value}
                                                type="button"
                                                disabled={isSubmitting || useAutoRecommendation}
                                                onClick={() => setForm((prev) => ({ ...prev, sessionsPerWeek: value }))}
                                                className={cn(
                                                    'h-9 w-full min-w-0 rounded-md border px-0 text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-[#4139CF]/30',
                                                    value === form.sessionsPerWeek
                                                        ? 'border-[#4139CF]/40 bg-[#4139CF]/10 text-[#221B64]'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-[#4139CF]/25'
                                                )}
                                            >
                                                {value}
                                            </button>
                                        ))}
                                        <Button
                                            type="button"
                                            size="icon-sm"
                                            variant="outline"
                                            disabled={isSubmitting || useAutoRecommendation}
                                            onClick={() => adjustDays(1)}
                                            className="h-9 w-full rounded-md px-0"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                    {formErrors.sessionsPerWeek && (
                                        <p className="text-xs text-rose-600">{formErrors.sessionsPerWeek}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <LabelWithTooltip
                                        label="Duración"
                                        tooltip="Minutos objetivo por sesión."
                                    />
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            size="icon-sm"
                                            variant="outline"
                                            disabled={isSubmitting || useAutoRecommendation}
                                            onClick={() => adjustMinutes(-5)}
                                            className="h-9 w-9 rounded-md"
                                        >
                                            <Minus className="h-3.5 w-3.5" />
                                        </Button>
                                        <div className="flex h-10 min-w-[106px] items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900">
                                            {form.minutesPerSession} min
                                        </div>
                                        <Button
                                            type="button"
                                            size="icon-sm"
                                            variant="outline"
                                            disabled={isSubmitting || useAutoRecommendation}
                                            onClick={() => adjustMinutes(5)}
                                            className="h-9 w-9 rounded-md"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[30, 45, 60, 75].map((value) => (
                                            <button
                                                key={value}
                                                type="button"
                                                disabled={isSubmitting || useAutoRecommendation}
                                                onClick={() => setForm((prev) => ({ ...prev, minutesPerSession: value }))}
                                                className={cn(
                                                    'h-8 min-w-[52px] rounded-md border px-2 text-xs font-medium transition-all',
                                                    form.minutesPerSession === value
                                                        ? 'border-[#4139CF]/40 bg-[#4139CF]/10 text-[#221B64]'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-[#4139CF]/25'
                                                )}
                                            >
                                                {value}
                                            </button>
                                        ))}
                                    </div>
                                    {formErrors.minutesPerSession && (
                                        <p className="text-xs text-rose-600">{formErrors.minutesPerSession}</p>
                                    )}
                                </div>
                            </section>
                        </div>

                        <div className="space-y-4">
                            <section className="space-y-3 rounded-xl border border-slate-200 p-3.5">
                                <h3 className="text-base font-semibold text-slate-900">Formato</h3>
                                <div className="space-y-2">
                                    <LabelWithTooltip
                                        label="Nivel"
                                        tooltip="Ajusta volumen y complejidad técnica."
                                    />
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {LEVEL_OPTIONS.map((option) => {
                                            const selected = form.level === option.value
                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    disabled={isSubmitting || useAutoRecommendation}
                                                    onClick={() => setForm((prev) => ({ ...prev, level: option.value }))}
                                                    className={cn(
                                                        'h-9 rounded-md border px-2 text-xs font-medium transition-all',
                                                        selected
                                                            ? 'border-[#4139CF]/40 bg-[#4139CF]/10 text-[#221B64]'
                                                            : 'border-slate-200 bg-white text-slate-600 hover:border-[#4139CF]/25'
                                                    )}
                                                >
                                                    {option.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    {formErrors.level && <p className="text-xs text-rose-600">{formErrors.level}</p>}
                                </div>

                                <div className="space-y-2">
                                    <LabelWithTooltip
                                        label="Split"
                                        tooltip="Distribución semanal recomendada por objetivo."
                                    />
                                    <div className="space-y-1.5">
                                        {STYLE_OPTIONS.map((option) => {
                                            const selected = form.style === option.value
                                            const recommended = option.value === recommendation.style
                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    disabled={isSubmitting}
                                                    onClick={() => setForm((prev) => ({ ...prev, style: option.value }))}
                                                    className={cn(
                                                        'w-full rounded-lg border px-3 py-2 text-left transition-all',
                                                        selected
                                                            ? 'border-[#4139CF]/45 bg-[#4139CF]/10 text-[#1F184F]'
                                                            : 'border-slate-200 bg-white text-slate-700 hover:border-[#4139CF]/25'
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-sm font-semibold">{option.label}</p>
                                                        {recommended && (
                                                            <span
                                                                className="rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
                                                                style={{
                                                                    color: ACCENT_COLOR,
                                                                    background: ACCENT_BG,
                                                                    borderColor: ACCENT_BORDER,
                                                                }}
                                                            >
                                                                Recomendado
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-0.5 text-xs text-slate-500">{option.description}</p>
                                                </button>
                                            )
                                        })}
                                    </div>
                                    {formErrors.style && <p className="text-xs text-rose-600">{formErrors.style}</p>}
                                </div>

                                <div className="rounded-lg border border-[#4139CF]/20 bg-[#4139CF]/5 p-2.5 text-xs text-slate-700">
                                    <span className="font-semibold text-[#2C2488]">Sugerencia IA:</span>{' '}
                                    {styleLabel} · {recommendation.repsRange} · descanso {recommendation.restRange}
                                </div>
                            </section>

                            <section className="space-y-3 rounded-xl border border-slate-200 p-3.5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-base font-semibold text-slate-900">Recursos y notas</h3>
                                    <span className="text-xs font-medium text-slate-500">
                                        Seleccionados ({form.equipment.length})
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <LabelWithTooltip
                                        label="Equipamiento"
                                        tooltip="Filtra ejercicios según recursos disponibles."
                                    />
                                    <div className="flex flex-wrap gap-1.5">
                                        <button
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={() => setForm((prev) => ({
                                                ...prev,
                                                equipment: [...EQUIPMENT_OPTIONS.map((item) => item.value)],
                                            }))}
                                            className={cn(
                                                'h-8 rounded-md border px-2.5 text-xs font-semibold transition-all',
                                                form.equipment.length >= EQUIPMENT_OPTIONS.length
                                                    ? 'border-[#4139CF]/40 bg-[#4139CF]/10 text-[#221B64]'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-[#4139CF]/25'
                                            )}
                                        >
                                            Todos
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={() => setForm((prev) => ({ ...prev, equipment: [] }))}
                                            className={cn(
                                                'h-8 rounded-md border px-2.5 text-xs font-semibold transition-all',
                                                form.equipment.length === 0
                                                    ? 'border-[#4139CF]/40 bg-[#4139CF]/10 text-[#221B64]'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-[#4139CF]/25'
                                            )}
                                        >
                                            Ninguno
                                        </button>
                                        {!showOtherEquipmentOption && (
                                            <button
                                                type="button"
                                                disabled={isSubmitting}
                                                onClick={() => setShowOtherEquipmentOption(true)}
                                                className="h-8 rounded-md border border-dashed border-slate-300 px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-[#4139CF]/35"
                                            >
                                                + Agregar
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {EQUIPMENT_OPTIONS.map((option) => {
                                            const selected = form.equipment.includes(option.value)
                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    disabled={isSubmitting}
                                                    onClick={() => toggleEquipment(option.value)}
                                                    className={cn(
                                                        SELECTION_BASE_CLASS,
                                                        selected
                                                            ? 'border-[#4139CF]/40 bg-[#4139CF]/10 text-[#221B64]'
                                                            : 'border-slate-200 bg-white text-slate-700 hover:border-[#4139CF]/25'
                                                    )}
                                                >
                                                    {option.label}
                                                </button>
                                            )
                                        })}
                                        {(showOtherEquipmentOption || form.equipment.includes('other')) && (
                                            <button
                                                type="button"
                                                disabled={isSubmitting}
                                                onClick={() => toggleEquipment('other')}
                                                className={cn(
                                                    SELECTION_BASE_CLASS,
                                                    form.equipment.includes('other')
                                                        ? 'border-[#4139CF]/40 bg-[#4139CF]/10 text-[#221B64]'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-[#4139CF]/25'
                                                )}
                                            >
                                                Otro
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 rounded-lg border border-slate-200 p-2.5">
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => setNotesOpen((prev) => !prev)}
                                        className="flex w-full items-center justify-between text-sm font-medium text-slate-800"
                                    >
                                        Agregar notas
                                        <ChevronDown className={cn('h-4 w-4 transition-transform', notesOpen && 'rotate-180')} />
                                    </button>
                                    <Collapsible open={notesOpen}>
                                        <CollapsibleContent className="space-y-2.5 pt-1">
                                            {injuryChips.length > 0 && (
                                                <div className="space-y-1.5 rounded-md border border-slate-200 bg-slate-50 p-2">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs font-semibold text-slate-700">Lesiones detectadas</p>
                                                        <button
                                                            type="button"
                                                            className="text-xs font-medium text-[#4139CF] underline-offset-2 hover:underline"
                                                            onClick={() => setShowInjuryDetail((prev) => !prev)}
                                                        >
                                                            Ver detalle
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {injuryChips.map((injury) => (
                                                            <span
                                                                key={injury.label}
                                                                className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700"
                                                            >
                                                                {injury.label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    {showInjuryDetail && (
                                                        <ul className="space-y-1 text-xs text-slate-600">
                                                            {injuryChips.map((injury) => (
                                                                <li key={`${injury.label}-detail`}>
                                                                    <span className="font-medium">{injury.label}:</span>{' '}
                                                                    {injury.detail || 'Sin detalle adicional.'}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex flex-wrap gap-1.5">
                                                {NOTE_SHORTCUTS.map((shortcut) => (
                                                    <button
                                                        key={shortcut}
                                                        type="button"
                                                        disabled={isSubmitting}
                                                        onClick={() => appendCoachShortcut(shortcut)}
                                                        className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:border-[#4139CF]/35"
                                                    >
                                                        {shortcut}
                                                    </button>
                                                ))}
                                            </div>

                                            <Textarea
                                                rows={3}
                                                value={form.coachNotes}
                                                onChange={(event) => setForm((prev) => ({ ...prev, coachNotes: event.target.value }))}
                                                placeholder="Indicaciones puntuales para esta rutina."
                                                className="min-h-[92px] resize-y border-slate-200 focus-visible:border-[#4139CF] focus-visible:ring-[#4139CF]/25"
                                                disabled={isSubmitting}
                                            />
                                        </CollapsibleContent>
                                    </Collapsible>
                                </div>
                            </section>
                        </div>
                    </div>

                    <div className="space-y-2 border-t pt-3">
                        {submitError && (
                            <p className="text-sm text-rose-600">{submitError}</p>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isSubmitting}
                                onClick={() => onOpenChange(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                disabled={isSubmitting || hasBlockingError}
                                onClick={submit}
                                className="bg-black text-white hover:bg-black/90 focus-visible:ring-black/20"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generando...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Generar borrador
                                    </>
                                )}
                            </Button>
                        </div>
                        <p className="text-right text-xs text-slate-500">
                            Vas a poder editar ejercicios, series y cargas.
                        </p>
                    </div>
                </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
