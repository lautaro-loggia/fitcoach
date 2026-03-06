import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as crypto from 'node:crypto'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

type SeedMode = 'recreate' | 'create' | 'cleanup'

type ScriptOptions = {
    mode: SeedMode
    seedDate: string
    manifestPath: string
}

type DemoManifest = {
    version: number
    demoTag: string
    createdAt: string
    seedDate: string
    mode: SeedMode
    coach: {
        email: string
        password: string
        userId: string
        profileId: string
    }
    clients: Array<{
        index: number
        fullName: string
        email: string
        password: string
        authUserId: string
        clientId: string
        paymentStatus: 'paid' | 'pending' | 'overdue'
    }>
    ids: {
        planIds: string[]
        workoutTemplateIds: string[]
        assignedWorkoutIds: string[]
        workoutLogIds: string[]
        recipeIds: string[]
        weeklyMealPlanIds: string[]
        weeklyMealPlanDayIds: string[]
        weeklyMealPlanMealIds: string[]
        weeklyMealPlanItemIds: string[]
        checkinIds: string[]
        paymentIds: string[]
    }
    photos: {
        source: string
        urls: string[]
    }
}

type ClientSeed = {
    fullName: string
    phone: string
    birthDate: string
    height: number
    gender: 'male'
    initialWeight: number
    initialBodyFat: number
    currentWeight: number
    goalSpecific: 'fat_loss' | 'muscle_gain' | 'recomp' | 'performance'
    mainGoal: 'fat_loss' | 'muscle_gain' | 'recomp' | 'performance'
    goalText: string
    timeframe: '1-3 months' | '3-6 months' | '6+ months'
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
    workType: 'sedentary' | 'mixed' | 'physical'
    trainingFrequency: number
    checkinFrequencyDays: number
    nextCheckinOffsetDays: number
    dietaryPreference: 'sin_restricciones' | 'high_protein' | 'vegetarian' | 'keto'
    mealsPerDay: number
    dietExperience: 'beginner' | 'intermediate' | 'advanced'
    dietaryOther: string
    allergens: string[]
    injuries: Array<{ name: string; severity: 'low' | 'medium'; status: 'managed' | 'in_progress' }>
    trainingAvailability: {
        days_per_week: number
        preferred_days: string[]
        preferred_time: 'morning' | 'afternoon' | 'evening'
        duration_minutes: number
    }
    targetCalories: number
    targetProtein: number
    targetCarbs: number
    targetFats: number
    targetWeight: number
    targetFat: number
    dailyStepsTarget: number
    planSlug: 'base' | 'pro' | 'elite'
    paymentScenario: 'paid' | 'pending_with_history' | 'pending_without_history' | 'overdue'
    photoSet: {
        avatar: string
        front: string[]
        profile: string[]
        back: string[]
    }
    checkinTrend: {
        weights: number[]
        bodyFat: number[]
        waist: number[]
        chest: number[]
        hips: number[]
        arm: number[]
        thigh: number[]
        calf: number[]
    }
}

const DEMO_TAG = 'coach_demo_v1'
const DEFAULT_MANIFEST_PATH = path.resolve(process.cwd(), 'tmp/demo-coach-manifest.json')
const REQUIRED_ENV = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const

const REQUIRED_TABLE_COLUMNS: Record<string, string[]> = {
    profiles: ['id', 'full_name', 'email'],
    clients: [
        'id', 'trainer_id', 'user_id', 'full_name', 'email', 'phone', 'birth_date', 'gender',
        'height', 'initial_weight', 'initial_body_fat', 'current_weight', 'goal_text', 'goal_specific',
        'main_goal', 'goals', 'activity_level', 'work_type', 'training_frequency', 'training_availability',
        'injuries', 'dietary_info', 'dietary_preference', 'allergens', 'target_calories', 'target_protein',
        'target_carbs', 'target_fats', 'target_weight', 'target_fat', 'daily_steps_target',
        'status', 'onboarding_status', 'planning_status', 'checkin_frequency_days', 'next_checkin_date',
        'plan_id', 'plan_name', 'price_monthly', 'billing_frequency', 'payment_status',
        'next_due_date', 'last_paid_at', 'avatar_url'
    ],
    checkins: ['id', 'trainer_id', 'client_id', 'date', 'weight', 'body_fat', 'lean_mass', 'measurements', 'observations', 'photos', 'coach_note'],
    workouts: ['id', 'trainer_id', 'name', 'description', 'structure'],
    assigned_workouts: [
        'id', 'trainer_id', 'client_id', 'name', 'origin_template_id', 'is_customized',
        'structure', 'valid_until', 'scheduled_days', 'notes', 'is_presential', 'start_time', 'end_time'
    ],
    workout_logs: ['id', 'client_id', 'workout_id', 'date', 'completed_at', 'exercises_log'],
    recipes: [
        'id', 'trainer_id', 'recipe_code', 'name', 'meal_type', 'servings', 'prep_time_min',
        'instructions', 'ingredients', 'macros_calories', 'macros_protein_g', 'macros_carbs_g',
        'macros_fat_g', 'image_url', 'is_base_template'
    ],
    plans: [
        'id', 'trainer_id', 'name', 'price_monthly', 'description', 'routine_frequency',
        'calls_frequency', 'includes_nutrition', 'includes_presential'
    ],
    payments: ['id', 'trainer_id', 'client_id', 'paid_at', 'amount', 'method', 'note'],
    weekly_meal_plans: ['id', 'client_id', 'status', 'start_date', 'review_date'],
    weekly_meal_plan_days: ['id', 'plan_id', 'day_of_week'],
    weekly_meal_plan_meals: ['id', 'day_id', 'name', 'sort_order', 'is_skipped'],
    weekly_meal_plan_items: ['id', 'meal_id', 'recipe_id', 'custom_name', 'portions', 'completed']
}

const CHECKIN_PHOTO_URLS = {
    source: 'Pexels (free stock)',
    urls: [
        'https://images.pexels.com/photos/20110495/pexels-photo-20110495.jpeg?cs=srgb&dl=pexels-camviustudio-20110495.jpg&fm=jpg',
        'https://images.pexels.com/photos/20110447/pexels-photo-20110447.jpeg?cs=srgb&dl=pexels-camviustudio-20110447.jpg&fm=jpg',
        'https://images.pexels.com/photos/25315916/pexels-photo-25315916.jpeg?cs=srgb&dl=pexels-giovanni-caprio-721210307-25315916.jpg&fm=jpg',
        'https://images.pexels.com/photos/18060116/pexels-photo-18060116.jpeg?cs=srgb&dl=pexels-marcuschanmedia-18060116.jpg&fm=jpg',
        'https://images.pexels.com/photos/18060191/pexels-photo-18060191.jpeg?cs=srgb&dl=pexels-marcuschanmedia-18060191.jpg&fm=jpg',
        'https://images.pexels.com/photos/18060021/pexels-photo-18060021.jpeg?cs=srgb&dl=pexels-marcuschanmedia-18060021.jpg&fm=jpg',
        'https://images.pexels.com/photos/3838941/pexels-photo-3838941.jpeg?cs=srgb&dl=pexels-olly-3838941.jpg&fm=jpg',
        'https://images.pexels.com/photos/3112004/pexels-photo-3112004.jpeg?cs=srgb&dl=pexels-estudiopolaroid-3112004.jpg&fm=jpg',
        'https://images.pexels.com/photos/11219266/pexels-photo-11219266.jpeg?cs=srgb&dl=pexels-sarazhizmailov-11219266.jpg&fm=jpg'
    ]
}

const clientSeeds: ClientSeed[] = [
    {
        fullName: 'Santiago Ferreyra',
        phone: '+54 9 11 6123-7781',
        birthDate: '1993-04-19',
        height: 178,
        gender: 'male',
        initialWeight: 92.4,
        initialBodyFat: 24.5,
        currentWeight: 86.7,
        goalSpecific: 'fat_loss',
        mainGoal: 'fat_loss',
        goalText: 'Bajar grasa sin perder fuerza y volver a competir en futsal.',
        timeframe: '3-6 months',
        activityLevel: 'moderate',
        workType: 'mixed',
        trainingFrequency: 4,
        checkinFrequencyDays: 7,
        nextCheckinOffsetDays: -2,
        dietaryPreference: 'high_protein',
        mealsPerDay: 4,
        dietExperience: 'intermediate',
        dietaryOther: 'Prefiere cenar temprano por rutina laboral.',
        allergens: ['Lactosa'],
        injuries: [{ name: 'Lumbalgia leve', severity: 'low', status: 'managed' }],
        trainingAvailability: {
            days_per_week: 4,
            preferred_days: ['Lunes', 'Martes', 'Jueves', 'Sabado'],
            preferred_time: 'evening',
            duration_minutes: 70
        },
        targetCalories: 2350,
        targetProtein: 185,
        targetCarbs: 220,
        targetFats: 70,
        targetWeight: 82,
        targetFat: 16,
        dailyStepsTarget: 10000,
        planSlug: 'pro',
        paymentScenario: 'paid',
        photoSet: {
            avatar: CHECKIN_PHOTO_URLS.urls[0],
            front: [CHECKIN_PHOTO_URLS.urls[0], CHECKIN_PHOTO_URLS.urls[6]],
            profile: [CHECKIN_PHOTO_URLS.urls[1], CHECKIN_PHOTO_URLS.urls[5]],
            back: [CHECKIN_PHOTO_URLS.urls[7], CHECKIN_PHOTO_URLS.urls[2]]
        },
        checkinTrend: {
            weights: [92.4, 91.1, 90.3, 89.2, 87.8, 86.7],
            bodyFat: [24.5, 23.9, 23.1, 22.4, 21.3, 20.7],
            waist: [101, 100, 98, 96, 94, 92],
            chest: [108, 108, 107, 107, 106, 106],
            hips: [104, 103, 103, 102, 101, 100],
            arm: [38, 38, 39, 39, 39, 40],
            thigh: [62, 62, 61, 61, 60, 60],
            calf: [40, 40, 40, 39, 39, 39]
        }
    },
    {
        fullName: 'Matias Ocampo',
        phone: '+54 9 11 4518-2209',
        birthDate: '1998-09-02',
        height: 184,
        gender: 'male',
        initialWeight: 73.2,
        initialBodyFat: 14.8,
        currentWeight: 76.4,
        goalSpecific: 'muscle_gain',
        mainGoal: 'muscle_gain',
        goalText: 'Subir masa muscular y mejorar rendimiento para rugby amateur.',
        timeframe: '6+ months',
        activityLevel: 'active',
        workType: 'physical',
        trainingFrequency: 5,
        checkinFrequencyDays: 10,
        nextCheckinOffsetDays: 1,
        dietaryPreference: 'sin_restricciones',
        mealsPerDay: 5,
        dietExperience: 'advanced',
        dietaryOther: 'Le cuesta llegar a carbohidratos en dias de partido.',
        allergens: [],
        injuries: [{ name: 'Esguince de tobillo previo', severity: 'low', status: 'managed' }],
        trainingAvailability: {
            days_per_week: 5,
            preferred_days: ['Lunes', 'Martes', 'Miercoles', 'Viernes', 'Sabado'],
            preferred_time: 'afternoon',
            duration_minutes: 90
        },
        targetCalories: 3200,
        targetProtein: 185,
        targetCarbs: 420,
        targetFats: 85,
        targetWeight: 80,
        targetFat: 13,
        dailyStepsTarget: 9000,
        planSlug: 'base',
        paymentScenario: 'pending_with_history',
        photoSet: {
            avatar: CHECKIN_PHOTO_URLS.urls[3],
            front: [CHECKIN_PHOTO_URLS.urls[3], CHECKIN_PHOTO_URLS.urls[4]],
            profile: [CHECKIN_PHOTO_URLS.urls[5], CHECKIN_PHOTO_URLS.urls[8]],
            back: [CHECKIN_PHOTO_URLS.urls[7], CHECKIN_PHOTO_URLS.urls[2]]
        },
        checkinTrend: {
            weights: [73.2, 73.8, 74.3, 75.0, 75.8, 76.4],
            bodyFat: [14.8, 14.7, 14.9, 14.6, 14.5, 14.4],
            waist: [80, 80, 81, 81, 82, 82],
            chest: [100, 101, 102, 103, 104, 105],
            hips: [95, 95, 96, 96, 97, 97],
            arm: [34, 35, 35, 36, 36, 37],
            thigh: [56, 57, 57, 58, 58, 59],
            calf: [37, 37, 38, 38, 38, 39]
        }
    },
    {
        fullName: 'Nicolas Varela',
        phone: '+54 9 11 5830-4492',
        birthDate: '1989-12-11',
        height: 175,
        gender: 'male',
        initialWeight: 84.0,
        initialBodyFat: 21.0,
        currentWeight: 83.2,
        goalSpecific: 'recomp',
        mainGoal: 'recomp',
        goalText: 'Bajar cintura y mejorar postura por dolor de espalda de oficina.',
        timeframe: '3-6 months',
        activityLevel: 'light',
        workType: 'sedentary',
        trainingFrequency: 3,
        checkinFrequencyDays: 14,
        nextCheckinOffsetDays: 10,
        dietaryPreference: 'keto',
        mealsPerDay: 3,
        dietExperience: 'beginner',
        dietaryOther: 'Necesita opciones simples para meal prep dominical.',
        allergens: ['Gluten'],
        injuries: [{ name: 'Dolor cervical por escritorio', severity: 'medium', status: 'in_progress' }],
        trainingAvailability: {
            days_per_week: 3,
            preferred_days: ['Martes', 'Jueves', 'Sabado'],
            preferred_time: 'morning',
            duration_minutes: 60
        },
        targetCalories: 2250,
        targetProtein: 170,
        targetCarbs: 130,
        targetFats: 100,
        targetWeight: 79,
        targetFat: 17,
        dailyStepsTarget: 8500,
        planSlug: 'base',
        paymentScenario: 'pending_without_history',
        photoSet: {
            avatar: CHECKIN_PHOTO_URLS.urls[6],
            front: [CHECKIN_PHOTO_URLS.urls[6], CHECKIN_PHOTO_URLS.urls[0]],
            profile: [CHECKIN_PHOTO_URLS.urls[1], CHECKIN_PHOTO_URLS.urls[3]],
            back: [CHECKIN_PHOTO_URLS.urls[7], CHECKIN_PHOTO_URLS.urls[2]]
        },
        checkinTrend: {
            weights: [84.0, 83.8, 83.7, 83.5, 83.4, 83.2],
            bodyFat: [21.0, 20.8, 20.7, 20.5, 20.3, 20.0],
            waist: [95, 95, 94, 94, 93, 92],
            chest: [103, 103, 103, 102, 102, 102],
            hips: [101, 101, 100, 100, 99, 99],
            arm: [35, 35, 35, 35, 36, 36],
            thigh: [59, 59, 59, 58, 58, 58],
            calf: [38, 38, 38, 38, 38, 38]
        }
    },
    {
        fullName: 'Franco Benitez',
        phone: '+54 9 11 6342-1120',
        birthDate: '1991-06-25',
        height: 181,
        gender: 'male',
        initialWeight: 88.5,
        initialBodyFat: 19.0,
        currentWeight: 87.9,
        goalSpecific: 'performance',
        mainGoal: 'performance',
        goalText: 'Recuperar potencia para triatlon sprint y mejorar resistencia.',
        timeframe: '6+ months',
        activityLevel: 'very_active',
        workType: 'mixed',
        trainingFrequency: 6,
        checkinFrequencyDays: 7,
        nextCheckinOffsetDays: -1,
        dietaryPreference: 'sin_restricciones',
        mealsPerDay: 5,
        dietExperience: 'intermediate',
        dietaryOther: 'Tolera mejor comidas liquidas pre-entreno.',
        allergens: [],
        injuries: [{ name: 'Sobrecarga de isquios', severity: 'low', status: 'managed' }],
        trainingAvailability: {
            days_per_week: 6,
            preferred_days: ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'],
            preferred_time: 'morning',
            duration_minutes: 75
        },
        targetCalories: 2950,
        targetProtein: 180,
        targetCarbs: 360,
        targetFats: 85,
        targetWeight: 86,
        targetFat: 14,
        dailyStepsTarget: 12000,
        planSlug: 'elite',
        paymentScenario: 'overdue',
        photoSet: {
            avatar: CHECKIN_PHOTO_URLS.urls[8],
            front: [CHECKIN_PHOTO_URLS.urls[8], CHECKIN_PHOTO_URLS.urls[4]],
            profile: [CHECKIN_PHOTO_URLS.urls[5], CHECKIN_PHOTO_URLS.urls[1]],
            back: [CHECKIN_PHOTO_URLS.urls[7], CHECKIN_PHOTO_URLS.urls[2]]
        },
        checkinTrend: {
            weights: [88.5, 88.1, 88.0, 87.6, 88.2, 87.9],
            bodyFat: [19.0, 18.8, 18.7, 18.4, 18.6, 18.3],
            waist: [90, 89, 89, 88, 88, 87],
            chest: [106, 106, 107, 107, 107, 108],
            hips: [99, 99, 99, 98, 98, 98],
            arm: [37, 37, 38, 38, 38, 39],
            thigh: [61, 61, 61, 62, 62, 62],
            calf: [39, 39, 39, 40, 40, 40]
        }
    }
]

const workoutTemplates = [
    {
        name: 'DEMO Fuerza Torso/Pierna',
        description: 'Rutina base orientada a fuerza e hipertrofia con progresion de cargas.',
        structure: [
            {
                name: 'Sentadilla trasera con barra',
                category: 'Piernas',
                sets: '4',
                reps: '6-8',
                weight: '80',
                rest: '150',
                sets_detail: [
                    { reps: '8', weight: '75', rest: '150' },
                    { reps: '8', weight: '80', rest: '150' },
                    { reps: '7', weight: '82.5', rest: '150' },
                    { reps: '6', weight: '85', rest: '180' }
                ]
            },
            {
                name: 'Press de banca plano',
                category: 'Pecho',
                sets: '4',
                reps: '6-8',
                weight: '70',
                rest: '120',
                sets_detail: [
                    { reps: '8', weight: '65', rest: '120' },
                    { reps: '8', weight: '67.5', rest: '120' },
                    { reps: '7', weight: '70', rest: '150' },
                    { reps: '6', weight: '72.5', rest: '150' }
                ]
            },
            {
                name: 'Remo con barra',
                category: 'Espalda',
                sets: '4',
                reps: '8-10',
                weight: '60',
                rest: '90',
                sets_detail: [
                    { reps: '10', weight: '55', rest: '90' },
                    { reps: '10', weight: '57.5', rest: '90' },
                    { reps: '9', weight: '60', rest: '120' },
                    { reps: '8', weight: '62.5', rest: '120' }
                ]
            },
            {
                name: 'Plancha frontal',
                category: 'Core',
                sets: '3',
                reps: '45-60 seg',
                weight: '0',
                rest: '60',
                sets_detail: [
                    { reps: '45 seg', weight: '0', rest: '60' },
                    { reps: '50 seg', weight: '0', rest: '60' },
                    { reps: '60 seg', weight: '0', rest: '60' }
                ]
            }
        ]
    },
    {
        name: 'DEMO Hipertrofia Upper/Lower',
        description: 'Bloque de volumen para ganancia muscular con enfasis en tecnica.',
        structure: [
            {
                name: 'Prensa inclinada',
                category: 'Piernas',
                sets: '4',
                reps: '10-12',
                weight: '160',
                rest: '120',
                sets_detail: [
                    { reps: '12', weight: '140', rest: '90' },
                    { reps: '12', weight: '150', rest: '90' },
                    { reps: '11', weight: '160', rest: '120' },
                    { reps: '10', weight: '170', rest: '120' }
                ]
            },
            {
                name: 'Press inclinado con mancuernas',
                category: 'Pecho',
                sets: '4',
                reps: '10-12',
                weight: '28',
                rest: '90',
                sets_detail: [
                    { reps: '12', weight: '24', rest: '90' },
                    { reps: '12', weight: '26', rest: '90' },
                    { reps: '11', weight: '28', rest: '90' },
                    { reps: '10', weight: '30', rest: '120' }
                ]
            },
            {
                name: 'Jalon al pecho',
                category: 'Espalda',
                sets: '4',
                reps: '10-12',
                weight: '65',
                rest: '90',
                sets_detail: [
                    { reps: '12', weight: '55', rest: '90' },
                    { reps: '12', weight: '60', rest: '90' },
                    { reps: '11', weight: '65', rest: '120' },
                    { reps: '10', weight: '70', rest: '120' }
                ]
            },
            {
                name: 'Curl de biceps alternado',
                category: 'Brazos',
                sets: '3',
                reps: '12',
                weight: '14',
                rest: '60',
                sets_detail: [
                    { reps: '12', weight: '12', rest: '60' },
                    { reps: '12', weight: '14', rest: '60' },
                    { reps: '10', weight: '16', rest: '75' }
                ]
            }
        ]
    },
    {
        name: 'DEMO Metabolico y Cardio',
        description: 'Trabajo mixto de fuerza-resistencia con bloques de cardio por intervalos.',
        structure: [
            {
                name: 'Kettlebell swing',
                category: 'Full Body',
                sets: '4',
                reps: '15',
                weight: '24',
                rest: '60',
                sets_detail: [
                    { reps: '15', weight: '20', rest: '60' },
                    { reps: '15', weight: '22', rest: '60' },
                    { reps: '15', weight: '24', rest: '60' },
                    { reps: '12', weight: '24', rest: '75' }
                ]
            },
            {
                name: 'Burpees',
                category: 'Full Body',
                sets: '4',
                reps: '12',
                weight: '0',
                rest: '60',
                sets_detail: [
                    { reps: '12', weight: '0', rest: '60' },
                    { reps: '12', weight: '0', rest: '60' },
                    { reps: '10', weight: '0', rest: '75' },
                    { reps: '10', weight: '0', rest: '75' }
                ]
            },
            {
                name: 'Bicicleta estatica HIIT',
                category: 'Cardio',
                sets: '1',
                reps: '12 min',
                weight: '0',
                rest: '0',
                cardio_config: {
                    type: 'intervals',
                    work_time: 30,
                    rest_time: 30,
                    rounds: 12
                }
            }
        ]
    }
]

const recipeSeeds = [
    {
        name: 'DEMO Bowl de quinoa con pollo',
        meal_type: 'almuerzo',
        servings: 2,
        prep_time_min: 20,
        instructions: '1) Cocinar la quinoa. 2) Dorar pollo en cubos. 3) Saltear vegetales y mezclar todo. 4) Ajustar sal, limon y aceite de oliva.',
        ingredients: [
            { ingredient_code: 'pollo_pechuga', ingredient_name: 'Pechuga de pollo', grams: 280, kcal_100g: 120, protein_100g: 23, carbs_100g: 0, fat_100g: 2.6, fiber_100g: 0 },
            { ingredient_code: 'quinoa', ingredient_name: 'Quinoa cocida', grams: 260, kcal_100g: 120, protein_100g: 4.4, carbs_100g: 21, fat_100g: 1.9, fiber_100g: 2.8 },
            { ingredient_code: 'morron_rojo', ingredient_name: 'Morron rojo', grams: 120, kcal_100g: 31, protein_100g: 1, carbs_100g: 6, fat_100g: 0.3, fiber_100g: 2.1 },
            { ingredient_code: 'aceite_oliva', ingredient_name: 'Aceite de oliva', grams: 14, kcal_100g: 884, protein_100g: 0, carbs_100g: 0, fat_100g: 100, fiber_100g: 0 }
        ],
        macros_calories: 505,
        macros_protein_g: 44,
        macros_carbs_g: 35,
        macros_fat_g: 18
    },
    {
        name: 'DEMO Omelette proteico mediterraneo',
        meal_type: 'desayuno',
        servings: 1,
        prep_time_min: 12,
        instructions: '1) Batir huevos y claras. 2) Saltear espinaca y tomate. 3) Cocinar omelette y terminar con queso magro.',
        ingredients: [
            { ingredient_code: 'huevo', ingredient_name: 'Huevo', grams: 120, kcal_100g: 143, protein_100g: 12.6, carbs_100g: 0.7, fat_100g: 9.5, fiber_100g: 0 },
            { ingredient_code: 'claras', ingredient_name: 'Claras pasteurizadas', grams: 180, kcal_100g: 52, protein_100g: 11, carbs_100g: 0.7, fat_100g: 0.2, fiber_100g: 0 },
            { ingredient_code: 'espinaca', ingredient_name: 'Espinaca', grams: 80, kcal_100g: 23, protein_100g: 2.9, carbs_100g: 3.6, fat_100g: 0.4, fiber_100g: 2.2 },
            { ingredient_code: 'queso_magro', ingredient_name: 'Queso magro', grams: 40, kcal_100g: 180, protein_100g: 21, carbs_100g: 2, fat_100g: 9, fiber_100g: 0 }
        ],
        macros_calories: 430,
        macros_protein_g: 53,
        macros_carbs_g: 7,
        macros_fat_g: 20
    },
    {
        name: 'DEMO Yogur griego con avena y frutos rojos',
        meal_type: 'snack',
        servings: 1,
        prep_time_min: 6,
        instructions: '1) Mezclar yogur griego con avena. 2) Agregar frutos rojos y semillas. 3) Endulzar con canela si hace falta.',
        ingredients: [
            { ingredient_code: 'yogur_griego', ingredient_name: 'Yogur griego natural', grams: 220, kcal_100g: 97, protein_100g: 9, carbs_100g: 4, fat_100g: 5, fiber_100g: 0 },
            { ingredient_code: 'avena', ingredient_name: 'Avena', grams: 50, kcal_100g: 389, protein_100g: 16.9, carbs_100g: 66.3, fat_100g: 6.9, fiber_100g: 10.6 },
            { ingredient_code: 'frutos_rojos', ingredient_name: 'Frutos rojos', grams: 100, kcal_100g: 57, protein_100g: 0.7, carbs_100g: 14, fat_100g: 0.3, fiber_100g: 5 },
            { ingredient_code: 'chia', ingredient_name: 'Semillas de chia', grams: 10, kcal_100g: 486, protein_100g: 16.5, carbs_100g: 42, fat_100g: 31, fiber_100g: 34 }
        ],
        macros_calories: 520,
        macros_protein_g: 34,
        macros_carbs_g: 55,
        macros_fat_g: 19
    },
    {
        name: 'DEMO Salmon con pure rustico',
        meal_type: 'cena',
        servings: 2,
        prep_time_min: 28,
        instructions: '1) Hornear salmon 12-15 min. 2) Hervir papa y batata, luego pisar con oliva y pimienta. 3) Servir con ensalada verde.',
        ingredients: [
            { ingredient_code: 'salmon', ingredient_name: 'Salmon', grams: 300, kcal_100g: 208, protein_100g: 20, carbs_100g: 0, fat_100g: 13, fiber_100g: 0 },
            { ingredient_code: 'papa', ingredient_name: 'Papa', grams: 260, kcal_100g: 77, protein_100g: 2, carbs_100g: 17, fat_100g: 0.1, fiber_100g: 2.2 },
            { ingredient_code: 'batata', ingredient_name: 'Batata', grams: 220, kcal_100g: 86, protein_100g: 1.6, carbs_100g: 20, fat_100g: 0.1, fiber_100g: 3 },
            { ingredient_code: 'aceite_oliva', ingredient_name: 'Aceite de oliva', grams: 16, kcal_100g: 884, protein_100g: 0, carbs_100g: 0, fat_100g: 100, fiber_100g: 0 }
        ],
        macros_calories: 610,
        macros_protein_g: 35,
        macros_carbs_g: 40,
        macros_fat_g: 33
    }
]

const planSeeds = [
    {
        slug: 'base' as const,
        name: 'DEMO Base',
        price_monthly: 38000,
        description: 'Seguimiento mensual por chat, plan de entrenamiento y ajustes basicos.',
        routine_frequency: 'monthly' as const,
        calls_frequency: 'none' as const,
        includes_nutrition: false,
        includes_presential: false
    },
    {
        slug: 'pro' as const,
        name: 'DEMO Pro',
        price_monthly: 56000,
        description: 'Ajustes quincenales, nutricion personalizada y seguimiento de adherencia.',
        routine_frequency: 'biweekly' as const,
        calls_frequency: 'monthly' as const,
        includes_nutrition: true,
        includes_presential: false
    },
    {
        slug: 'elite' as const,
        name: 'DEMO Elite',
        price_monthly: 82000,
        description: 'Seguimiento premium con sesiones presenciales y control de performance.',
        routine_frequency: 'weekly' as const,
        calls_frequency: 'weekly' as const,
        includes_nutrition: true,
        includes_presential: true
    }
]

function parseArgs(argv: string[]): ScriptOptions {
    const raw: Record<string, string> = {}

    for (const arg of argv) {
        if (!arg.startsWith('--')) continue
        const withoutPrefix = arg.slice(2)
        const eqIndex = withoutPrefix.indexOf('=')
        if (eqIndex === -1) {
            raw[withoutPrefix] = 'true'
            continue
        }
        const key = withoutPrefix.slice(0, eqIndex)
        const value = withoutPrefix.slice(eqIndex + 1)
        raw[key] = value
    }

    const mode = (raw.mode || 'recreate') as SeedMode
    if (!['recreate', 'create', 'cleanup'].includes(mode)) {
        throw new Error(`Invalid --mode: ${raw.mode}. Use recreate|create|cleanup.`)
    }

    const seedDate = raw['seed-date'] || getTodayUTCDateString()
    if (!isDateOnly(seedDate)) {
        throw new Error(`Invalid --seed-date: ${seedDate}. Expected YYYY-MM-DD.`)
    }

    const manifestPath = raw.manifest
        ? path.resolve(process.cwd(), raw.manifest)
        : DEFAULT_MANIFEST_PATH

    return { mode, seedDate, manifestPath }
}

function getTodayUTCDateString(): string {
    const now = new Date()
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

function isDateOnly(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const [y, m, d] = value.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d))
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

function addDays(dateOnly: string, days: number): string {
    const [y, m, d] = dateOnly.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d + days))
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

function calculateNextDueDate(paidAt: string, billingFrequency: string): string {
    const [year, month, day] = paidAt.split('-').map(Number)

    if (billingFrequency === 'weekly' || billingFrequency === 'biweekly') {
        const daysToAdd = billingFrequency === 'weekly' ? 7 : 14
        const target = new Date(Date.UTC(year, month - 1, day + daysToAdd))
        return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}-${String(target.getUTCDate()).padStart(2, '0')}`
    }

    const monthsToAdd = billingFrequency === 'quarterly'
        ? 3
        : billingFrequency === 'biannual'
            ? 6
            : 1

    let targetMonth = month + monthsToAdd
    const targetYear = year + Math.floor((targetMonth - 1) / 12)
    targetMonth = ((targetMonth - 1) % 12) + 1

    const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate()
    const targetDay = Math.min(day, lastDayOfTargetMonth)

    return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
}

function calculatePaymentStatus(nextDueDate: string | null, today: string): 'paid' | 'pending' | 'overdue' {
    if (!nextDueDate) return 'pending'

    const diffDays = diffDateOnly(nextDueDate, today)
    if (diffDays < 0) return 'overdue'
    if (diffDays <= 7) return 'pending'
    return 'paid'
}

function diffDateOnly(left: string, right: string): number {
    const l = toUtcDate(left)
    const r = toUtcDate(right)
    const diffMs = l.getTime() - r.getTime()
    return Math.round(diffMs / 86400000)
}

function toUtcDate(dateOnly: string): Date {
    const [y, m, d] = dateOnly.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d))
}

function randomPassword(length = 18): string {
    const bytes = crypto.randomBytes(length)
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*_-'
    let out = ''
    for (let i = 0; i < length; i += 1) {
        out += alphabet[bytes[i] % alphabet.length]
    }
    return out
}

function assertEnvVars() {
    const missing = REQUIRED_ENV.filter((key) => !process.env[key])
    if (missing.length > 0) {
        throw new Error(`Missing required env vars: ${missing.join(', ')}`)
    }
}

function createAdminSupabase(): SupabaseClient {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}

async function preflightSchema(supabase: SupabaseClient) {
    const errors: string[] = []

    for (const [table, columns] of Object.entries(REQUIRED_TABLE_COLUMNS)) {
        const selectList = columns.join(',')
        const { error } = await supabase
            .from(table)
            .select(selectList)
            .limit(1)

        if (error) {
            errors.push(`- ${table}: ${error.message}`)
        }
    }

    if (errors.length > 0) {
        throw new Error(`Schema preflight failed:\n${errors.join('\n')}`)
    }
}

async function ensureRequiredBuckets(supabase: SupabaseClient) {
    const required = ['client-avatars', 'checkin-images']
    const { data, error } = await supabase.storage.listBuckets()

    if (error) {
        throw new Error(`Could not list storage buckets: ${error.message}`)
    }

    const buckets = data || []

    for (const bucketName of required) {
        const existing = buckets.find((b) => b.name === bucketName)

        if (!existing) {
            const { error: createError } = await supabase.storage.createBucket(bucketName, { public: true })
            if (createError) {
                throw new Error(`Could not create bucket ${bucketName}: ${createError.message}`)
            }
            continue
        }

        if (!existing.public) {
            const { error: updateError } = await supabase.storage.updateBucket(bucketName, { public: true })
            if (updateError) {
                throw new Error(`Could not set bucket ${bucketName} to public: ${updateError.message}`)
            }
        }
    }
}

async function readManifest(manifestPath: string): Promise<DemoManifest | null> {
    try {
        const raw = await fs.readFile(manifestPath, 'utf-8')
        return JSON.parse(raw) as DemoManifest
    } catch {
        return null
    }
}

async function writeManifest(manifestPath: string, manifest: DemoManifest) {
    await fs.mkdir(path.dirname(manifestPath), { recursive: true })
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
}

async function removeManifest(manifestPath: string) {
    try {
        await fs.unlink(manifestPath)
    } catch {
        // ignore
    }
}

async function listAllAuthUsers(supabase: SupabaseClient) {
    const users: Array<{ id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }> = []

    let page = 1
    const perPage = 200

    while (true) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
        if (error) {
            throw new Error(`Could not list auth users: ${error.message}`)
        }

        const batch = data?.users || []
        users.push(...batch.map((u) => ({
            id: u.id,
            email: u.email,
            user_metadata: (u.user_metadata || null) as Record<string, unknown> | null
        })))

        if (batch.length < perPage) break
        page += 1
    }

    return users
}

function isDemoCoachEmail(email: string | null | undefined): boolean {
    if (!email) return false
    return email.startsWith('demo.coach+') && email.endsWith('@orbit-demo.local')
}

function isDemoClientEmail(email: string | null | undefined): boolean {
    if (!email) return false
    return email.startsWith('demo.client') && email.endsWith('@orbit-demo.local')
}

function hasDemoTag(value: unknown): boolean {
    if (!value || typeof value !== 'object') return false
    const record = value as Record<string, unknown>
    return record.demo_tag === DEMO_TAG
}

async function cleanupDemoData(supabase: SupabaseClient, manifestPath: string) {
    const manifest = await readManifest(manifestPath)
    const authUsers = await listAllAuthUsers(supabase)

    const demoCoachUserIds = new Set<string>()
    const demoClientUserIds = new Set<string>()

    if (manifest?.coach?.userId) {
        demoCoachUserIds.add(manifest.coach.userId)
    }

    for (const authUser of authUsers) {
        const email = authUser.email || ''
        const metadataTag = authUser.user_metadata?.demo_tag
        if (isDemoCoachEmail(email) || (metadataTag === DEMO_TAG && authUser.user_metadata?.role === 'coach')) {
            demoCoachUserIds.add(authUser.id)
        }
        if (isDemoClientEmail(email) || (metadataTag === DEMO_TAG && authUser.user_metadata?.role === 'client')) {
            demoClientUserIds.add(authUser.id)
        }
    }

    if (manifest?.clients?.length) {
        for (const item of manifest.clients) {
            if (item.authUserId) demoClientUserIds.add(item.authUserId)
        }
    }

    const allClientIds = new Set<string>()

    const coachIdList = Array.from(demoCoachUserIds)
    for (let coachIndex = 0; coachIndex < coachIdList.length; coachIndex += 1) {
        const coachId = coachIdList[coachIndex]
        const { data: coachClients, error } = await supabase
            .from('clients')
            .select('id,user_id,email,goals,dietary_info')
            .eq('trainer_id', coachId)

        if (error) {
            throw new Error(`Cleanup failed while listing clients for coach ${coachId}: ${error.message}`)
        }

        for (const c of coachClients || []) {
            const tagged = hasDemoTag(c.goals) || hasDemoTag(c.dietary_info) || isDemoClientEmail(c.email)
            if (tagged) {
                allClientIds.add(c.id)
                if (c.user_id) demoClientUserIds.add(c.user_id)
            }
        }
    }

    if (manifest?.clients?.length) {
        for (const item of manifest.clients) {
            allClientIds.add(item.clientId)
        }
    }

    const clientIds = Array.from(allClientIds)

    if (clientIds.length > 0) {
        const { data: plans } = await supabase
            .from('weekly_meal_plans')
            .select('id')
            .in('client_id', clientIds)

        const planIds = (plans || []).map((p) => p.id)

        let dayIds: string[] = []
        if (planIds.length > 0) {
            const { data: days } = await supabase
                .from('weekly_meal_plan_days')
                .select('id')
                .in('plan_id', planIds)
            dayIds = (days || []).map((d) => d.id)
        }

        let mealIds: string[] = []
        if (dayIds.length > 0) {
            const { data: meals } = await supabase
                .from('weekly_meal_plan_meals')
                .select('id')
                .in('day_id', dayIds)
            mealIds = (meals || []).map((m) => m.id)
        }

        if (mealIds.length > 0) {
            await supabase.from('weekly_meal_plan_items').delete().in('meal_id', mealIds)
            await supabase.from('weekly_meal_plan_meals').delete().in('id', mealIds)
        }

        if (dayIds.length > 0) {
            await supabase.from('weekly_meal_plan_days').delete().in('id', dayIds)
        }

        if (planIds.length > 0) {
            await supabase.from('weekly_meal_plans').delete().in('id', planIds)
        }

        await supabase.from('workout_logs').delete().in('client_id', clientIds)
        await supabase.from('checkins').delete().in('client_id', clientIds)
        await supabase.from('payments').delete().in('client_id', clientIds)
        await supabase.from('assigned_workouts').delete().in('client_id', clientIds)
        await supabase.from('clients').delete().in('id', clientIds)
    }

    const coachIds = Array.from(demoCoachUserIds)
    if (coachIds.length > 0) {
        await supabase.from('payments').delete().in('trainer_id', coachIds)
        await supabase.from('assigned_workouts').delete().in('trainer_id', coachIds)
        await supabase.from('workouts').delete().in('trainer_id', coachIds)
        await supabase.from('recipes').delete().in('trainer_id', coachIds)
        await supabase.from('plans').delete().in('trainer_id', coachIds)
    }

    const authToDelete = [...Array.from(demoClientUserIds), ...Array.from(demoCoachUserIds)]
    for (const userId of authToDelete) {
        const { error } = await supabase.auth.admin.deleteUser(userId)
        if (error && !error.message.toLowerCase().includes('not found')) {
            throw new Error(`Failed deleting auth user ${userId}: ${error.message}`)
        }
    }

    await removeManifest(manifestPath)

    return {
        cleanedCoaches: coachIds.length,
        cleanedClients: clientIds.length,
        cleanedAuthUsers: authToDelete.length
    }
}

async function createAuthUser(supabase: SupabaseClient, params: {
    email: string
    password: string
    fullName: string
    role: 'coach' | 'client'
}) {
    const { data, error } = await supabase.auth.admin.createUser({
        email: params.email,
        password: params.password,
        email_confirm: true,
        user_metadata: {
            full_name: params.fullName,
            role: params.role,
            demo_tag: DEMO_TAG,
            is_demo: true
        }
    })

    if (error || !data.user) {
        throw new Error(`Could not create auth user ${params.email}: ${error?.message || 'unknown error'}`)
    }

    const upsertProfilePayload = {
        id: data.user.id,
        full_name: params.fullName,
        email: params.email
    }

    const { error: profileError } = await supabase
        .from('profiles')
        .upsert(upsertProfilePayload, { onConflict: 'id' })

    if (profileError) {
        throw new Error(`Could not upsert profile for ${params.email}: ${profileError.message}`)
    }

    return data.user
}

async function uploadImageAndGetUrl(supabase: SupabaseClient, params: {
    bucket: 'client-avatars' | 'checkin-images'
    path: string
    url: string
    cache: Map<string, Buffer>
}) {
    const bytes = await getImageBytes(params.url, params.cache)

    const { error: uploadError } = await supabase.storage
        .from(params.bucket)
        .upload(params.path, bytes, {
            upsert: true,
            contentType: 'image/jpeg'
        })

    if (uploadError) {
        throw new Error(`Upload failed for ${params.bucket}/${params.path}: ${uploadError.message}`)
    }

    const { data } = supabase.storage.from(params.bucket).getPublicUrl(params.path)
    return data.publicUrl
}

async function getImageBytes(url: string, cache: Map<string, Buffer>) {
    const cached = cache.get(url)
    if (cached) return cached

    const maxAttempts = 3
    let lastError: string | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 20000)

        try {
            const response = await fetch(url, { signal: controller.signal })
            clearTimeout(timeout)

            if (!response.ok) {
                lastError = `status ${response.status}`
                continue
            }

            const arr = await response.arrayBuffer()
            const buffer = Buffer.from(arr)
            cache.set(url, buffer)
            return buffer
        } catch (error) {
            clearTimeout(timeout)
            lastError = error instanceof Error ? error.message : String(error)
        }
    }

    throw new Error(`Image download failed for ${url}: ${lastError || 'unknown error'}`)
}

async function createDemoDataset(supabase: SupabaseClient, options: ScriptOptions) {
    const seedTimestamp = Date.now()
    const suffix = `${options.seedDate.replace(/-/g, '')}${seedTimestamp.toString().slice(-6)}`

    const coachEmail = `demo.coach+${suffix}@orbit-demo.local`
    const coachPassword = randomPassword()
    const coachName = `Coach Demo ${suffix.slice(-4)}`

    const coachUser = await createAuthUser(supabase, {
        email: coachEmail,
        password: coachPassword,
        fullName: coachName,
        role: 'coach'
    })
    console.log(`Coach created: ${coachEmail}`)

    const manifest: DemoManifest = {
        version: 1,
        demoTag: DEMO_TAG,
        createdAt: new Date().toISOString(),
        seedDate: options.seedDate,
        mode: options.mode,
        coach: {
            email: coachEmail,
            password: coachPassword,
            userId: coachUser.id,
            profileId: coachUser.id
        },
        clients: [],
        ids: {
            planIds: [],
            workoutTemplateIds: [],
            assignedWorkoutIds: [],
            workoutLogIds: [],
            recipeIds: [],
            weeklyMealPlanIds: [],
            weeklyMealPlanDayIds: [],
            weeklyMealPlanMealIds: [],
            weeklyMealPlanItemIds: [],
            checkinIds: [],
            paymentIds: []
        },
        photos: {
            source: CHECKIN_PHOTO_URLS.source,
            urls: CHECKIN_PHOTO_URLS.urls
        }
    }

    const imageCache = new Map<string, Buffer>()

    const createdClients: Array<{
        seed: ClientSeed
        clientId: string
        authUserId: string
        email: string
        password: string
    }> = []

    for (let i = 0; i < clientSeeds.length; i += 1) {
        const seed = clientSeeds[i]
        const clientEmail = `demo.client${i + 1}+${suffix}@orbit-demo.local`
        const clientPassword = randomPassword()
        console.log(`Creating client ${i + 1}/4: ${seed.fullName}`)

        const clientAuthUser = await createAuthUser(supabase, {
            email: clientEmail,
            password: clientPassword,
            fullName: seed.fullName,
            role: 'client'
        })

        const { data: insertedClient, error: clientInsertError } = await supabase
            .from('clients')
            .insert({
                trainer_id: coachUser.id,
                user_id: clientAuthUser.id,
                full_name: seed.fullName,
                email: clientEmail,
                phone: seed.phone,
                birth_date: seed.birthDate,
                gender: seed.gender,
                height: seed.height,
                initial_weight: seed.initialWeight,
                initial_body_fat: seed.initialBodyFat,
                current_weight: seed.currentWeight,
                goal_text: seed.goalText,
                goal_specific: seed.goalSpecific,
                main_goal: seed.mainGoal,
                goals: {
                    timeframe: seed.timeframe,
                    narrative: seed.goalText,
                    demo_tag: DEMO_TAG
                },
                activity_level: seed.activityLevel,
                work_type: seed.workType,
                training_frequency: seed.trainingFrequency,
                training_availability: {
                    ...seed.trainingAvailability,
                    demo_tag: DEMO_TAG
                },
                injuries: seed.injuries,
                dietary_info: {
                    preference: seed.dietaryPreference,
                    meals_count: seed.mealsPerDay,
                    experience: seed.dietExperience,
                    other: seed.dietaryOther,
                    allergens: seed.allergens,
                    demo_tag: DEMO_TAG
                },
                dietary_preference: seed.dietaryPreference,
                allergens: seed.allergens,
                target_calories: seed.targetCalories,
                target_protein: seed.targetProtein,
                target_carbs: seed.targetCarbs,
                target_fats: seed.targetFats,
                target_weight: seed.targetWeight,
                target_fat: seed.targetFat,
                daily_steps_target: seed.dailyStepsTarget,
                status: 'active',
                onboarding_status: 'completed',
                planning_status: 'planned',
                checkin_frequency_days: seed.checkinFrequencyDays,
                next_checkin_date: addDays(options.seedDate, seed.nextCheckinOffsetDays),
                billing_frequency: 'monthly',
                payment_status: 'pending',
                macros_is_manual: true
            })
            .select('id')
            .single()

        if (clientInsertError || !insertedClient) {
            throw new Error(`Could not insert client ${seed.fullName}: ${clientInsertError?.message || 'unknown error'}`)
        }

        const avatarPath = `${clientAuthUser.id}/avatar-${suffix}.jpg`
        const avatarUrl = await uploadImageAndGetUrl(supabase, {
            bucket: 'client-avatars',
            path: avatarPath,
            url: seed.photoSet.avatar,
            cache: imageCache
        })

        const { error: avatarUpdateError } = await supabase
            .from('clients')
            .update({ avatar_url: avatarUrl })
            .eq('id', insertedClient.id)

        if (avatarUpdateError) {
            throw new Error(`Could not set avatar for ${seed.fullName}: ${avatarUpdateError.message}`)
        }

        createdClients.push({
            seed,
            clientId: insertedClient.id,
            authUserId: clientAuthUser.id,
            email: clientEmail,
            password: clientPassword
        })
    }

    for (const created of createdClients) {
        console.log(`Seeding check-ins for ${created.seed.fullName}`)
        const checkinDates = [42, 35, 28, 21, 14, 7].map((daysAgo) => addDays(options.seedDate, -daysAgo))

        for (let i = 0; i < checkinDates.length; i += 1) {
            const checkinDate = checkinDates[i]

            const frontUrl = created.seed.photoSet.front[i % created.seed.photoSet.front.length]
            const profileUrl = created.seed.photoSet.profile[i % created.seed.photoSet.profile.length]
            const backUrl = created.seed.photoSet.back[i % created.seed.photoSet.back.length]

            const frontPath = `${created.authUserId}/checkins/${checkinDate}-front.jpg`
            const profilePath = `${created.authUserId}/checkins/${checkinDate}-profile.jpg`
            const backPath = `${created.authUserId}/checkins/${checkinDate}-back.jpg`

            const frontPublicUrl = await uploadImageAndGetUrl(supabase, {
                bucket: 'checkin-images',
                path: frontPath,
                url: frontUrl,
                cache: imageCache
            })
            const profilePublicUrl = await uploadImageAndGetUrl(supabase, {
                bucket: 'checkin-images',
                path: profilePath,
                url: profileUrl,
                cache: imageCache
            })
            const backPublicUrl = await uploadImageAndGetUrl(supabase, {
                bucket: 'checkin-images',
                path: backPath,
                url: backUrl,
                cache: imageCache
            })

            const measurements = {
                chest: created.seed.checkinTrend.chest[i],
                waist: created.seed.checkinTrend.waist[i],
                hips: created.seed.checkinTrend.hips[i],
                arm: created.seed.checkinTrend.arm[i],
                thigh: created.seed.checkinTrend.thigh[i],
                calf: created.seed.checkinTrend.calf[i]
            }

            const weight = created.seed.checkinTrend.weights[i]
            const bodyFat = created.seed.checkinTrend.bodyFat[i]
            const leanMass = Number((weight * (1 - bodyFat / 100)).toFixed(1))

            const observations = i < 2
                ? 'Adherencia parcial por agenda laboral. Se ajusta distribucion de carbos para mejorar energia.'
                : i < 4
                    ? 'Mejora sostenida en rendimiento y recuperacion. Buena tolerancia al volumen propuesto.'
                    : 'Semana estable con buena ejecucion tecnica y descanso consistente.'

            const coachNote = i === checkinDates.length - 1
                ? 'Excelente semana. Mantene hidratacion alta y repetimos estrategia de progresion para el proximo bloque.'
                : null

            const { data: insertedCheckin, error: checkinError } = await supabase
                .from('checkins')
                .insert({
                    trainer_id: manifest.coach.userId,
                    client_id: created.clientId,
                    date: checkinDate,
                    weight,
                    body_fat: bodyFat,
                    lean_mass: leanMass,
                    measurements,
                    observations,
                    coach_note: coachNote,
                    photos: [
                        { type: 'front', path: frontPath, url: frontPublicUrl },
                        { type: 'profile', path: profilePath, url: profilePublicUrl },
                        { type: 'back', path: backPath, url: backPublicUrl }
                    ]
                })
                .select('id')
                .single()

            if (checkinError || !insertedCheckin) {
                throw new Error(`Could not insert checkin for ${created.seed.fullName}: ${checkinError?.message || 'unknown error'}`)
            }

            manifest.ids.checkinIds.push(insertedCheckin.id)
        }
    }

    const workoutTemplateMap = new Map<string, string>()

    for (const template of workoutTemplates) {
        console.log(`Creating workout template: ${template.name}`)
        const { data: insertedWorkout, error } = await supabase
            .from('workouts')
            .insert({
                trainer_id: manifest.coach.userId,
                name: template.name,
                description: template.description,
                structure: template.structure
            })
            .select('id,name')
            .single()

        if (error || !insertedWorkout) {
            throw new Error(`Could not create workout template ${template.name}: ${error?.message || 'unknown error'}`)
        }

        manifest.ids.workoutTemplateIds.push(insertedWorkout.id)
        workoutTemplateMap.set(template.name, insertedWorkout.id)
    }

    const assignmentBlueprints: Array<{
        clientIndex: number
        templateName: string
        scheduled_days: string[]
        notes: string
        is_presential: boolean
        start_time: string | null
        end_time: string | null
    }> = [
            {
                clientIndex: 0,
                templateName: 'DEMO Fuerza Torso/Pierna',
                scheduled_days: ['Lunes', 'Miercoles', 'Viernes'],
                notes: 'Enfasis en tecnica de sentadilla y control de tempo en fase excentrica.',
                is_presential: false,
                start_time: null,
                end_time: null
            },
            {
                clientIndex: 1,
                templateName: 'DEMO Hipertrofia Upper/Lower',
                scheduled_days: ['Martes', 'Jueves', 'Sabado'],
                notes: 'Buscar progresion de volumen semanal y registrar RIR en ultimas series.',
                is_presential: false,
                start_time: null,
                end_time: null
            },
            {
                clientIndex: 2,
                templateName: 'DEMO Metabolico y Cardio',
                scheduled_days: ['Lunes', 'Miercoles', 'Viernes'],
                notes: 'Priorizamos adherencia, tecnica y frecuencia cardiaca en zona objetivo.',
                is_presential: true,
                start_time: '07:00',
                end_time: '08:00'
            },
            {
                clientIndex: 3,
                templateName: 'DEMO Metabolico y Cardio',
                scheduled_days: ['Martes', 'Jueves', 'Sabado'],
                notes: 'Bloque competitivo con intervalos cortos y transiciones rapidas.',
                is_presential: true,
                start_time: '06:30',
                end_time: '07:30'
            }
        ]

    const assignedWorkoutByClientId = new Map<string, string>()

    for (const blueprint of assignmentBlueprints) {
        const created = createdClients[blueprint.clientIndex]
        const template = workoutTemplates.find((w) => w.name === blueprint.templateName)
        const templateId = workoutTemplateMap.get(blueprint.templateName)
        if (!created || !template || !templateId) {
            throw new Error(`Missing assignment data for ${blueprint.templateName}`)
        }

        const { data: assignedWorkout, error } = await supabase
            .from('assigned_workouts')
            .insert({
                trainer_id: manifest.coach.userId,
                client_id: created.clientId,
                name: blueprint.templateName,
                origin_template_id: templateId,
                is_customized: false,
                structure: template.structure,
                valid_until: addDays(options.seedDate, 45),
                scheduled_days: blueprint.scheduled_days,
                notes: blueprint.notes,
                is_presential: blueprint.is_presential,
                start_time: blueprint.start_time,
                end_time: blueprint.end_time
            })
            .select('id')
            .single()

        if (error || !assignedWorkout) {
            throw new Error(`Could not assign workout ${blueprint.templateName}: ${error?.message || 'unknown error'}`)
        }

        manifest.ids.assignedWorkoutIds.push(assignedWorkout.id)
        assignedWorkoutByClientId.set(created.clientId, assignedWorkout.id)
    }
    console.log('Workout templates and assignments created')

    for (const created of createdClients) {
        const assignedWorkoutId = assignedWorkoutByClientId.get(created.clientId)
        if (!assignedWorkoutId) continue

        const workoutLogDates = [addDays(options.seedDate, -9), addDays(options.seedDate, -4)]

        for (const logDate of workoutLogDates) {
            const { data: log, error } = await supabase
                .from('workout_logs')
                .insert({
                    client_id: created.clientId,
                    workout_id: assignedWorkoutId,
                    date: logDate,
                    completed_at: `${logDate}T19:20:00-03:00`,
                    exercises_log: [
                        { name: 'Bloque principal', effort: 'RPE 8', completed: true },
                        { name: 'Accesorios', effort: 'RPE 7', completed: true }
                    ]
                })
                .select('id')
                .single()

            if (error || !log) {
                throw new Error(`Could not insert workout log for ${created.seed.fullName}: ${error?.message || 'unknown error'}`)
            }

            manifest.ids.workoutLogIds.push(log.id)
        }
    }

    const recipeIds: string[] = []
    for (const recipe of recipeSeeds) {
        console.log(`Creating recipe: ${recipe.name}`)
        const { data: insertedRecipe, error } = await supabase
            .from('recipes')
            .insert({
                trainer_id: manifest.coach.userId,
                recipe_code: `DEMO-${suffix}-${crypto.randomUUID().slice(0, 8)}`,
                name: recipe.name,
                meal_type: recipe.meal_type,
                servings: recipe.servings,
                prep_time_min: recipe.prep_time_min,
                instructions: recipe.instructions,
                ingredients: recipe.ingredients,
                macros_calories: recipe.macros_calories,
                macros_protein_g: recipe.macros_protein_g,
                macros_carbs_g: recipe.macros_carbs_g,
                macros_fat_g: recipe.macros_fat_g,
                image_url: null,
                is_base_template: true
            })
            .select('id')
            .single()

        if (error || !insertedRecipe) {
            throw new Error(`Could not create recipe ${recipe.name}: ${error?.message || 'unknown error'}`)
        }

        recipeIds.push(insertedRecipe.id)
        manifest.ids.recipeIds.push(insertedRecipe.id)
    }

    for (const created of createdClients) {
        console.log(`Creating weekly meal plan for ${created.seed.fullName}`)
        const { data: plan, error: planError } = await supabase
            .from('weekly_meal_plans')
            .insert({
                client_id: created.clientId,
                status: 'active',
                start_date: options.seedDate,
                review_date: addDays(options.seedDate, 14)
            })
            .select('id')
            .single()

        if (planError || !plan) {
            throw new Error(`Could not create weekly meal plan for ${created.seed.fullName}: ${planError?.message || 'unknown error'}`)
        }

        manifest.ids.weeklyMealPlanIds.push(plan.id)

        const daysPayload = Array.from({ length: 7 }, (_, idx) => ({
            plan_id: plan.id,
            day_of_week: idx + 1
        }))

        const { data: insertedDays, error: dayError } = await supabase
            .from('weekly_meal_plan_days')
            .insert(daysPayload)
            .select('id,day_of_week')

        if (dayError || !insertedDays) {
            throw new Error(`Could not create weekly plan days for ${created.seed.fullName}: ${dayError?.message || 'unknown error'}`)
        }

        const sortedDays = [...insertedDays].sort((a, b) => a.day_of_week - b.day_of_week)

        for (const day of sortedDays) {
            manifest.ids.weeklyMealPlanDayIds.push(day.id)

            const meals = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena']
            const mealPayload = meals.map((name, sortOrder) => ({
                day_id: day.id,
                name,
                sort_order: sortOrder,
                is_skipped: false
            }))

            const { data: insertedMeals, error: mealError } = await supabase
                .from('weekly_meal_plan_meals')
                .insert(mealPayload)
                .select('id,sort_order')

            if (mealError || !insertedMeals) {
                throw new Error(`Could not create meal slots for ${created.seed.fullName}: ${mealError?.message || 'unknown error'}`)
            }

            const sortedMeals = [...insertedMeals].sort((a, b) => a.sort_order - b.sort_order)

            for (const meal of sortedMeals) {
                manifest.ids.weeklyMealPlanMealIds.push(meal.id)
                const recipeId = recipeIds[(day.day_of_week + meal.sort_order) % recipeIds.length]

                const { data: item, error: itemError } = await supabase
                    .from('weekly_meal_plan_items')
                    .insert({
                        meal_id: meal.id,
                        recipe_id: recipeId,
                        portions: 1,
                        completed: false
                    })
                    .select('id')
                    .single()

                if (itemError || !item) {
                    throw new Error(`Could not create meal item for ${created.seed.fullName}: ${itemError?.message || 'unknown error'}`)
                }

                manifest.ids.weeklyMealPlanItemIds.push(item.id)
            }
        }
    }

    const planBySlug = new Map<string, { id: string; name: string; price: number }>()
    for (const planSeed of planSeeds) {
        console.log(`Creating payment plan: ${planSeed.name}`)
        const { data: insertedPlan, error } = await supabase
            .from('plans')
            .insert({
                trainer_id: manifest.coach.userId,
                name: planSeed.name,
                price_monthly: planSeed.price_monthly,
                description: planSeed.description,
                routine_frequency: planSeed.routine_frequency,
                calls_frequency: planSeed.calls_frequency,
                includes_nutrition: planSeed.includes_nutrition,
                includes_presential: planSeed.includes_presential
            })
            .select('id,name,price_monthly')
            .single()

        if (error || !insertedPlan) {
            throw new Error(`Could not create plan ${planSeed.name}: ${error?.message || 'unknown error'}`)
        }

        manifest.ids.planIds.push(insertedPlan.id)
        planBySlug.set(planSeed.slug, {
            id: insertedPlan.id,
            name: insertedPlan.name,
            price: Number(insertedPlan.price_monthly)
        })
    }

    for (let index = 0; index < createdClients.length; index += 1) {
        const created = createdClients[index]
        const assignedPlan = planBySlug.get(created.seed.planSlug)
        if (!assignedPlan) {
            throw new Error(`Missing assigned plan ${created.seed.planSlug}`)
        }

        let paidAt: string | null = null
        if (created.seed.paymentScenario === 'paid') {
            paidAt = addDays(options.seedDate, -10)
        } else if (created.seed.paymentScenario === 'pending_with_history') {
            paidAt = addDays(options.seedDate, -25)
        } else if (created.seed.paymentScenario === 'overdue') {
            paidAt = addDays(options.seedDate, -45)
        }

        let nextDueDate: string | null = null
        if (paidAt) {
            nextDueDate = calculateNextDueDate(paidAt, 'monthly')
        }

        const paymentStatus = created.seed.paymentScenario === 'pending_without_history'
            ? 'pending'
            : calculatePaymentStatus(nextDueDate, options.seedDate)

        if (paidAt) {
            const { data: payment, error: paymentError } = await supabase
                .from('payments')
                .insert({
                    trainer_id: manifest.coach.userId,
                    client_id: created.clientId,
                    paid_at: paidAt,
                    amount: assignedPlan.price,
                    method: index % 3 === 0 ? 'mercado_pago' : index % 3 === 1 ? 'bank_transfer' : 'cash',
                    note: `Pago demo (${DEMO_TAG})`
                })
                .select('id')
                .single()

            if (paymentError || !payment) {
                throw new Error(`Could not insert payment for ${created.seed.fullName}: ${paymentError?.message || 'unknown error'}`)
            }

            manifest.ids.paymentIds.push(payment.id)
        }

        const { error: updateClientPaymentError } = await supabase
            .from('clients')
            .update({
                plan_id: assignedPlan.id,
                plan_name: assignedPlan.name,
                price_monthly: assignedPlan.price,
                billing_frequency: 'monthly',
                payment_status: paymentStatus,
                last_paid_at: paidAt,
                next_due_date: nextDueDate
            })
            .eq('id', created.clientId)

        if (updateClientPaymentError) {
            throw new Error(`Could not update payment state for ${created.seed.fullName}: ${updateClientPaymentError.message}`)
        }

        manifest.clients.push({
            index: index + 1,
            fullName: created.seed.fullName,
            email: created.email,
            password: created.password,
            authUserId: created.authUserId,
            clientId: created.clientId,
            paymentStatus
        })
    }
    console.log('Payment states synchronized')

    return manifest
}

async function run() {
    const options = parseArgs(process.argv.slice(2))
    assertEnvVars()
    const supabase = createAdminSupabase()

    console.log('--------------------------------------------------')
    console.log('Demo Coach Account Seeder')
    console.log('Mode      :', options.mode)
    console.log('Seed date :', options.seedDate)
    console.log('Manifest  :', options.manifestPath)
    console.log('Demo tag  :', DEMO_TAG)
    console.log('--------------------------------------------------')

    await preflightSchema(supabase)
    await ensureRequiredBuckets(supabase)

    if (options.mode === 'cleanup') {
        const summary = await cleanupDemoData(supabase, options.manifestPath)
        console.log('Cleanup completed:')
        console.log(`- Coaches deleted: ${summary.cleanedCoaches}`)
        console.log(`- Clients deleted: ${summary.cleanedClients}`)
        console.log(`- Auth users deleted: ${summary.cleanedAuthUsers}`)
        return
    }

    if (options.mode === 'recreate') {
        const summary = await cleanupDemoData(supabase, options.manifestPath)
        console.log('Previous demo cleanup done:')
        console.log(`- Coaches deleted: ${summary.cleanedCoaches}`)
        console.log(`- Clients deleted: ${summary.cleanedClients}`)
        console.log(`- Auth users deleted: ${summary.cleanedAuthUsers}`)
    }

    const manifest = await createDemoDataset(supabase, options)
    await writeManifest(options.manifestPath, manifest)

    const paymentMix = manifest.clients.reduce<Record<string, number>>((acc, c) => {
        acc[c.paymentStatus] = (acc[c.paymentStatus] || 0) + 1
        return acc
    }, {})

    console.log('')
    console.log('Demo coach account created successfully.')
    console.log('')
    console.log('Coach credentials:')
    console.log(`- Email   : ${manifest.coach.email}`)
    console.log(`- Password: ${manifest.coach.password}`)
    console.log('')
    console.log('Client credentials:')
    for (const client of manifest.clients) {
        console.log(`- ${client.fullName}: ${client.email} / ${client.password} (${client.paymentStatus})`)
    }

    console.log('')
    console.log('Summary:')
    console.log(`- Clients: ${manifest.clients.length}`)
    console.log(`- Check-ins: ${manifest.ids.checkinIds.length}`)
    console.log(`- Workout templates: ${manifest.ids.workoutTemplateIds.length}`)
    console.log(`- Assigned workouts: ${manifest.ids.assignedWorkoutIds.length}`)
    console.log(`- Workout logs: ${manifest.ids.workoutLogIds.length}`)
    console.log(`- Recipes: ${manifest.ids.recipeIds.length}`)
    console.log(`- Weekly meal plans: ${manifest.ids.weeklyMealPlanIds.length}`)
    console.log(`- Payments: ${manifest.ids.paymentIds.length}`)
    console.log(`- Payment mix: paid=${paymentMix.paid || 0}, pending=${paymentMix.pending || 0}, overdue=${paymentMix.overdue || 0}`)
    console.log(`- Manifest written to: ${options.manifestPath}`)
}

run().catch((error) => {
    console.error('Seeder failed:', error instanceof Error ? error.message : error)
    process.exit(1)
})
