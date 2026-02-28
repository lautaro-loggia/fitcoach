'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Bell, Loader2 } from 'lucide-react'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { toast } from 'sonner'

type NotificationsPreferences = {
    checkin_completed: boolean
    workout_completed: boolean
    payment_registered: boolean
    new_client: boolean
    coach_urgent_alert: boolean
    coach_retention_alert: boolean
    coach_weekly_milestone: boolean
    checkin_reminder: boolean
    workout_assigned: boolean
    coach_feedback: boolean
    meal_photo_reminder: boolean
    reminder_time_desayuno: string
    reminder_time_almuerzo: string
    reminder_time_merienda: string
    reminder_time_cena: string
}

interface NotificationsFormProps {
    userId: string
    initialPreferences: Partial<NotificationsPreferences>
    role?: 'coach' | 'client'
}

export function NotificationsForm({ userId, initialPreferences, role = 'coach' }: NotificationsFormProps) {
    const supabase = createClient()
    const { isSupported, permission, subscription, subscribe, unsubscribe, isLoading } = usePushNotifications()
    const [preferences, setPreferences] = useState<NotificationsPreferences>({
        checkin_completed: true,
        workout_completed: true,
        payment_registered: true,
        new_client: true,
        coach_urgent_alert: true,
        coach_retention_alert: true,
        coach_weekly_milestone: true,
        checkin_reminder: true,
        workout_assigned: true,
        coach_feedback: true,
        meal_photo_reminder: true,
        reminder_time_desayuno: '09:00:00',
        reminder_time_almuerzo: '12:00:00',
        reminder_time_merienda: '17:00:00',
        reminder_time_cena: '21:00:00',
        ...initialPreferences // Override defaults with DB row
    })

    const formatTimeInput = (timeStr?: string) => {
        if (!timeStr) return '00:00'
        return timeStr.substring(0, 5) // "09:00:00" -> "09:00"
    }

    const isPushEnabled = permission === 'granted' && !!subscription

    const handlePushToggle = async () => {
        if (isPushEnabled) {
            await unsubscribe()
            toast.success('Notificaciones desactivadas en este dispositivo')
        } else {
            try {
                await subscribe()
                toast.success('Notificaciones activadas correctamente')

                // Also update profile flag
                await supabase
                    .from('profiles')
                    .update({ notifications_enabled: true })
                    .eq('id', userId)

            } catch {
                toast.error('No se pudieron activar las notificaciones. Verifica los permisos del navegador.')
            }
        }
    }

    const handlePreferenceChange = async <K extends keyof NotificationsPreferences>(
        key: K,
        value: NotificationsPreferences[K]
    ) => {
        const previousValue = preferences[key]

        // Optimistic update
        setPreferences((prev) => ({ ...prev, [key]: value }))

        const { error } = await supabase
            .from('notification_preferences')
            .upsert({
                user_id: userId,
                ...preferences,
                [key]: value,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })

        if (error) {
            console.error('Error updating preferences:', error)
            toast.error('Error al guardar preferencia')
            // Revert
            setPreferences((prev) => ({ ...prev, [key]: previousValue }))
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Notificaciones
                </CardTitle>
                <CardDescription>
                    Gestiona tus alertas del sistema y las notificaciones push.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Master Switch */}
                {isSupported ? (
                    <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/30">
                        <div className="space-y-1">
                            <Label className="text-base font-medium">Activar notificaciones push</Label>
                            <p className="text-sm text-muted-foreground">
                                {isPushEnabled
                                    ? 'Recibiendo notificaciones push en este dispositivo.'
                                    : 'Activa push para recibir avisos fuera de la app.'}
                            </p>
                        </div>
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        ) : (
                            <Switch
                                checked={isPushEnabled}
                                onCheckedChange={handlePushToggle}
                            />
                        )}
                    </div>
                ) : (
                    <div className="p-4 border rounded-xl bg-muted/30">
                        <p className="text-sm text-muted-foreground">
                            Este navegador no soporta notificaciones push. Las alertas in-app siguen disponibles.
                        </p>
                    </div>
                )}

                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <span>Tipos de notificación</span>
                        <div className="flex-1 h-[1px] bg-border" />
                    </div>

                    <div className="grid gap-4">
                        {role === 'coach' ? (
                            <>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="checkin_completed" className="flex-1 cursor-pointer">
                                            <span className="block font-medium">Check-ins completados</span>
                                            <span className="text-xs text-muted-foreground">Cuando un cliente envía su reporte semanal</span>
                                        </Label>
                                        <Switch
                                            id="checkin_completed"
                                            checked={preferences.checkin_completed ?? true}
                                            onCheckedChange={(c) => handlePreferenceChange('checkin_completed', c)}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="workout_completed" className="flex-1 cursor-pointer">
                                            <span className="block font-medium">Entrenamientos completados</span>
                                            <span className="text-xs text-muted-foreground">Cuando un cliente finaliza su rutina</span>
                                        </Label>
                                        <Switch
                                            id="workout_completed"
                                            checked={preferences.workout_completed ?? true}
                                            onCheckedChange={(c) => handlePreferenceChange('workout_completed', c)}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="payment_registered" className="flex-1 cursor-pointer">
                                            <span className="block font-medium">Pagos</span>
                                            <span className="text-xs text-muted-foreground">Avisos de pagos recibidos o vencidos</span>
                                        </Label>
                                        <Switch
                                            id="payment_registered"
                                            checked={preferences.payment_registered ?? true}
                                            onCheckedChange={(c) => handlePreferenceChange('payment_registered', c)}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="new_client" className="flex-1 cursor-pointer">
                                            <span className="block font-medium">Nuevos clientes</span>
                                            <span className="text-xs text-muted-foreground">Cuando alguien acepta tu invitación</span>
                                        </Label>
                                        <Switch
                                            id="new_client"
                                            checked={preferences.new_client ?? true}
                                            onCheckedChange={(c) => handlePreferenceChange('new_client', c)}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="coach_urgent_alert" className="flex-1 cursor-pointer">
                                            <span className="block font-medium">Acciones urgentes del home</span>
                                            <span className="text-xs text-muted-foreground">Pagos, check-ins y comidas pendientes</span>
                                        </Label>
                                        <Switch
                                            id="coach_urgent_alert"
                                            checked={preferences.coach_urgent_alert ?? true}
                                            onCheckedChange={(c) => handlePreferenceChange('coach_urgent_alert', c)}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="coach_retention_alert" className="flex-1 cursor-pointer">
                                            <span className="block font-medium">Alertas de retención</span>
                                            <span className="text-xs text-muted-foreground">Inactividad o riesgo de abandono</span>
                                        </Label>
                                        <Switch
                                            id="coach_retention_alert"
                                            checked={preferences.coach_retention_alert ?? true}
                                            onCheckedChange={(c) => handlePreferenceChange('coach_retention_alert', c)}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="coach_weekly_milestone" className="flex-1 cursor-pointer">
                                            <span className="block font-medium">Hitos semanales</span>
                                            <span className="text-xs text-muted-foreground">PRs, metas de peso y consistencia</span>
                                        </Label>
                                        <Switch
                                            id="coach_weekly_milestone"
                                            checked={preferences.coach_weekly_milestone ?? true}
                                            onCheckedChange={(c) => handlePreferenceChange('coach_weekly_milestone', c)}
                                        />
                                    </div>
                            </>
                        ) : (
                            <>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="checkin_reminder" className="flex-1 cursor-pointer">
                                            <span className="block font-medium">Recordatorios de Check-in</span>
                                            <span className="text-xs text-muted-foreground">Avisos para enviar tu reporte semanal</span>
                                        </Label>
                                        <Switch
                                            id="checkin_reminder"
                                            checked={preferences.checkin_reminder ?? true}
                                            onCheckedChange={(c) => handlePreferenceChange('checkin_reminder', c)}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="workout_assigned" className="flex-1 cursor-pointer">
                                            <span className="block font-medium">Nuevas Rutinas</span>
                                            <span className="text-xs text-muted-foreground">Cuando tu coach asigne o actualice tu rutina</span>
                                        </Label>
                                        <Switch
                                            id="workout_assigned"
                                            checked={preferences.workout_assigned ?? true}
                                            onCheckedChange={(c) => handlePreferenceChange('workout_assigned', c)}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="coach_feedback" className="flex-1 cursor-pointer">
                                            <span className="block font-medium">Feedback del Coach</span>
                                            <span className="text-xs text-muted-foreground">Respuestas a tus check-ins o comentarios</span>
                                        </Label>
                                        <Switch
                                            id="coach_feedback"
                                            checked={preferences.coach_feedback ?? true}
                                            onCheckedChange={(c) => handlePreferenceChange('coach_feedback', c)}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="meal_photo_reminder" className="flex-1 cursor-pointer">
                                                <span className="block font-medium">Registro de Comidas</span>
                                                <span className="text-xs text-muted-foreground">Recordatorios en los horarios de tus comidas</span>
                                            </Label>
                                            <Switch
                                                id="meal_photo_reminder"
                                                checked={preferences.meal_photo_reminder ?? true}
                                                onCheckedChange={(c) => handlePreferenceChange('meal_photo_reminder', c)}
                                            />
                                        </div>

                                        {(preferences.meal_photo_reminder ?? true) && (
                                            <div className="pl-4 border-l-2 ml-1 space-y-3 mt-2 animate-in fade-in slide-in-from-top-2">
                                                <h4 className="font-medium text-xs text-muted-foreground uppercase">Horarios de Notificación</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <Label htmlFor="reminder_time_desayuno" className="text-[11px] uppercase text-muted-foreground">Desayuno</Label>
                                                        <input
                                                            type="time"
                                                            id="reminder_time_desayuno"
                                                            className="w-full bg-transparent border rounded-[8px] px-2 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none transition-all"
                                                            value={formatTimeInput(preferences.reminder_time_desayuno || '09:00:00')}
                                                            onChange={(e) => handlePreferenceChange('reminder_time_desayuno', e.target.value + ':00')}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label htmlFor="reminder_time_almuerzo" className="text-[11px] uppercase text-muted-foreground">Almuerzo</Label>
                                                        <input
                                                            type="time"
                                                            id="reminder_time_almuerzo"
                                                            className="w-full bg-transparent border rounded-[8px] px-2 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none transition-all"
                                                            value={formatTimeInput(preferences.reminder_time_almuerzo || '12:00:00')}
                                                            onChange={(e) => handlePreferenceChange('reminder_time_almuerzo', e.target.value + ':00')}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label htmlFor="reminder_time_merienda" className="text-[11px] uppercase text-muted-foreground">Merienda</Label>
                                                        <input
                                                            type="time"
                                                            id="reminder_time_merienda"
                                                            className="w-full bg-transparent border rounded-[8px] px-2 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none transition-all"
                                                            value={formatTimeInput(preferences.reminder_time_merienda || '17:00:00')}
                                                            onChange={(e) => handlePreferenceChange('reminder_time_merienda', e.target.value + ':00')}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label htmlFor="reminder_time_cena" className="text-[11px] uppercase text-muted-foreground">Cena</Label>
                                                        <input
                                                            type="time"
                                                            id="reminder_time_cena"
                                                            className="w-full bg-transparent border rounded-[8px] px-2 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none transition-all"
                                                            value={formatTimeInput(preferences.reminder_time_cena || '21:00:00')}
                                                            onChange={(e) => handlePreferenceChange('reminder_time_cena', e.target.value + ':00')}
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground leading-tight pt-1">
                                                    Las notificaciones solo te llegarán para las comidas que tengas asignadas en tu plan activo para hoy.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
