'use client'

import { useEffect, useState } from 'react'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { Button } from '@/components/ui/button'
import { Bell, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

const PROMPT_DISMISS_KEY = 'orbit:push_prompt_dismissed_at'
const PROMPT_SNOOZE_MS = 24 * 60 * 60 * 1000

export function PushNotificationPrompt() {
    const { isSupported, permission, subscription, subscribe, isLoading } = usePushNotifications()
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const dismissedAt = Number(window.localStorage.getItem(PROMPT_DISMISS_KEY) || '0')
        const isSnoozed = Number.isFinite(dismissedAt) && Date.now() - dismissedAt < PROMPT_SNOOZE_MS

        // Show prompt if: supported, no active subscription, permission is default, not loading, and not snoozed
        if (!isLoading && isSupported && !subscription && permission === 'default' && !isSnoozed) {
            const timer = setTimeout(() => setIsVisible(true), 3000) // Delay 3s
            return () => clearTimeout(timer)
        }

        setIsVisible(false)
    }, [isLoading, isSupported, permission, subscription])

    const dismissPrompt = () => {
        window.localStorage.setItem(PROMPT_DISMISS_KEY, String(Date.now()))
        setIsVisible(false)
    }

    const handleEnable = async () => {
        try {
            const sub = await subscribe()
            if (!sub) {
                throw new Error('No se pudo crear la suscripción push.')
            }

            window.localStorage.removeItem(PROMPT_DISMISS_KEY)
            toast.success('Notificaciones activadas correctamente')
            setIsVisible(false)
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'No se pudieron activar las notificaciones'

            toast.error(message)
        }
    }

    if (!isVisible) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed z-50 left-4 right-4 top-4 md:left-auto md:right-4 md:top-auto md:bottom-4 md:w-auto md:max-w-sm"
            >
                <div className="bg-background border border-border rounded-xl p-4 shadow-xl flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-full text-primary shrink-0">
                                <Bell className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-semibold text-sm">Activar notificaciones</h4>
                                <p className="text-xs text-muted-foreground">
                                    Recibe alertas sobre check-ins, rutinas y mensajes importantes al instante.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={dismissPrompt}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={dismissPrompt}
                            className="text-xs h-8"
                        >
                            Ahora no
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleEnable}
                            className="text-xs h-8"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Activando...' : 'Activar'}
                        </Button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
