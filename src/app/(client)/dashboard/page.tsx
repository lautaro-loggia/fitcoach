import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    ChevronRight,
    Clock,
    Dumbbell,
    Play,
    User,
    Trophy,
    Coffee,
    ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UpdatePasswordDialog } from '@/components/clients/update-password-dialog'
import { ClientLogoutButton } from '@/components/clients/client-logout-button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { WeeklyProgress } from '@/components/clients/weekly-progress'
import { NextMilestone } from '@/components/clients/next-milestone'
import { getARTDate, getTodayString } from '@/lib/utils'

export default async function ClientDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/auth/login')

    const adminClient = createAdminClient()

    const { data: client, error } = await adminClient
        .from('clients')
        .select('*, trainer:profiles(full_name)')
        .eq('user_id', user.id)
        .single()

    if (error || !client) {
        return <div className="p-8 text-center text-gray-500">No se pudo cargar el dashboard.</div>
    }

    // 1. Get Today's Workout (ART Time)
    const artNow = getARTDate()
    const todayName = format(artNow, 'EEEE', { locale: es }).toLowerCase()
    const todayStr = getTodayString()

    // Fetch all workouts to find today's
    const { data: workouts } = await adminClient
        .from('assigned_workouts')
        .select('*')
        .eq('client_id', client.id)

    const todayWorkout = workouts?.find(w =>
        w.scheduled_days?.map((d: string) => d.toLowerCase()).includes(todayName)
    )

    // 2. Check if workout is completed today
    let isCompleted = false
    if (todayWorkout) {
        const { count } = await adminClient
            .from('workout_logs')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id)
            .eq('workout_id', todayWorkout.id)
            .eq('date', todayStr)

        isCompleted = (count || 0) > 0
    }


    // 3. Weekly Adherence Logic
    const oneWeekAgo = getARTDate()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    // Count workout logs in last 7 days
    const { count: weeklyLogsCount } = await adminClient
        .from('workout_logs')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .gte('date', oneWeekAgo.toISOString().split('T')[0])

    // Calculate Target (sum of days assigned across all active workouts)
    // This is an estimation. If they have 2 workouts assigned, one 3 days, one 2 days -> 5 days target.
    let weeklyTarget = 0
    workouts?.forEach(w => {
        if (w.scheduled_days) {
            weeklyTarget += w.scheduled_days.length
        }
    })
    if (weeklyTarget === 0) weeklyTarget = 3 // Fallback default

    const adherenceRate = Math.min(((weeklyLogsCount || 0) / weeklyTarget) * 100, 100)

    // 4. Check for First Check-in
    // 3. Check for First Check-in
    const { data: recentCheckins } = await adminClient
        .from('checkins')
        .select('created_at, observations, weight')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(2)

    const lastCheckin = recentCheckins?.[0]
    const lastCheckinDate = lastCheckin ? new Date(lastCheckin.created_at) : null
    // Check if check-in was done TODAY (compare using ART date)
    const isCheckinDoneToday = lastCheckinDate &&
        getARTDate(lastCheckinDate).toDateString() === getARTDate().toDateString()

    let isFirstCheckin = false
    if (!recentCheckins || recentCheckins.length === 0) {
        isFirstCheckin = true
    } else if (recentCheckins.length === 1) {
        if (recentCheckins[0].observations === 'Check-in Inicial (Baseline)') {
            isFirstCheckin = true
        }
    }

    // 5. Status Helpers
    const statusLabel: Record<string, string> = {
        active: "Plan Activo",
        paused: "Plan Pausado",
        inactive: "Inactivo",
        archived: "Archivado"
    }

    const goalLabels: Record<string, string> = {
        'fat_loss': 'Pérdida de grasa',
        'muscle_gain': 'Ganancia muscular',
        'recomp': 'Recomposición corporal',
        'performance': 'Rendimiento',
        'health': 'Salud general'
    }

    // 6. Next Review Date Logic
    const parseLocalDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return null
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return new Date(`${dateStr}T00:00:00`)
        }
        return new Date(dateStr)
    }

    const nextReview = parseLocalDate(client.next_checkin_date)
    const isCheckinDue = !isCheckinDoneToday && nextReview && (getARTDate() >= nextReview)
    const isCheckinPrioritary = isFirstCheckin || isCheckinDue

    return (
        <div className="p-4 space-y-6 pb-6 max-w-md mx-auto">
            {/* 1. Header Compacto */}
            <div className="flex justify-between items-center py-1">
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-gray-100 shadow-sm">
                        <AvatarImage src={client.avatar_url || ""} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-medium text-xs">
                            {client.full_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-bold text-gray-900 leading-tight">
                            Hola, {client.full_name.split(' ')[0]}
                        </h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${client.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span className="text-[11px] text-gray-500 font-medium">
                                {statusLabel[client.status] || client.status}
                            </span>
                        </div>
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100">
                            <div className="flex flex-col gap-[3px] items-end">
                                <div className="h-[2px] w-4 bg-gray-800 rounded-full"></div>
                                <div className="h-[2px] w-3 bg-gray-800 rounded-full"></div>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Link href="/dashboard/profile">
                            <DropdownMenuItem className="cursor-pointer">
                                <User className="mr-2 h-4 w-4" /> Perfil
                            </DropdownMenuItem>
                        </Link>
                        <UpdatePasswordDialog asMenuItem />
                        <DropdownMenuSeparator />
                        <ClientLogoutButton />
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* 2. Primary Action: Check-in (Solo entry point si corresponde) */}
            {isCheckinPrioritary && (
                <Card className="border-none shadow-lg shadow-indigo-500/20 bg-indigo-600 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none"></div>

                    <div className="p-5 relative z-10">
                        <div className="flex flex-col gap-3">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="bg-white/20 p-1.5 rounded-md backdrop-blur-sm">
                                        <AlertCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-100">
                                        {isFirstCheckin ? "Primer Paso" : "Revisión Semanal"}
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold mb-1">
                                    {isFirstCheckin ? "Comenzá tu plan" : "Check-in Disponible"}
                                </h2>
                                <p className="text-indigo-100 text-sm leading-relaxed max-w-[90%]">
                                    {isFirstCheckin
                                        ? "Registrá tus datos iniciales para que construyamos tu rutina."
                                        : "Actualizá tu progreso para que tu coach ajuste tu plan."
                                    }
                                </p>
                            </div>

                            <Link href="/dashboard/checkin" className="w-full">
                                <Button className="w-full bg-white text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 font-bold h-11 shadow-sm transition-all active:scale-[0.98]">
                                    {isFirstCheckin ? "Iniciar Check-in" : "Realizar Check-in"}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </Card>
            )}

            {/* NEW: Weekly Progress Block */}
            {!isFirstCheckin && (
                <WeeklyProgress
                    currentWeight={lastCheckin?.weight || client.current_weight || 0}
                    previousWeight={recentCheckins?.[1]?.weight || null}
                    completedWorkouts={weeklyLogsCount || 0}
                    totalScheduledWorkouts={weeklyTarget}
                    workoutAdherence={adherenceRate}
                />
            )}

            {/* NEW: Next Milestone Block */}
            {nextReview && !isCheckinDoneToday && (
                <NextMilestone
                    nextCheckinDate={client.next_checkin_date}
                    weeklyGoalText={
                        client.target_weight
                            ? `Meta: Llegar a ${client.target_weight} kg`
                            : client.goal_text || (goalLabels[client.main_goal || ''] || "Mantener hábitos")
                    }
                />
            )}

            {/* 3. Routine / Day Status */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-bold text-gray-900">Tu día hoy</h3>
                    <span className="text-xs font-semibold text-gray-400 capitalize">
                        {format(getARTDate(), 'EEEE d', { locale: es })}
                    </span>
                </div>

                {client.status === 'paused' ? (
                    <Card className="p-4 bg-amber-50 border-amber-100/50 shadow-sm flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                            <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-amber-900">Plan Pausado</h4>
                            <p className="text-xs text-amber-700 mt-0.5">Contactá a tu coach para reactivar.</p>
                        </div>
                    </Card>
                ) : todayWorkout ? (
                    // WORKOUT DAY CARD
                    <Card className={`border-none shadow-md overflow-hidden transition-all ${isCompleted ? 'bg-green-50 ring-1 ring-green-100' : 'bg-white ring-1 ring-gray-100'}`}>
                        <div className="p-0">
                            <div className="p-5 pb-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 px-2 py-0.5 rounded-sm inline-block ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                                            Entrenamiento
                                        </div>
                                        <h3 className={`text-xl font-bold leading-tight ${isCompleted ? 'text-green-900' : 'text-gray-900'}`}>
                                            {todayWorkout.name}
                                        </h3>
                                    </div>
                                    {isCompleted && (
                                        <div className="bg-green-100 p-2 rounded-full">
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        </div>
                                    )}
                                </div>

                                {!isCompleted && (
                                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-0">
                                        <span className="flex items-center gap-1.5">
                                            <Dumbbell className="h-4 w-4" />
                                            <span>{todayWorkout.structure?.length || 0} ejercicios</span>
                                        </span>
                                        <span className="text-gray-300">•</span>
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="h-4 w-4" />
                                            <span>60 min aprox.</span>
                                        </span>
                                    </div>
                                )}
                            </div>

                            {!isCompleted && (
                                <Link href="/dashboard/workout">
                                    <div className="border-t border-gray-100 bg-gray-50/50 p-3 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-blue-600 font-bold text-sm">
                                        <Play className="h-4 w-4" fill="currentColor" />
                                        Comenzar Rutina
                                    </div>
                                </Link>
                            )}

                            {isCompleted && (
                                <div className="px-5 pb-5 pt-0 text-sm text-green-700 font-medium">
                                    ¡Rutina completada! Buen trabajo.
                                </div>
                            )}
                        </div>
                    </Card>
                ) : (
                    // REST DAY CARD (Clean & Low visual weight)
                    <Card className="p-5 bg-white border border-dashed border-gray-200 shadow-sm flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                            <Coffee className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-gray-700">Día de Descanso</h4>
                            <p className="text-xs text-gray-500 mt-0.5">Hoy toca recuperar energías.</p>
                        </div>
                        <Link href="/dashboard/workout">
                            <Button variant="ghost" size="sm" className="text-xs font-medium text-gray-500 hover:text-indigo-600 h-auto py-1 px-2">
                                Ver semana
                            </Button>
                        </Link>
                    </Card>
                )}
            </div>

            {/* 4. Secondary Info Grid */}
            <div className="grid gap-3 grid-cols-1">

                {/* Goal Card */}
                <Card className="p-4 bg-white border border-gray-100 shadow-sm flex flex-row items-center h-auto justify-between">
                    <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 mr-3">
                        <Trophy className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs text-gray-500 font-medium mb-1">Objetivo Actual</p>
                        <p className="text-sm font-bold text-gray-900 leading-tight">
                            {client.main_goal ? (goalLabels[client.main_goal] || client.main_goal) : "Sin definir"}
                        </p>
                    </div>
                </Card>
            </div>

        </div>
    )
}
