'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'

interface NotificationsFormProps {
    userId: string
}

export function NotificationsForm({ userId }: NotificationsFormProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [notificationsEnabled, setNotificationsEnabled] = useState(true)

    useEffect(() => {
        loadNotificationSettings()
    }, [])

    const loadNotificationSettings = async () => {
        try {
            setLoading(true)

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('notifications_enabled')
                .eq('id', userId)
                .single()

            if (error) throw error

            if (profile) {
                setNotificationsEnabled(profile.notifications_enabled ?? true)
            }
        } catch (error) {
            console.error('Error loading notification settings:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleToggle = async (checked: boolean) => {
        try {
            setNotificationsEnabled(checked)

            const { error } = await supabase
                .from('profiles')
                .update({ notifications_enabled: checked })
                .eq('id', userId)

            if (error) throw error

        } catch (error) {
            console.error('Error updating notification settings:', error)
            // Revert on error
            setNotificationsEnabled(!checked)
            alert('Error al actualizar la configuración')
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Preferencias de Notificaciones</CardTitle>
                <CardDescription>
                    Controla qué notificaciones deseas recibir.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                    <Checkbox
                        id="notifications"
                        checked={notificationsEnabled}
                        onCheckedChange={handleToggle}
                    />
                    <div className="space-y-1">
                        <Label
                            htmlFor="notifications"
                            className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Activar notificaciones
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Recibir notificaciones sobre actividad de tus asesorados.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
