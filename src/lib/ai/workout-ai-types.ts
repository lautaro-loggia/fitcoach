export type WorkoutObjective = 'strength' | 'hypertrophy' | 'fat_loss' | 'performance' | 'general'

export type WorkoutLevel = 'beginner' | 'intermediate' | 'advanced'

export type WorkoutStyle = 'full_body' | 'upper_lower' | 'push_pull_legs' | 'mixed'

export type WorkoutEquipment =
    | 'bodyweight'
    | 'dumbbells'
    | 'barbell'
    | 'machines'
    | 'bands'
    | 'kettlebell'
    | 'other'

export type WorkoutSetDetailDraft = {
    reps: string
    weight: string
    rest: string
}

export type WorkoutCardioConfigDraft = {
    type: 'continuous' | 'intervals'
    duration?: number
    intensity: 'low' | 'medium' | 'high' | 'hiit'
    work_time?: number
    rest_time?: number
    rounds?: number
}

export type WorkoutExerciseDraft = {
    exercise_id?: string
    name: string
    muscle_group?: string
    category?: string
    gif_url?: string
    instructions?: string[]
    sets_detail?: WorkoutSetDetailDraft[]
    cardio_config?: WorkoutCardioConfigDraft
    sets?: string
    reps?: string
    weight?: string
    rest?: string
}

export type AIGenerateClientWorkoutInput = {
    clientId: string
    objective: WorkoutObjective
    sessionsPerWeek: number
    minutesPerSession: number
    equipment: WorkoutEquipment[]
    level: WorkoutLevel
    style: WorkoutStyle
    coachNotes?: string
}

export type AIGenerateTemplateWorkoutInput = Omit<AIGenerateClientWorkoutInput, 'clientId'>

export type AIGeneratedWorkoutDraft = {
    name: string
    description?: string
    notes?: string
    exercises: WorkoutExerciseDraft[]
    scheduled_days?: string[]
    valid_until?: string
}

export type AIGenerateWorkoutResult = {
    success: boolean
    error?: string
    draft?: AIGeneratedWorkoutDraft
    warnings?: string[]
}

export type AIWorkoutBriefDefaults = {
    objective?: WorkoutObjective
    sessionsPerWeek?: number
    minutesPerSession?: number
    equipment?: WorkoutEquipment[]
    level?: WorkoutLevel
    style?: WorkoutStyle
    coachNotes?: string
}

