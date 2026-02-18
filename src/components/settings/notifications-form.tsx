'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Bell, BellOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { toast } from 'sonner'

interface NotificationsFormProps {
    userId: string
    initialEnabled: boolean
    initialPreferences: any
}

export function NotificationsForm({ userId, initialEnabled, initialPreferences }: NotificationsFormProps) {
    const supabase = createClient()
    const { isSupported, permission, subscribe, unsubscribe, isLoading } = usePushNotifications()
    const [preferences, setPreferences] = useState(initialPreferences || {
        checkin_completed: true,
        workout_completed: true,
        payment_registered: true,
        new_client: true
    })

    const isPushEnabled = permission === 'granted'

    const handlePushToggle = async () => {
        if (isPushEnabled) {
            // We don't really 'unsubscribe' from browser usually in UI as it clears everything, 
            // but for this MVP let's allow it if user wants to kill all notifs.
            // Or better: just updating the profile 'notifications_enabled' flag is softer.
            // But let's use the hook logic.
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

            } catch (error) {
                toast.error('No se pudieron activar las notificaciones. Verifica los permisos del navegador.')
            }
        }
    }

    const handlePreferenceChange = async (key: string, checked: boolean) => {
        // Optimistic update
        setPreferences((prev: any) => ({ ...prev, [key]: checked }))

        const { error } = await supabase
            .from('notification_preferences')
            .upsert({
                user_id: userId,
                ...preferences,
                [key]: checked,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })

        if (error) {
            console.error('Error updating preferences:', error)
            toast.error('Error al guardar preferencia')
            // Revert
            setPreferences((prev: any) => ({ ...prev, [key]: !checked }))
        }
    }

    if (!isSupported && !isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Notificaciones</CardTitle>
                    <CardDescription>Tu navegador no soporta notificaciones push.</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Notificaciones Push
                </CardTitle>
                <CardDescription>
                    Gestiona las alertas que recibes en tu dispositivo.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Master Switch */}
                <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/30">
                    <div className="space-y-1">
                        <Label className="text-base font-medium">Activar notificaciones</Label>
                        <p className="text-sm text-muted-foreground">
                            {isPushEnabled
                                ? 'Recibiendo notificaciones en este dispositivo.'
                                : 'Actívalas para no perderte nada importante.'}
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

                {isPushEnabled && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <span>Tipos de notificación</span>
                            <div className="flex-1 h-[1px] bg-border" />
                        </div>

                        <div className="grid gap-4">
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
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
