'use server'

import { createClient } from '@/lib/supabase/server'
import {
    addDaysToDateString,
    compareDateStrings,
    dateOnlyToLocalNoon,
    diffDateStringsInDays,
    formatDateInART,
    getARTDayOfWeek,
    getTodayString,
    normalizeText
} from '@/lib/utils'

type DashboardClient = {
    id: string
    full_name: string
    avatar_url: string | null
    phone: string | null
    status: string | null
    created_at: string | null
    payment_status: 'paid' | 'pending' | 'overdue' | null
    next_due_date: string | null
    price_monthly: number | null
    next_checkin_date: string | null
    checkin_frequency_days: number | null
    main_goal: string | null
    target_weight: number | null
    current_weight: number | null
    last_app_opened_at: string | null
}

type DashboardMealLog = {
    client_id: string
    created_at: string
    status: 'pending' | 'reviewed' | string
}

type DashboardCheckin = {
    client_id: string
    date: string
    created_at: string | null
    weight: number | null
}

type DashboardWorkoutSession = {
    id: string
    client_id: string
    trainer_id: string
    assigned_workout_id: string | null
    started_at: string
    ended_at: string | null
    status: string
}

type DashboardWorkoutLog = {
    id: string
    client_id: string
    workout_id: string | null
    date: string
    completed_at: string | null
}

type DashboardAssignedWorkout = {
    id: string
    client_id: string
    name: string | null
    valid_until: string | null
    scheduled_days: string[] | null
}

type DashboardMealPlanDay = {
    day_of_week: number
    meals: Array<{ id: string; is_skipped: boolean | null }>
}

type DashboardMealPlan = {
    id: string
    client_id: string
    status: string
    days: DashboardMealPlanDay[] | null
}

type DashboardExerciseCheckin = {
    id: string
    session_id: string
    exercise_name: string | null
    set_logs: Array<{
        weight: number | null
        is_completed: boolean | null
    }> | null
}

export type CoachUrgentActionKind = 'payment_overdue' | 'checkin_overdue' | 'meal_review_pending'
export type CoachRetentionReason = 'no_app_open' | 'no_training' | 'no_meals' | 'checkin_delayed'
export type CoachMilestoneKind = 'strength_pr' | 'weight_goal' | 'weight_progress' | 'consistency_streak'

export interface CoachMetricCard {
    key: string
    title: string
    value: number
    subtitle: string
    trendText: string
    trendTone: 'success' | 'warning' | 'muted'
}

export interface CoachUrgentAction {
    id: string
    kind: CoachUrgentActionKind
    clientId: string
    clientName: string
    avatarUrl: string | null
    phone: string | null
    statusLabel: string
    statusTone: 'danger' | 'warning'
    details: string
    actionLabel: 'Recordar' | 'Revisar'
    actionHref: string
    severity: number
    overdueDays: number
    whatsappMessage: string
    alertKey: string
}

export interface CoachComplianceData {
    percentage: number
    completed: number
    due: number
    completedByCategory: {
        workouts: number
        meals: number
        checkins: number
    }
    dueByCategory: {
        workouts: number
        meals: number
        checkins: number
    }
    engagementWeeklyPercent: number
    engagementActiveClients: number
    engagementTotalClients: number
}

export interface CoachRetentionAlert {
    id: string
    clientId: string
    clientName: string
    avatarUrl: string | null
    phone: string | null
    reason: CoachRetentionReason
    message: string
    actionHref: string
    whatsappMessage: string
    severity: number
    inactivityDays: number
    alertKey: string
}

export interface CoachWeeklyMilestone {
    id: string
    kind: CoachMilestoneKind
    clientId: string
    clientName: string
    avatarUrl: string | null
    text: string
    iconTone: 'yellow' | 'green' | 'blue'
    score: number
    alertKey: string
}

export interface CoachHomeData {
    greeting: string
    coachName: string
    metrics: CoachMetricCard[]
    urgentActions: CoachUrgentAction[]
    compliance: CoachComplianceData
    retentionAlerts: CoachRetentionAlert[]
    weeklyMilestones: CoachWeeklyMilestone[]
}

type ComplianceRangeData = {
    workoutsByClient: Map<string, DashboardAssignedWorkout[]>
    mealPlansByClient: Map<string, DashboardMealPlan>
    completedWorkoutDays: Map<string, Set<string>>
    mealLogsByClient: Map<string, string[]>
    checkinsByClient: Map<string, DashboardCheckin[]>
}

type NotificationCandidate = {
    type: 'coach_urgent_alert' | 'coach_retention_alert' | 'coach_weekly_milestone'
    title: string
    body: string
    data: Record<string, unknown>
    alertKey: string
}

type CoachAlertPreferences = {
    coach_urgent_alert?: boolean | null
    coach_retention_alert?: boolean | null
    coach_weekly_milestone?: boolean | null
}

const MAIN_EXERCISE_KEYWORDS = [
    'press banca',
    'banca',
    'bench',
    'sentadilla',
    'squat',
    'peso muerto',
    'deadlift',
    'press militar',
    'overhead press',
    'hip thrust',
    'remo',
    'dominadas',
    'pull up',
    'pull-up'
]

function getGreeting() {
    const hour = Number(formatDateInART(new Date(), { hour: '2-digit', hour12: false }, 'en-GB'))
    if (hour >= 6 && hour < 12) return 'Buenos días'
    if (hour >= 12 && hour < 20) return 'Buenas tardes'
    return 'Buenas noches'
}

function getARTWeekRange(referenceDate: Date = new Date()) {
    const today = getTodayString(referenceDate)
    const dow = getARTDayOfWeek(referenceDate) // 0 sunday ... 6 saturday
    const offsetToMonday = (dow + 6) % 7
    const weekStart = addDaysToDateString(today, -offsetToMonday)
    return { weekStart, today }
}

function toDateStringFromTimestamp(timestamp: string | null | undefined) {
    if (!timestamp) return null
    return getTodayString(new Date(timestamp))
}

function enumerateDates(startDate: string, endDate: string) {
    const days: string[] = []
    let cursor = startDate
    while (compareDateStrings(cursor, endDate) <= 0) {
        days.push(cursor)
        cursor = addDaysToDateString(cursor, 1)
    }
    return days
}

function getIsoDowFromDateString(date: string) {
    const dow = getARTDayOfWeek(dateOnlyToLocalNoon(date))
    return dow === 0 ? 7 : dow
}

function getWorkoutDayName(date: string) {
    return normalizeText(formatDateInART(dateOnlyToLocalNoon(date), { weekday: 'long' }))
}

function isMainExercise(exerciseName: string | null | undefined) {
    if (!exerciseName) return false
    const normalized = normalizeText(exerciseName)
    return MAIN_EXERCISE_KEYWORDS.some((keyword) => normalized.includes(normalizeText(keyword)))
}

function getMaxDateString(values: Array<string | null | undefined>) {
    let max: string | null = null
    for (const value of values) {
        if (!value) continue
        if (!max || compareDateStrings(value, max) > 0) {
            max = value
        }
    }
    return max
}

function uniqueBy<T>(items: T[], keySelector: (item: T) => string) {
    const map = new Map<string, T>()
    for (const item of items) {
        map.set(keySelector(item), item)
    }
    return [...map.values()]
}

function calculateComplianceForRange(
    client: DashboardClient,
    rangeStart: string,
    rangeEnd: string,
    data: ComplianceRangeData
) {
    const days = enumerateDates(rangeStart, rangeEnd)
    const workouts = data.workoutsByClient.get(client.id) || []
    const plan = data.mealPlansByClient.get(client.id)
    const workoutCompletions = data.completedWorkoutDays.get(client.id) || new Set<string>()
    const mealLogDates = data.mealLogsByClient.get(client.id) || []
    const checkins = data.checkinsByClient.get(client.id) || []

    let workoutsDue = 0
    for (const day of days) {
        const dayName = getWorkoutDayName(day)
        for (const workout of workouts) {
            if (!workout.scheduled_days || workout.scheduled_days.length === 0) continue
            const normalizedDays = workout.scheduled_days.map((item) => normalizeText(item))
            if (normalizedDays.includes(dayName)) {
                workoutsDue += 1
            }
        }
    }

    const workoutsCompleted = Math.min(workoutsDue, workoutCompletions.size)

    const mealSlotsDue = (() => {
        if (!plan || !plan.days) return 0
        let due = 0
        for (const day of days) {
            const isoDow = getIsoDowFromDateString(day)
            const mealDay = plan.days.find((entry) => entry.day_of_week === isoDow)
            if (!mealDay) continue
            due += (mealDay.meals || []).filter((meal) => !meal.is_skipped).length
        }
        return due
    })()

    const mealsCompleted = Math.min(mealSlotsDue, mealLogDates.length)

    let checkinDue = 0
    if (client.next_checkin_date) {
        if (compareDateStrings(client.next_checkin_date, rangeEnd) <= 0) {
            checkinDue = 1
        }
    }

    const checkinCompleted = checkinDue
        ? (checkins.some((item) => compareDateStrings(item.date, rangeStart) >= 0 && compareDateStrings(item.date, rangeEnd) <= 0) ? 1 : 0)
        : 0

    const due = workoutsDue + mealSlotsDue + checkinDue
    const completed = workoutsCompleted + mealsCompleted + checkinCompleted
    const percentage = due > 0 ? Math.round((completed / due) * 100) : 0

    return {
        due,
        completed,
        percentage,
        breakdown: {
            workoutsDue,
            workoutsCompleted,
            mealsDue: mealSlotsDue,
            mealsCompleted,
            checkinsDue: checkinDue,
            checkinsCompleted: checkinCompleted
        }
    }
}

export async function getCoachHomeData(): Promise<CoachHomeData> {
    const supabase = await createClient()
    const {
        data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Not authenticated')
    }

    const { weekStart, today } = getARTWeekRange()
    const sevenDaysAgo = addDaysToDateString(today, -7)
    const oneHundredEightyDaysAgo = addDaysToDateString(today, -180)

    const clientsSelectBase = `
                id,
                full_name,
                avatar_url,
                phone,
                status,
                created_at,
                payment_status,
                next_due_date,
                price_monthly,
                next_checkin_date,
                checkin_frequency_days,
                main_goal,
                target_weight,
                current_weight
            `

    const [
        profileResult,
        clientsResult,
        mealLogsResult,
        checkinsResult,
        workoutSessionsResult,
        workoutLogsResult,
        assignedWorkoutsResult,
        mealPlansResult,
        exerciseCheckinsResult,
        presentialTrainingsResult
    ] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase
            .from('clients')
            .select(`
                ${clientsSelectBase},
                last_app_opened_at
            `)
            .eq('trainer_id', user.id)
            .eq('status', 'active'),
        supabase
            .from('meal_logs')
            .select('client_id, created_at, status')
            .gte('created_at', `${oneHundredEightyDaysAgo}T00:00:00-03:00`),
        supabase
            .from('checkins')
            .select('client_id, date, created_at, weight')
            .eq('trainer_id', user.id)
            .gte('date', oneHundredEightyDaysAgo),
        supabase
            .from('workout_sessions')
            .select('id, client_id, trainer_id, assigned_workout_id, started_at, ended_at, status')
            .eq('trainer_id', user.id)
            .eq('status', 'completed')
            .gte('started_at', `${oneHundredEightyDaysAgo}T00:00:00-03:00`),
        supabase
            .from('workout_logs')
            .select('id, client_id, workout_id, date, completed_at')
            .gte('date', oneHundredEightyDaysAgo),
        supabase
            .from('assigned_workouts')
            .select('id, client_id, name, valid_until, scheduled_days')
            .eq('trainer_id', user.id),
        supabase
            .from('weekly_meal_plans')
            .select(`
                id,
                client_id,
                status,
                days:weekly_meal_plan_days(
                    day_of_week,
                    meals:weekly_meal_plan_meals(id, is_skipped)
                )
            `)
            .eq('status', 'active'),
        supabase
            .from('exercise_checkins')
            .select('id, session_id, exercise_name, set_logs(weight, is_completed)'),
        supabase
            .from('assigned_workouts')
            .select('id')
            .eq('trainer_id', user.id)
            .eq('is_presential', true)
            .gte('valid_until', today)
            .contains('scheduled_days', [formatDateInART(new Date(), { weekday: 'long' }).replace(/^./, (c) => c.toUpperCase())])
    ])

    const coachFirstName = profileResult.data?.full_name?.split(' ')[0] || 'Coach'

    let clients: DashboardClient[] = []
    if (clientsResult.error) {
        const missingPresenceColumn = clientsResult.error.message?.includes('last_app_opened_at')
        if (missingPresenceColumn) {
            // Backward-compatible fallback while migration is rolling out.
            const fallbackClientsResult = await supabase
                .from('clients')
                .select(clientsSelectBase)
                .eq('trainer_id', user.id)
                .eq('status', 'active')

            if (fallbackClientsResult.error) {
                console.error('getCoachHomeData fallback clients query error:', fallbackClientsResult.error)
            } else {
                clients = ((fallbackClientsResult.data || []) as Array<Omit<DashboardClient, 'last_app_opened_at'>>)
                    .map((client) => ({
                        ...client,
                        last_app_opened_at: null
                    }))
            }
        } else {
            console.error('getCoachHomeData clients query error:', clientsResult.error)
        }
    } else {
        clients = (clientsResult.data || []) as DashboardClient[]
    }
    const clientIds = new Set(clients.map((client) => client.id))

    const mealLogs = ((mealLogsResult.data || []) as DashboardMealLog[])
        .filter((item) => clientIds.has(item.client_id))

    const checkins = ((checkinsResult.data || []) as DashboardCheckin[])
        .filter((item) => clientIds.has(item.client_id))

    const workoutSessions = ((workoutSessionsResult.data || []) as DashboardWorkoutSession[])
        .filter((item) => clientIds.has(item.client_id))

    const workoutLogs = ((workoutLogsResult.data || []) as DashboardWorkoutLog[])
        .filter((item) => clientIds.has(item.client_id))

    const assignedWorkouts = ((assignedWorkoutsResult.data || []) as DashboardAssignedWorkout[])
        .filter((item) => clientIds.has(item.client_id))
        .filter((item) => !item.valid_until || compareDateStrings(item.valid_until, today) >= 0)

    const mealPlans = ((mealPlansResult.data || []) as DashboardMealPlan[])
        .filter((item) => clientIds.has(item.client_id))

    const completedSessionIds = new Set(workoutSessions.map((session) => session.id))
    const exerciseCheckins = ((exerciseCheckinsResult.data || []) as DashboardExerciseCheckin[])
        .filter((item) => completedSessionIds.has(item.session_id))

    const workoutsByClient = new Map<string, DashboardAssignedWorkout[]>()
    for (const workout of assignedWorkouts) {
        const list = workoutsByClient.get(workout.client_id) || []
        list.push(workout)
        workoutsByClient.set(workout.client_id, list)
    }

    const mealPlansByClient = new Map<string, DashboardMealPlan>()
    for (const plan of mealPlans) {
        mealPlansByClient.set(plan.client_id, plan)
    }

    const checkinsByClient = new Map<string, DashboardCheckin[]>()
    for (const checkin of checkins) {
        const list = checkinsByClient.get(checkin.client_id) || []
        list.push(checkin)
        checkinsByClient.set(checkin.client_id, list)
    }

    const mealLogsByClient = new Map<string, DashboardMealLog[]>()
    for (const log of mealLogs) {
        const list = mealLogsByClient.get(log.client_id) || []
        list.push(log)
        mealLogsByClient.set(log.client_id, list)
    }

    const sessionById = new Map<string, DashboardWorkoutSession>()
    for (const session of workoutSessions) {
        sessionById.set(session.id, session)
    }

    const completedWorkoutDays = new Map<string, Set<string>>()
    for (const session of workoutSessions) {
        const day = toDateStringFromTimestamp(session.ended_at) || toDateStringFromTimestamp(session.started_at)
        if (!day) continue
        if (compareDateStrings(day, weekStart) < 0 || compareDateStrings(day, today) > 0) continue
        const key = session.client_id
        const set = completedWorkoutDays.get(key) || new Set<string>()
        const workoutKey = session.assigned_workout_id || 'session'
        set.add(`${day}:${workoutKey}`)
        completedWorkoutDays.set(key, set)
    }

    for (const log of workoutLogs) {
        if (compareDateStrings(log.date, weekStart) < 0 || compareDateStrings(log.date, today) > 0) continue
        const key = log.client_id
        const set = completedWorkoutDays.get(key) || new Set<string>()
        const workoutKey = log.workout_id || 'log'
        set.add(`${log.date}:${workoutKey}`)
        completedWorkoutDays.set(key, set)
    }

    const complianceRangeData: ComplianceRangeData = {
        workoutsByClient,
        mealPlansByClient,
        completedWorkoutDays,
        mealLogsByClient: new Map(
            [...mealLogsByClient.entries()].map(([clientId, logs]) => [
                clientId,
                logs
                    .map((item) => toDateStringFromTimestamp(item.created_at))
                    .filter((item): item is string => !!item)
                    .filter((item) => compareDateStrings(item, weekStart) >= 0 && compareDateStrings(item, today) <= 0)
            ])
        ),
        checkinsByClient
    }

    let totalDue = 0
    let totalCompleted = 0
    let workoutsDue = 0
    let workoutsCompleted = 0
    let mealsDue = 0
    let mealsCompleted = 0
    let checkinsDue = 0
    let checkinsCompleted = 0

    for (const client of clients) {
        const compliance = calculateComplianceForRange(client, weekStart, today, complianceRangeData)
        totalDue += compliance.due
        totalCompleted += compliance.completed
        workoutsDue += compliance.breakdown.workoutsDue
        workoutsCompleted += compliance.breakdown.workoutsCompleted
        mealsDue += compliance.breakdown.mealsDue
        mealsCompleted += compliance.breakdown.mealsCompleted
        checkinsDue += compliance.breakdown.checkinsDue
        checkinsCompleted += compliance.breakdown.checkinsCompleted
    }

    const complianceScore = totalDue > 0 ? Math.round((totalCompleted / totalDue) * 100) : 0

    const engagementActiveClients = clients.filter((client) => {
        const lastAppOpen = toDateStringFromTimestamp(client.last_app_opened_at)
        const clientMeals = mealLogsByClient.get(client.id) || []
        const clientCheckins = checkinsByClient.get(client.id) || []
        const clientSessions = workoutSessions.filter((item) => item.client_id === client.id)
        const clientWorkoutLogs = workoutLogs.filter((item) => item.client_id === client.id)

        const lastActivityDate = getMaxDateString([
            ...clientMeals.map((item) => toDateStringFromTimestamp(item.created_at)),
            ...clientCheckins.map((item) => item.date),
            ...clientSessions.map((item) => toDateStringFromTimestamp(item.ended_at || item.started_at)),
            ...clientWorkoutLogs.map((item) => item.date),
            toDateStringFromTimestamp(client.created_at)
        ])

        const reference = lastAppOpen || lastActivityDate
        if (!reference) return false
        return compareDateStrings(reference, sevenDaysAgo) >= 0
    }).length

    const compliance: CoachComplianceData = {
        percentage: complianceScore,
        completed: totalCompleted,
        due: totalDue,
        completedByCategory: {
            workouts: workoutsCompleted,
            meals: mealsCompleted,
            checkins: checkinsCompleted
        },
        dueByCategory: {
            workouts: workoutsDue,
            meals: mealsDue,
            checkins: checkinsDue
        },
        engagementWeeklyPercent: clients.length > 0 ? Math.round((engagementActiveClients / clients.length) * 100) : 0,
        engagementActiveClients,
        engagementTotalClients: clients.length
    }

    const overduePayments = clients
        .filter((client) => client.payment_status === 'overdue' || (!!client.next_due_date && compareDateStrings(client.next_due_date, today) < 0))
        .map((client) => {
            const overdueDays = client.next_due_date ? diffDateStringsInDays(today, client.next_due_date) : 0
            const message = `Hola ${client.full_name.split(' ')[0]}, te recuerdo que tu pago está vencido. ¿Podemos regularizarlo hoy?`
            return {
                id: `urgent-payment-${client.id}`,
                kind: 'payment_overdue' as const,
                clientId: client.id,
                clientName: client.full_name,
                avatarUrl: client.avatar_url,
                phone: client.phone,
                statusLabel: 'Vencido',
                statusTone: 'danger' as const,
                details: `${new Intl.NumberFormat('es-AR', {
                    style: 'currency',
                    currency: 'ARS',
                    currencyDisplay: 'code'
                }).format(client.price_monthly || 0)} - Renovación de suscripción`,
                actionLabel: 'Recordar' as const,
                actionHref: `/pagos?action=register&clientId=${client.id}`,
                severity: 300,
                overdueDays,
                whatsappMessage: message,
                alertKey: `urgent:payment_overdue:${client.id}`
            }
        })

    const overdueCheckins = clients
        .filter((client) => !!client.next_checkin_date && compareDateStrings(client.next_checkin_date, today) <= 0)
        .map((client) => {
            const overdueDays = client.next_checkin_date ? diffDateStringsInDays(today, client.next_checkin_date) : 0
            const message = `Hola ${client.full_name.split(' ')[0]}, te recuerdo que tenemos check-in pendiente para revisar tu progreso.`
            return {
                id: `urgent-checkin-${client.id}`,
                kind: 'checkin_overdue' as const,
                clientId: client.id,
                clientName: client.full_name,
                avatarUrl: client.avatar_url,
                phone: client.phone,
                statusLabel: 'Check-in',
                statusTone: 'warning' as const,
                details: 'Actualización semanal pendiente',
                actionLabel: 'Revisar' as const,
                actionHref: `/clients/${client.id}?tab=checkin`,
                severity: 220,
                overdueDays,
                whatsappMessage: message,
                alertKey: `urgent:checkin_overdue:${client.id}`
            }
        })

    const pendingMeals: CoachUrgentAction[] = clients.flatMap((client) => {
            const logs = mealLogsByClient.get(client.id) || []
            const pending = logs
                .filter((log) => log.status === 'pending')
                .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
            if (pending.length === 0) return []
            const oldestDate = toDateStringFromTimestamp(pending[0]?.created_at)
            const overdueDays = oldestDate ? diffDateStringsInDays(today, oldestDate) : 0
            const message = `Hola ${client.full_name.split(' ')[0]}, vi tus comidas pendientes de revisión. Contame cómo venís para ajustarte el plan.`
            return [{
                id: `urgent-meal-${client.id}`,
                kind: 'meal_review_pending' as const,
                clientId: client.id,
                clientName: client.full_name,
                avatarUrl: client.avatar_url,
                phone: client.phone,
                statusLabel: 'Pendiente',
                statusTone: 'warning' as const,
                details: `${pending.length} comidas sin revisar`,
                actionLabel: 'Revisar' as const,
                actionHref: `/clients/${client.id}?tab=diet`,
                severity: 160 + Math.min(overdueDays, 72),
                overdueDays,
                whatsappMessage: message,
                alertKey: `urgent:meal_review_pending:${client.id}`
            }]
        })

    const urgentActions: CoachUrgentAction[] = uniqueBy(
        [...overduePayments, ...overdueCheckins, ...pendingMeals],
        (item) => item.alertKey
    )
        .sort((a, b) => (b.severity - a.severity) || (b.overdueDays - a.overdueDays))
        .slice(0, 8)

    const retentionAlerts = clients
        .map((client) => {
            const clientMeals = mealLogsByClient.get(client.id) || []
            const clientCheckins = checkinsByClient.get(client.id) || []
            const clientSessions = workoutSessions.filter((item) => item.client_id === client.id)
            const clientWorkoutLogs = workoutLogs.filter((item) => item.client_id === client.id)
            const hasMealPlan = mealPlansByClient.has(client.id)

            const lastAppOpenDate = toDateStringFromTimestamp(client.last_app_opened_at)
            const lastTrainingDate = getMaxDateString([
                ...clientSessions.map((item) => toDateStringFromTimestamp(item.ended_at || item.started_at)),
                ...clientWorkoutLogs.map((item) => item.date)
            ])
            const lastMealDate = getMaxDateString(clientMeals.map((item) => toDateStringFromTimestamp(item.created_at)))
            const lastActivityDate = getMaxDateString([
                lastAppOpenDate,
                lastTrainingDate,
                lastMealDate,
                ...clientCheckins.map((item) => item.date),
                toDateStringFromTimestamp(client.created_at)
            ])

            const noAppDays = lastAppOpenDate
                ? diffDateStringsInDays(today, lastAppOpenDate)
                : (lastActivityDate ? diffDateStringsInDays(today, lastActivityDate) : 999)

            const noTrainingDays = lastTrainingDate ? diffDateStringsInDays(today, lastTrainingDate) : 999
            const noMealsDays = lastMealDate ? diffDateStringsInDays(today, lastMealDate) : 999
            const lateCheckinDays = client.next_checkin_date ? diffDateStringsInDays(today, client.next_checkin_date) : 0

            let reason: CoachRetentionReason | null = null
            let message = ''
            let inactivityDays = 0
            let severity = 0

            if (client.next_checkin_date && compareDateStrings(client.next_checkin_date, sevenDaysAgo) < 0) {
                reason = 'checkin_delayed'
                inactivityDays = lateCheckinDays
                severity = 320 + Math.min(lateCheckinDays, 90)
                message = `Check-in atrasado hace ${lateCheckinDays} días.`
            } else if (noAppDays >= 7) {
                reason = 'no_app_open'
                inactivityDays = noAppDays
                severity = 280 + Math.min(noAppDays, 90)
                message = `Sin actividad en la app hace ${noAppDays} días.`
            } else if (noTrainingDays >= 14) {
                reason = 'no_training'
                inactivityDays = noTrainingDays
                severity = 240 + Math.min(noTrainingDays, 90)
                message = `Sin registrar entrenamientos hace ${noTrainingDays} días.`
            } else if (hasMealPlan && noMealsDays >= 7) {
                reason = 'no_meals'
                inactivityDays = noMealsDays
                severity = 200 + Math.min(noMealsDays, 90)
                message = `Sin registrar comidas hace ${noMealsDays} días.`
            }

            if (!reason) return null

            const whatsappMessage = `Hola ${client.full_name.split(' ')[0]}, noté ${message.toLowerCase()} ¿cómo te puedo ayudar para retomar ritmo?`

            return {
                id: `retention-${reason}-${client.id}`,
                clientId: client.id,
                clientName: client.full_name,
                avatarUrl: client.avatar_url,
                phone: client.phone,
                reason,
                message,
                actionHref: `/clients/${client.id}`,
                whatsappMessage,
                severity,
                inactivityDays,
                alertKey: `retention:${reason}:${client.id}`
            }
        })
        .filter((item): item is CoachRetentionAlert => !!item)
        .sort((a, b) => b.severity - a.severity)
        .slice(0, 6)

    const sessionDateById = new Map<string, string>()
    for (const session of workoutSessions) {
        const date = toDateStringFromTimestamp(session.ended_at || session.started_at)
        if (date) sessionDateById.set(session.id, date)
    }

    const prByClientExercise = new Map<string, { clientId: string; clientName: string; avatarUrl: string | null; exercise: string; baseline: number; weeklyBest: number }>()
    for (const checkin of exerciseCheckins) {
        const session = sessionById.get(checkin.session_id)
        if (!session) continue
        if (!isMainExercise(checkin.exercise_name)) continue
        const date = sessionDateById.get(checkin.session_id)
        if (!date) continue

        let maxWeight = 0
        for (const setLog of checkin.set_logs || []) {
            if (!setLog.is_completed) continue
            if (!setLog.weight || setLog.weight <= 0) continue
            if (setLog.weight > maxWeight) maxWeight = setLog.weight
        }
        if (maxWeight <= 0 || !checkin.exercise_name) continue

        const key = `${session.client_id}:${normalizeText(checkin.exercise_name)}`
        const current = prByClientExercise.get(key) || {
            clientId: session.client_id,
            clientName: clients.find((item) => item.id === session.client_id)?.full_name || 'Asesorado',
            avatarUrl: clients.find((item) => item.id === session.client_id)?.avatar_url || null,
            exercise: checkin.exercise_name,
            baseline: 0,
            weeklyBest: 0
        }

        if (compareDateStrings(date, weekStart) >= 0 && compareDateStrings(date, today) <= 0) {
            current.weeklyBest = Math.max(current.weeklyBest, maxWeight)
        } else if (compareDateStrings(date, weekStart) < 0) {
            current.baseline = Math.max(current.baseline, maxWeight)
        }

        prByClientExercise.set(key, current)
    }

    const prMilestones: CoachWeeklyMilestone[] = [...prByClientExercise.values()]
        .flatMap((item) => {
            if (item.baseline <= 0 || item.weeklyBest <= 0) return []
            const improvement = item.weeklyBest - item.baseline
            const pct = (improvement / item.baseline) * 100
            if (improvement < 2.5 || pct < 5) return []
            return [{
                id: `milestone-pr-${item.clientId}-${normalizeText(item.exercise)}`,
                kind: 'strength_pr' as const,
                clientId: item.clientId,
                clientName: item.clientName,
                avatarUrl: item.avatarUrl,
                text: `PR ${item.exercise}: ${item.weeklyBest}kg`,
                iconTone: 'yellow' as const,
                score: Math.round(pct * 10 + improvement * 10),
                alertKey: `milestone:strength_pr:${item.clientId}:${normalizeText(item.exercise)}`
            }]
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)

    const weightMilestones: CoachWeeklyMilestone[] = []
    for (const client of clients) {
        if (!client.target_weight) continue
        const list = (checkinsByClient.get(client.id) || [])
            .slice()
            .sort((a, b) => (a.date < b.date ? -1 : 1))
        if (list.length === 0) continue

        const latestThisWeek = [...list]
            .reverse()
            .find((item) => compareDateStrings(item.date, weekStart) >= 0 && compareDateStrings(item.date, today) <= 0)
        if (!latestThisWeek || latestThisWeek.weight == null) continue

        const beforeWeek = [...list]
            .reverse()
            .find((item) => compareDateStrings(item.date, weekStart) < 0 && item.weight != null)

        const goal = normalizeText(client.main_goal || '')
        const target = client.target_weight
        const current = latestThisWeek.weight
        const previous = beforeWeek?.weight ?? client.current_weight ?? null

        if (goal.includes('fat') || goal.includes('perdida')) {
            if (current <= target && (previous == null || previous > target)) {
                weightMilestones.push({
                    id: `milestone-weight-goal-${client.id}`,
                    kind: 'weight_goal',
                    clientId: client.id,
                    clientName: client.full_name,
                    avatarUrl: client.avatar_url,
                    text: `Peso objetivo alcanzado: ${target}kg`,
                    iconTone: 'green',
                    score: 180,
                    alertKey: `milestone:weight_goal:${client.id}:${target}`
                })
                continue
            }
            if (previous != null && previous - current >= 1) {
                weightMilestones.push({
                    id: `milestone-weight-progress-${client.id}`,
                    kind: 'weight_progress',
                    clientId: client.id,
                    clientName: client.full_name,
                    avatarUrl: client.avatar_url,
                    text: `Bajó ${Math.round((previous - current) * 10) / 10}kg esta semana`,
                    iconTone: 'green',
                    score: 120,
                    alertKey: `milestone:weight_progress:${client.id}:${weekStart}`
                })
            }
            continue
        }

        if (goal.includes('muscle') || goal.includes('ganancia') || goal.includes('mass')) {
            if (current >= target && (previous == null || previous < target)) {
                weightMilestones.push({
                    id: `milestone-weight-goal-${client.id}`,
                    kind: 'weight_goal',
                    clientId: client.id,
                    clientName: client.full_name,
                    avatarUrl: client.avatar_url,
                    text: `Peso objetivo alcanzado: ${target}kg`,
                    iconTone: 'green',
                    score: 180,
                    alertKey: `milestone:weight_goal:${client.id}:${target}`
                })
                continue
            }
            if (previous != null && current - previous >= 1) {
                weightMilestones.push({
                    id: `milestone-weight-progress-${client.id}`,
                    kind: 'weight_progress',
                    clientId: client.id,
                    clientName: client.full_name,
                    avatarUrl: client.avatar_url,
                    text: `Subió ${Math.round((current - previous) * 10) / 10}kg esta semana`,
                    iconTone: 'green',
                    score: 120,
                    alertKey: `milestone:weight_progress:${client.id}:${weekStart}`
                })
            }
            continue
        }

        if (Math.abs(current - target) <= 0.5) {
            weightMilestones.push({
                id: `milestone-weight-goal-${client.id}`,
                kind: 'weight_goal',
                clientId: client.id,
                clientName: client.full_name,
                avatarUrl: client.avatar_url,
                text: `Meta corporal alcanzada: ${target}kg`,
                iconTone: 'green',
                score: 170,
                alertKey: `milestone:weight_goal:${client.id}:${target}`
            })
        }
    }

    const monthKeys: string[] = []
    const now = dateOnlyToLocalNoon(today)
    for (let i = 0; i < 6; i += 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1, 12, 0, 0, 0)
        monthKeys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
    }

    const streakMilestones: CoachWeeklyMilestone[] = clients.flatMap((client) => {
            let streak = 0
            for (const monthKey of monthKeys) {
                const [yearRaw, monthRaw] = monthKey.split('-')
                const year = Number(yearRaw)
                const month = Number(monthRaw)
                const monthStart = `${yearRaw}-${monthRaw}-01`
                const monthEndDate = new Date(year, month, 0, 12, 0, 0, 0)
                const monthEnd = getTodayString(monthEndDate)
                const effectiveEnd = compareDateStrings(monthEnd, today) > 0 ? today : monthEnd

                const monthMealLogs = (mealLogsByClient.get(client.id) || [])
                    .map((item) => toDateStringFromTimestamp(item.created_at))
                    .filter((item): item is string => !!item)
                    .filter((item) => compareDateStrings(item, monthStart) >= 0 && compareDateStrings(item, effectiveEnd) <= 0)

                const monthCompletions = new Map(completedWorkoutDays)
                monthCompletions.set(
                    client.id,
                    new Set(
                        [
                            ...workoutSessions
                                .filter((session) => session.client_id === client.id)
                                .map((session) => {
                                    const day = toDateStringFromTimestamp(session.ended_at || session.started_at)
                                    if (!day) return null
                                    if (compareDateStrings(day, monthStart) < 0 || compareDateStrings(day, effectiveEnd) > 0) return null
                                    return `${day}:${session.assigned_workout_id || 'session'}`
                                })
                                .filter((item): item is string => !!item),
                            ...workoutLogs
                                .filter((log) => log.client_id === client.id)
                                .map((log) => {
                                    if (compareDateStrings(log.date, monthStart) < 0 || compareDateStrings(log.date, effectiveEnd) > 0) return null
                                    return `${log.date}:${log.workout_id || 'log'}`
                                })
                                .filter((item): item is string => !!item)
                        ]
                    )
                )

                const monthCompliance = calculateComplianceForRange(client, monthStart, effectiveEnd, {
                    workoutsByClient,
                    mealPlansByClient,
                    completedWorkoutDays: monthCompletions,
                    mealLogsByClient: new Map([[client.id, monthMealLogs]]),
                    checkinsByClient
                })

                if (monthCompliance.due > 0 && monthCompliance.percentage >= 85) {
                    streak += 1
                } else {
                    break
                }
            }

            if (streak < 2) return []

            return [{
                id: `milestone-streak-${client.id}`,
                kind: 'consistency_streak' as const,
                clientId: client.id,
                clientName: client.full_name,
                avatarUrl: client.avatar_url,
                text: `Hace ${streak} ${streak === 1 ? 'mes' : 'meses'} cumple >=85%`,
                iconTone: 'blue' as const,
                score: 100 + streak * 15,
                alertKey: `milestone:consistency_streak:${client.id}:${streak}`
            }]
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)

    const weeklyMilestones: CoachWeeklyMilestone[] = uniqueBy(
        [...prMilestones, ...weightMilestones, ...streakMilestones],
        (item) => item.alertKey
    )
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)

    const activeClientsCount = clients.length
    const newClientsThisWeek = clients.filter((client) => {
        const created = toDateStringFromTimestamp(client.created_at)
        if (!created) return false
        return compareDateStrings(created, weekStart) >= 0 && compareDateStrings(created, today) <= 0
    }).length
    const paymentsPending = clients.filter((client) => client.payment_status === 'pending' || client.payment_status === 'overdue').length
    const checkinsPending = clients.filter((client) => !!client.next_checkin_date && compareDateStrings(client.next_checkin_date, today) <= 0).length
    const presentialCount = presentialTrainingsResult.data?.length || 0

    const metrics: CoachMetricCard[] = [
        {
            key: 'active_clients',
            title: 'Clientes activo',
            value: activeClientsCount,
            subtitle: '',
            trendText: `+${newClientsThisWeek} esta semana`,
            trendTone: 'success'
        },
        {
            key: 'pending_payments',
            title: 'Pagos pendientes',
            value: paymentsPending,
            subtitle: '',
            trendText: paymentsPending > 0 ? 'Vence hoy' : 'Al día',
            trendTone: paymentsPending > 0 ? 'warning' : 'muted'
        },
        {
            key: 'pending_checkins',
            title: 'Check-ins pendientes',
            value: checkinsPending,
            subtitle: '',
            trendText: checkinsPending > 0 ? 'Necesitan revisión' : 'Sin pendientes',
            trendTone: checkinsPending > 0 ? 'warning' : 'muted'
        },
        {
            key: 'presential_trainings',
            title: 'Entrenamientos hoy',
            value: presentialCount,
            subtitle: '',
            trendText: 'Presenciales',
            trendTone: 'muted'
        }
    ]

    return {
        greeting: getGreeting(),
        coachName: coachFirstName,
        metrics,
        urgentActions,
        compliance,
        retentionAlerts,
        weeklyMilestones
    }
}

export async function syncCoachHomeNotifications(input: {
    urgentActions: CoachUrgentAction[]
    retentionAlerts: CoachRetentionAlert[]
    weeklyMilestones: CoachWeeklyMilestone[]
}) {
    const supabase = await createClient()
    const {
        data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
        return { inserted: 0, skipped: 0 }
    }

    const preferencesResult = await supabase
        .from('notification_preferences')
        .select('coach_urgent_alert, coach_retention_alert, coach_weekly_milestone')
        .eq('user_id', user.id)
        .maybeSingle()

    const preferences = (preferencesResult.data || {}) as CoachAlertPreferences

    const candidates: NotificationCandidate[] = [
        ...input.urgentActions.map((item) => ({
            type: 'coach_urgent_alert' as const,
            title: 'Acción urgente pendiente',
            body: `${item.clientName}: ${item.details}`,
            data: {
                clientId: item.clientId,
                url: item.actionHref,
                delivery: 'in_app_only',
                alert_key: item.alertKey
            },
            alertKey: item.alertKey
        })),
        ...input.retentionAlerts.map((item) => ({
            type: 'coach_retention_alert' as const,
            title: 'Alerta de retención',
            body: `${item.clientName}: ${item.message}`,
            data: {
                clientId: item.clientId,
                url: item.actionHref,
                delivery: 'in_app_only',
                alert_key: item.alertKey
            },
            alertKey: item.alertKey
        })),
        ...input.weeklyMilestones.map((item) => ({
            type: 'coach_weekly_milestone' as const,
            title: 'Hito de la semana',
            body: `${item.clientName}: ${item.text}`,
            data: {
                clientId: item.clientId,
                url: `/clients/${item.clientId}`,
                delivery: 'in_app_only',
                alert_key: item.alertKey
            },
            alertKey: item.alertKey
        }))
    ]

    const allowedByType = new Map<string, boolean>([
        ['coach_urgent_alert', preferences.coach_urgent_alert !== false],
        ['coach_retention_alert', preferences.coach_retention_alert !== false],
        ['coach_weekly_milestone', preferences.coach_weekly_milestone !== false]
    ])

    const filteredCandidates = uniqueBy(
        candidates.filter((candidate) => allowedByType.get(candidate.type) !== false),
        (candidate) => candidate.alertKey
    )

    if (filteredCandidates.length === 0) {
        return { inserted: 0, skipped: 0 }
    }

    const cutoffDate = new Date(Date.now() - (48 * 60 * 60 * 1000)).toISOString()
    const existingResult = await supabase
        .from('notifications')
        .select('data, type, created_at')
        .eq('user_id', user.id)
        .in('type', ['coach_urgent_alert', 'coach_retention_alert', 'coach_weekly_milestone'])
        .gte('created_at', cutoffDate)

    const existingKeys = new Set<string>()
    for (const row of existingResult.data || []) {
        const data = (row as { data?: Record<string, unknown> }).data
        const key = typeof data?.alert_key === 'string' ? data.alert_key : null
        if (key) existingKeys.add(key)
    }

    const toInsert = filteredCandidates.filter((candidate) => !existingKeys.has(candidate.alertKey))
    if (toInsert.length === 0) {
        return { inserted: 0, skipped: filteredCandidates.length }
    }

    const { error } = await supabase
        .from('notifications')
        .insert(
            toInsert.map((item) => ({
                user_id: user.id,
                type: item.type,
                title: item.title,
                body: item.body,
                data: item.data,
                read: false
            }))
        )

    if (error) {
        console.error('syncCoachHomeNotifications error:', error)
        return { inserted: 0, skipped: filteredCandidates.length }
    }

    return { inserted: toInsert.length, skipped: filteredCandidates.length - toInsert.length }
}
