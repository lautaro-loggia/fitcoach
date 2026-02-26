type InjuryLike = {
    zone?: string
    severity?: string
    description?: string
    diagnosed?: boolean
    since?: string
    is_active?: boolean
}

type ExerciseLike = {
    name?: string
    muscle_group?: string
    main_muscle_group?: string
}

type InjuryRule = {
    label: string
    zoneKeywords: string[]
    relatedMuscles: string[]
    exerciseKeywords: string[]
}

const normalizeText = (value?: string) =>
    (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()

const INJURY_RULES: InjuryRule[] = [
    {
        label: 'Hombro',
        zoneKeywords: ['hombro', 'hombros'],
        relatedMuscles: ['hombro', 'pecho', 'espalda', 'tricep', 'bicep', 'brazo'],
        exerciseKeywords: ['press militar', 'military press', 'overhead press', 'press banca', 'bench press', 'fondos', 'push press']
    },
    {
        label: 'Rodilla',
        zoneKeywords: ['rodilla', 'rodillas'],
        relatedMuscles: ['pierna', 'cuadricep', 'isquio', 'gluteo', 'pantorrilla', 'cardio'],
        exerciseKeywords: ['sentadilla', 'squat', 'zancada', 'lunge', 'prensa', 'leg press', 'saltos', 'jump']
    },
    {
        label: 'Espalda',
        zoneKeywords: ['espalda', 'lumbar', 'dorsal'],
        relatedMuscles: ['espalda', 'core', 'hombro', 'isquio', 'gluteo'],
        exerciseKeywords: ['peso muerto', 'deadlift', 'remo', 'row', 'good morning', 'hip hinge']
    },
    {
        label: 'Cuello',
        zoneKeywords: ['cuello', 'cervical'],
        relatedMuscles: ['hombro', 'espalda', 'trapecio'],
        exerciseKeywords: ['encogimiento', 'shrug', 'press', 'overhead']
    },
    {
        label: 'Cadera',
        zoneKeywords: ['cadera', 'caderas'],
        relatedMuscles: ['pierna', 'gluteo', 'core', 'isquio'],
        exerciseKeywords: ['sentadilla', 'squat', 'peso muerto', 'deadlift', 'hip thrust', 'zancada']
    },
    {
        label: 'Tobillo',
        zoneKeywords: ['tobillo', 'tobillos'],
        relatedMuscles: ['pantorrilla', 'pierna', 'cardio'],
        exerciseKeywords: ['correr', 'run', 'saltos', 'jump', 'soga']
    },
    {
        label: 'Muñeca / Codo',
        zoneKeywords: ['muneca', 'muñeca', 'codo', 'munecas', 'muñecas', 'codos'],
        relatedMuscles: ['bicep', 'tricep', 'brazo', 'hombro', 'pecho'],
        exerciseKeywords: ['curl', 'press', 'fondos', 'extensiones', 'push up', 'flexiones']
    },
]

function getRuleForInjuryZone(zone: string): InjuryRule | null {
    const normalizedZone = normalizeText(zone)
    if (!normalizedZone) return null
    return INJURY_RULES.find(rule => rule.zoneKeywords.some(keyword => normalizedZone.includes(keyword))) || null
}

export function getActiveInjuries(injuries: unknown): InjuryLike[] {
    if (!Array.isArray(injuries)) return []
    return injuries
        .filter((injury): injury is InjuryLike => typeof injury === 'object' && injury !== null)
        .filter(injury => injury.is_active !== false)
}

export function findExerciseInjuryConflict(exercise: ExerciseLike, injuries: unknown) {
    const activeInjuries = getActiveInjuries(injuries)
    if (activeInjuries.length === 0) return null

    const exerciseName = normalizeText(exercise.name)
    const exerciseMuscle = normalizeText(exercise.muscle_group || exercise.main_muscle_group)

    for (const injury of activeInjuries) {
        const rule = getRuleForInjuryZone(injury.zone || '')
        if (!rule) continue

        const muscleMatch = rule.relatedMuscles.some(muscle => exerciseMuscle.includes(muscle))
        const keywordMatch = rule.exerciseKeywords.some(keyword => exerciseName.includes(keyword))

        if (muscleMatch || keywordMatch) {
            return {
                injury,
                rule,
            }
        }
    }

    return null
}

export function formatInjuryWarningMessage(exercise: ExerciseLike, injuries: unknown) {
    const conflict = findExerciseInjuryConflict(exercise, injuries)
    if (!conflict) return null

    const exerciseLabel = exercise.name || 'Este ejercicio'
    const zoneLabel = conflict.injury.zone || conflict.rule.label
    return `${exerciseLabel} puede no ser ideal por la lesión/molestia en ${zoneLabel}. Verificá técnica, rango y dolor antes de asignarlo.`
}
